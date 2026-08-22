// A. Context Menu Setup
chrome.runtime.onInstalled.addListener(async () => {
  try {
    chrome.contextMenus.create({
      id: 'save-snippet',
      title: 'Save to Academic Notes',
      contexts: ['selection']
    });
    await updateBadge();
  } catch (error) {
    console.error('Error in onInstalled:', error);
  }
});

// E. Badge Management
async function updateBadge() {
  try {
    const data = await chrome.storage.local.get('academic_notes');
    const notes = data.academic_notes || [];
    const count = notes.length;
    
    await chrome.action.setBadgeBackgroundColor({ color: '#2563EB' });
    await chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// B. Context Menu Click Handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-snippet') {
    // 1. Immediately trigger side panel open to consume user gesture token
    if (tab && typeof chrome.sidePanel !== 'undefined' && typeof chrome.sidePanel.open === 'function') {
      try {
        if (tab.windowId) {
          chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {
            if (tab.id) chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
          });
        } else if (tab.id) {
          chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
        }
      } catch (e) {
        console.warn('Immediate sidepanel open failed:', e);
      }
    }

    try {
      const selectionText = info.selectionText;
      if (!selectionText || !tab) return;
      
      let metadata = {};
      try {
        if (tab.id) {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractMetadata
          });
          metadata = results[0]?.result || {};
        }
      } catch (scriptErr) {
        console.warn('Metadata script execution bypassed (common on native PDF tabs):', scriptErr);
      }

      // Clean PDF URLs using tabUrl and context menu info
      let tabUrl = tab.url || tab.pendingUrl || '';
      if (!tabUrl && tab.id) {
        try {
          const fullTab = await chrome.tabs.get(tab.id);
          tabUrl = fullTab.url || fullTab.pendingUrl || '';
        } catch(e) {}
      }

      // info.pageUrl is often the REAL url of the PDF in the browser address bar!
      let contextUrl = info.pageUrl || info.frameUrl || '';
      if (contextUrl && (contextUrl.startsWith('chrome-extension://') || contextUrl.startsWith('extension://'))) {
          // If contextUrl is the extension, maybe frameUrl is better, or vice versa
          if (info.frameUrl && !info.frameUrl.startsWith('chrome-extension://') && !info.frameUrl.startsWith('extension://')) {
             contextUrl = info.frameUrl;
          }
      }

      // Try all available sources to find the real URL
      const rawUrl = metadata.url || contextUrl || tabUrl || '';
      
      // We pass BOTH tabUrl and contextUrl to cleanPdfUrl to increase chances of finding the real URL
      let cleanUrl = cleanPdfUrl(rawUrl, tabUrl);
      if (!cleanUrl || isInternalExtensionUrl(cleanUrl)) {
         const cleanContext = cleanPdfUrl(contextUrl, contextUrl);
         if (cleanContext && !isInternalExtensionUrl(cleanContext)) {
             cleanUrl = cleanContext;
         }
      }

      // Robust fallback for PDF documents and protected pages
      let fallbackTitle = tab.title || 'Academic PDF Document';
      if (fallbackTitle.toLowerCase().endsWith('.pdf')) {
        fallbackTitle = fallbackTitle.replace(/\.pdf$/i, '');
      }
      let fallbackDomain = '';
      try {
        if (cleanUrl) fallbackDomain = new URL(cleanUrl).hostname;
        else if (tabUrl) fallbackDomain = new URL(tabUrl).hostname;
      } catch (e) {}
      
      const note = {
        id: crypto.randomUUID(),
        content: selectionText,
        title: metadata.title || fallbackTitle,
        url: cleanUrl,
        pageUrl: cleanUrl,
        authors: metadata.authors || '',
        doi: metadata.doi || '',
        domain: metadata.domain || fallbackDomain || 'PDF Document',
        createdAt: new Date().toISOString(),
        tags: [],
        folder: 'Inbox'
      };
      
      await saveNote(note, tabUrl);
      
      try {
        if (tab.id) {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_TOAST',
            message: 'Saved to Academic Notes'
          });
        }
      } catch (e) {
        // Content script might not be injected on native PDF tabs, ignore
      }
    } catch (error) {
      console.error('Error handling context menu click:', error);
    }
  }
});

