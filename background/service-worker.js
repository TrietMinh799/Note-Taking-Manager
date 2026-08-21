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
      if (!selectionText || !tab || !tab.id) return;
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractMetadata
      });
      
      const metadata = results[0]?.result || {};
      
      const note = {
        id: crypto.randomUUID(),
        content: selectionText,
        title: metadata.title || '',
        url: metadata.url || tab.url || '',
        authors: metadata.authors || '',
        doi: metadata.doi || '',
        domain: metadata.domain || '',
        createdAt: new Date().toISOString(),
        tags: [],
        folder: 'Inbox'
      };
      
      await saveNote(note);
      
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SHOW_TOAST',
          message: 'Saved to Academic Notes'
        });
      } catch (e) {
        // Content script might not be injected, ignore
      }
    } catch (error) {
      console.error('Error handling context menu click:', error);
    }
  }
});

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

async function saveNote(note) {
  if (!note.folder) note.folder = 'Inbox';
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
        const note = await saveNote(request.data);

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
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });
      
      const selectionText = results[0]?.result;
      if (!selectionText) return;
      
      const metaResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractMetadata
      });
      
      const metadata = metaResults[0]?.result || {};
      
      const note = {
        id: crypto.randomUUID(),
        content: selectionText,
        title: metadata.title || '',
        url: metadata.url || tab.url || '',
        authors: metadata.authors || '',
        doi: metadata.doi || '',
        domain: metadata.domain || '',
        createdAt: new Date().toISOString(),
        tags: [],
        folder: 'Inbox'
      };
      
      await saveNote(note);

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