function isInternalExtensionUrl(url) {
  if (!url) return true;
  const str = String(url).trim().toLowerCase();
  return str.startsWith('chrome-extension://') ||
         str.startsWith('edge-extension://') ||
         str.startsWith('extension://') ||
         str.startsWith('moz-extension://') ||
         str.includes('mhjfbmdgcfjnhpaeojofohoefgiehjai') ||
         str.includes('mhjfbmdgcfjbbpaeojofohoefgiehjai') ||
         str.includes('edge_pdf') ||
         str.includes('pdf_viewer') ||
         str === '#' ||
         str === 'about:blank';
}

function cleanPdfUrl(rawUrl, fallbackUrl = '') {
  let candidate = (rawUrl || '').trim();
  let fallback = (fallbackUrl || '').trim();

  function extractEmbedded(str) {
    if (!str) return null;
    
    // 1. Try URL parameters first (?src=..., ?file=..., ?url=...)
    try {
      if (str.includes('?')) {
        const u = new URL(str, 'https://dummy.org');
        for (const param of ['src', 'file', 'url', 'pdf', 'target', 'doc', 'document']) {
          const val = u.searchParams.get(param);
          if (val && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('file:///'))) {
            return decodeURIComponent(val);
          }
        }
      }
    } catch (e) {}

    // 2. Try regex match for embedded http://, https://, or file:///
    const match = str.match(/(https?:\/\/[^\s"'<>]+|file:\/\/\/[^\s"'<>]+)/i);
    if (match) {
      let found = match[1];
      if (found.includes('&') && !found.includes('?')) {
        found = found.split('&')[0];
      }
      return decodeURIComponent(found);
    }
    return null;
  }

  // 1. If candidate is a normal web URL or file URL, return it
  if (!isInternalExtensionUrl(candidate) && (candidate.startsWith('http://') || candidate.startsWith('https://') || candidate.startsWith('file:///'))) {
    return candidate;
  }

  // 2. If candidate is an internal viewer URL, try extracting embedded target
  if (candidate) {
    const extracted = extractEmbedded(candidate);
    if (extracted && !isInternalExtensionUrl(extracted)) {
      return extracted;
    }
  }

  // 3. Try fallbackUrl (tab.url)
  if (fallback && !isInternalExtensionUrl(fallback) && (fallback.startsWith('http://') || fallback.startsWith('https://') || fallback.startsWith('file:///'))) {
    return fallback;
  }

  if (fallback) {
    const fallbackExtracted = extractEmbedded(fallback);
    if (fallbackExtracted && !isInternalExtensionUrl(fallbackExtracted)) {
      return fallbackExtracted;
    }
  }

  // 4. Return whatever we have rather than empty string so user doesn't have to manually type
  return candidate || fallback || '';
}

function extractMetadata() {
  // Executed in the context of the page
  const title = document.title || '';
  const url = window.location.href || '';
  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch (e) {}
  
  let doi = '';
  let authors = '';
  
  // Try to find DOI
  const doiMeta = document.querySelector('meta[name="citation_doi"]') || 
                  document.querySelector('meta[name="dc.identifier"]');
  if (doiMeta) {
    doi = doiMeta.content;
  }
  
  // Try to find authors
  const authorMetas = document.querySelectorAll('meta[name="citation_author"]');
  if (authorMetas.length > 0) {
    authors = Array.from(authorMetas).map(meta => meta.content).join(', ');
  } else {
    const dcCreator = document.querySelector('meta[name="dc.creator"]');
    if (dcCreator) {
      authors = dcCreator.content;
    }
  }
  
  return { title, url, domain, doi, authors };
}

// G. Storage Operations
async function getNotes() {
  const data = await chrome.storage.local.get('academic_notes');
  return data.academic_notes || [];
}

async function getFolders() {
  const data = await chrome.storage.local.get('academic_folders');
  return data.academic_folders || ['Inbox'];
}

async function saveNote(note, fallbackTabUrl = '') {
  if (!note) return null;
  if (!note.id) note.id = crypto.randomUUID();
  if (!note.folder) note.folder = 'Inbox';
  if (!note.content && note.text) note.content = note.text;
  if (!note.createdAt) note.createdAt = note.timestamp || new Date().toISOString();

  // Normalize and clean URL for both online and offline sources
  const rawUrl = note.url || note.pageUrl || note.metadata?.url || fallbackTabUrl || '';
  const cleanUrl = cleanPdfUrl(rawUrl, fallbackTabUrl);
  note.url = cleanUrl;
  note.pageUrl = cleanUrl;

  // Normalize Domain
  if (cleanUrl) {
    if (cleanUrl.startsWith('file:///')) {
      note.domain = 'Local PDF File';
      note.sourceDomain = 'Local PDF File';
    } else {
      try {
        note.domain = new URL(cleanUrl).hostname;
        note.sourceDomain = note.domain;
      } catch (e) {
        note.domain = 'PDF Document';
        note.sourceDomain = note.domain;
      }
    }
  } else {
    note.domain = 'PDF Document';
    note.sourceDomain = 'PDF Document';
  }

  // Normalize Title
  if (!note.title && note.pageTitle) note.title = note.pageTitle;
  if (!note.title && note.metadata?.title) note.title = note.metadata.title;
  if (!note.title || note.title === 'Academic Document' || note.title === 'Academic PDF Document') {
    if (cleanUrl) {
      try {
        const pathPart = cleanUrl.split('/').pop().split('?')[0];
        const decoded = decodeURIComponent(pathPart).replace(/\.pdf$/i, '');
        if (decoded) note.title = decoded;
      } catch (e) {}
    }
    if (!note.title) note.title = 'Academic Note';
  }

  const notes = await getNotes();
  notes.unshift(note);
  await chrome.storage.local.set({ 'academic_notes': notes });
  await updateBadge();
  return note;
}

async function deleteNote(id) {
  const notes = await getNotes();
  const updatedNotes = notes.filter(n => n.id !== id);
  await chrome.storage.local.set({ 'academic_notes': updatedNotes });
  await updateBadge();
}

async function updateNote(id, updates) {
  const notes = await getNotes();
  const index = notes.findIndex(n => n.id === id);
  if (index !== -1) {
    notes[index] = { ...notes[index], ...updates, updatedAt: new Date().toISOString() };
    await chrome.storage.local.set({ 'academic_notes': notes });
    return notes[index];
  }
  throw new Error('Note not found');
}

// C. Message Handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_FOLDERS') {
    (async () => {
      try {
        const folders = await getFolders();
        sendResponse({ success: true, folders });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.type === 'ADD_FOLDER') {
    (async () => {
      try {
        const folders = await getFolders();
        if (!folders.includes(request.folder)) {
          folders.push(request.folder);
          // Sort folders alphabetically, but keep Inbox first
          folders.sort((a, b) => {
            if (a === 'Inbox') return -1;
            if (b === 'Inbox') return 1;
            return a.localeCompare(b);
          });
          await chrome.storage.local.set({ 'academic_folders': folders });
        }
        sendResponse({ success: true, folders });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.type === 'DELETE_FOLDER') {
    (async () => {
      try {
        if (request.folder === 'Inbox') {
          throw new Error('Cannot delete Inbox folder');
        }
        let folders = await getFolders();
        folders = folders.filter(f => f !== request.folder && !f.startsWith(request.folder + '/'));
        await chrome.storage.local.set({ 'academic_folders': folders });
        
        // Move notes from deleted folder to Inbox
        const notes = await getNotes();
        let changed = false;
        for (const note of notes) {
          if (note.folder === request.folder || (note.folder && note.folder.startsWith(request.folder + '/'))) {
            note.folder = 'Inbox';
            changed = true;
          }
        }
        if (changed) {
          await chrome.storage.local.set({ 'academic_notes': notes });
        }
        
        sendResponse({ success: true, folders });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.type === 'RENAME_FOLDER') {
    (async () => {
      try {
        const oldName = request.oldFolder;
        const newName = request.newFolder;
        if (!oldName || !newName || oldName === 'Inbox') {
          throw new Error('Invalid folder name or cannot rename Inbox');
        }
        let folders = await getFolders();
        folders = folders.map(f => {
          if (f === oldName) return newName;
          if (f.startsWith(oldName + '/')) return newName + f.slice(oldName.length);
          return f;
        });
        folders = Array.from(new Set(folders));
        folders.sort((a, b) => (a === 'Inbox' ? -1 : b === 'Inbox' ? 1 : a.localeCompare(b)));
        await chrome.storage.local.set({ 'academic_folders': folders });

        // Update notes
        const notes = await getNotes();
        let changed = false;
        for (const note of notes) {
          if (note.folder === oldName) {
            note.folder = newName;
            changed = true;
          } else if (note.folder && note.folder.startsWith(oldName + '/')) {
            note.folder = newName + note.folder.slice(oldName.length);
            changed = true;
          }
        }
        if (changed) {
          await chrome.storage.local.set({ 'academic_notes': notes });
        }

        sendResponse({ success: true, folders });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.type === 'SAVE_NOTE') {
    (async () => {
      try {
        let tabUrl = '';
        try {
          const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTabs && activeTabs.length > 0) {
            tabUrl = activeTabs[0].url || activeTabs[0].pendingUrl || '';
          }
        } catch (e) {}
        
        if (!tabUrl && sender && sender.tab) {
           tabUrl = sender.tab.url || sender.tab.pendingUrl || '';
        }
        
        const note = await saveNote(request.data, tabUrl);

        // Auto open Side Panel on note save
        try {
          if (typeof chrome.sidePanel !== 'undefined' && typeof chrome.sidePanel.open === 'function') {
            if (sender && sender.tab && sender.tab.windowId) {
              await chrome.sidePanel.open({ windowId: sender.tab.windowId });
            } else {
              const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
              if (tabs.length > 0) {
                await chrome.sidePanel.open({ windowId: tabs[0].windowId });
              }
            }
          }
        } catch (sideErr) {
          console.warn('Could not auto-open side panel:', sideErr);
        }

        sendResponse({ success: true, note });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.type === 'GET_NOTES') {
    (async () => {
      try {
        const notes = await getNotes();
        sendResponse({ success: true, notes });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.type === 'DELETE_NOTE') {
    (async () => {
      try {
        await deleteNote(request.id);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.type === 'UPDATE_NOTE') {
    (async () => {
      try {
        const note = await updateNote(request.id, request.updates);
        sendResponse({ success: true, note });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.type === 'SEARCH_NOTES') {
    (async () => {
      try {
        const notes = await getNotes();
        const query = request.query.toLowerCase();
        const results = notes.filter(n => 
          n.content.toLowerCase().includes(query) || 
          n.title.toLowerCase().includes(query) ||
          (n.tags && n.tags.some(t => t.toLowerCase().includes(query)))
        );
        sendResponse({ success: true, notes: results });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.type === 'TOGGLE_UNLOCK') {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
          sendResponse({ success: false, error: 'No active tab' });
          return;
        }
        const tab = tabs[0];
        
        let sessionData = {};
        try {
          sessionData = await chrome.storage.session.get('unlock_tabs');
        } catch (e) {
          // Fallback if session storage isn't available
          sessionData = await chrome.storage.local.get('unlock_tabs');
        }
        
        const unlockedTabs = sessionData.unlock_tabs || {};
        const isUnlocked = !unlockedTabs[tab.id];
        unlockedTabs[tab.id] = isUnlocked;
        
        try {
          await chrome.storage.session.set({ 'unlock_tabs': unlockedTabs });
        } catch (e) {
          await chrome.storage.local.set({ 'unlock_tabs': unlockedTabs });
        }
        
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            type: 'TOGGLE_UNLOCK',
            enabled: isUnlocked
          });
        } catch (e) {} // Content script might not be injected yet
        
        sendResponse({ success: true, enabled: isUnlocked });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.type === 'GET_UNLOCK_STATE') {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
          sendResponse({ success: true, enabled: false });
          return;
        }
        
        let sessionData = {};
        try {
          sessionData = await chrome.storage.session.get('unlock_tabs');
        } catch (e) {
          sessionData = await chrome.storage.local.get('unlock_tabs');
        }
        
        const unlockedTabs = sessionData.unlock_tabs || {};
        sendResponse({ success: true, enabled: !!unlockedTabs[tabs[0].id] });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.type === 'EXPORT_NOTES') {
    (async () => {
      try {
        const notes = await getNotes();
        sendResponse({ success: true, notes });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.type === 'IMPORT_NOTES') {
    (async () => {
      try {
        if (!Array.isArray(request.data)) {
          throw new Error('Invalid data format');
        }
        const existing = await getNotes();
        // Simple merge
        const allNotes = [...request.data, ...existing];
        // Deduplicate by ID
        const unique = Array.from(new Map(allNotes.map(item => [item.id, item])).values());
        await chrome.storage.local.set({ 'academic_notes': unique });
        await updateBadge();
        sendResponse({ success: true, count: unique.length });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.type === 'OPEN_SIDE_PANEL') {
    (async () => {
      try {
        if (typeof chrome.sidePanel !== 'undefined' && typeof chrome.sidePanel.open === 'function') {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs.length > 0) {
            await chrome.sidePanel.open({ windowId: tabs[0].windowId });
            sendResponse({ success: true });
            return;
          }
        }
        const url = chrome.runtime.getURL('manager/manager.html');
        await chrome.tabs.create({ url });
        sendResponse({ success: true, openedTab: true });
      } catch (error) {
        try {
          const url = chrome.runtime.getURL('manager/manager.html');
          await chrome.tabs.create({ url });
          sendResponse({ success: true, openedTab: true });
        } catch (e) {
          sendResponse({ success: false, error: error.message });
        }
      }
    })();
    return true;
  }

  if (request.type === 'OPEN_MANAGER') {
    (async () => {
      try {
        const url = chrome.runtime.getURL('manager/manager.html');
        const tabs = await chrome.tabs.query({ url });
        if (tabs.length > 0) {
          await chrome.tabs.update(tabs[0].id, { active: true });
        } else {
          await chrome.tabs.create({ url });
        }
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.type === 'GET_NOTE_COUNT') {
    (async () => {
      try {
        const notes = await getNotes();
        sendResponse({ success: true, count: notes.length });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});

// D. Command Handler
chrome.commands.onCommand.addListener(async (command) => {
  try {
    if (command === 'save-snippet') {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) return;
      const tab = tabs[0];
      
      let selectionText = '';
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.getSelection().toString()
        });
        selectionText = results[0]?.result || '';
      } catch (e) {
        console.warn('Direct selection script failed:', e);
      }
      
      if (!selectionText) return;
      
      let metadata = {};
      try {
        const metaResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractMetadata
        });
        metadata = metaResults[0]?.result || {};
      } catch (e) {
        console.warn('Metadata script execution failed:', e);
      }

      let tabUrl = tab.url || tab.pendingUrl || '';
      
      // Try to get real url via executeScript just in case
      let contextUrl = '';
      try {
        const urlResults = await chrome.scripting.executeScript({
           target: { tabId: tab.id },
           func: () => window.location.href || document.referrer || ''
        });
        contextUrl = urlResults[0]?.result || '';
      } catch (e) {}

      const rawUrl = metadata.url || contextUrl || tabUrl || '';
      let cleanUrl = cleanPdfUrl(rawUrl, tabUrl);
      
      if (!cleanUrl || isInternalExtensionUrl(cleanUrl)) {
         const cleanContext = cleanPdfUrl(contextUrl, contextUrl);
         if (cleanContext && !isInternalExtensionUrl(cleanContext)) {
             cleanUrl = cleanContext;
         }
      }

      let fallbackTitle = tab.title || 'Academic PDF Document';
      if (fallbackTitle.toLowerCase().endsWith('.pdf')) {
        fallbackTitle = fallbackTitle.replace(/\.pdf$/i, '');
      }
      let fallbackDomain = '';
      try {
        if (cleanUrl) fallbackDomain = new URL(cleanUrl).hostname;
        else if (tabUrl) fallbackDomain = new URL(tabUrl).hostname;
      } catch (e) {}
      
      const note = {
        id: crypto.randomUUID(),
        content: selectionText,
        title: metadata.title || fallbackTitle,
        url: cleanUrl,
        pageUrl: cleanUrl,
        authors: metadata.authors || '',
        doi: metadata.doi || '',
        domain: metadata.domain || fallbackDomain || 'PDF Document',
        createdAt: new Date().toISOString(),
        tags: [],
        folder: 'Inbox'
      };
      
      await saveNote(note, tabUrl);

      try {
        if (typeof chrome.sidePanel !== 'undefined' && typeof chrome.sidePanel.open === 'function' && tab.windowId) {
          await chrome.sidePanel.open({ windowId: tab.windowId });
        }
      } catch (sideErr) {
        console.warn('Could not auto-open side panel:', sideErr);
      }
      
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SHOW_TOAST',
          message: 'Saved to Academic Notes'
        });
      } catch (e) {}
    } else if (command === 'toggle-unlock') {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) return;
      const tab = tabs[0];
      
      let sessionData = {};
      try {
        sessionData = await chrome.storage.session.get('unlock_tabs');
      } catch (e) {
        sessionData = await chrome.storage.local.get('unlock_tabs');
      }
      
      const unlockedTabs = sessionData.unlock_tabs || {};
      const isUnlocked = !unlockedTabs[tab.id];
      unlockedTabs[tab.id] = isUnlocked;
      
      try {
        await chrome.storage.session.set({ 'unlock_tabs': unlockedTabs });
      } catch (e) {
        await chrome.storage.local.set({ 'unlock_tabs': unlockedTabs });
      }
      
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'TOGGLE_UNLOCK',
          enabled: isUnlocked
        });
      } catch (e) {}
    }
  } catch (error) {
    console.error('Error handling command:', error);
  }
});

// F. Side Panel Behavior
if (typeof chrome.sidePanel !== 'undefined') {
  // Check if side panel exists (not present on all mobile browsers)
  // According to rules, we should not use setPanelBehavior since we have default popup.
  // We can just log its availability.
  console.log('Side panel API available');
}

// Clean up tab session state on tab close
chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    let sessionData = {};
    try {
      sessionData = await chrome.storage.session.get('unlock_tabs');
    } catch (e) {
      sessionData = await chrome.storage.local.get('unlock_tabs');
    }
    
    if (sessionData.unlock_tabs && typeof sessionData.unlock_tabs[tabId] !== 'undefined') {
      delete sessionData.unlock_tabs[tabId];
      try {
        await chrome.storage.session.set({ 'unlock_tabs': sessionData.unlock_tabs });
      } catch (e) {
        await chrome.storage.local.set({ 'unlock_tabs': sessionData.unlock_tabs });
      }
    }
  } catch (error) {
    // Ignore errors on cleanup
  }
});
