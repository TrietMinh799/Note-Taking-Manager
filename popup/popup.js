/**
 * Academic Notes & Snippet Saver - Popup Script
 * Handles quick actions, recent snippet previews, Obsidian export, and force unlock.
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializePopup();
  } catch (error) {
    console.error('Error initializing popup:', error);
  }
});

/**
 * Initializes all popup components and event listeners
 */
async function initializePopup() {
  // Bind UI elements
  const btnOpenManager = document.getElementById('btn-open-manager');
  const btnToggleUnlock = document.getElementById('btn-toggle-unlock');
  const linkOptions = document.getElementById('link-options');

  // Attach event handlers
  if (btnOpenManager) {
    btnOpenManager.addEventListener('click', handleOpenManager);
  }

  if (btnToggleUnlock) {
    btnToggleUnlock.addEventListener('click', handleToggleUnlock);
  }

  if (linkOptions) {
    linkOptions.addEventListener('click', handleOpenOptions);
  }

  // Load state and data in parallel
  await Promise.all([
    loadNoteData(),
    loadUnlockState()
  ]);
}

/**
 * Loads note count and last 3 recent notes from storage
 */
async function loadNoteData() {
  try {
    let notes = [];

    // Try messaging service worker first
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_NOTES' });
      if (response && response.success && Array.isArray(response.notes)) {
        notes = response.notes;
      }
    } catch (msgErr) {
      console.warn('GET_NOTES message failed, reading direct from storage:', msgErr);
    }

    // Direct storage fallback if message failed or returned empty
    if (notes.length === 0) {
      const data = await chrome.storage.local.get('academic_notes');
      if (Array.isArray(data.academic_notes)) {
        notes = data.academic_notes;
      }
    }

    // Sort notes descending by date (newest first)
    notes.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.timestamp || 0).getTime();
      const dateB = new Date(b.createdAt || b.timestamp || 0).getTime();
      return dateB - dateA;
    });

    // Update stats counters
    updateStatsDisplay(notes.length);

    // Render recent notes (max 3)
    const recentNotes = notes.slice(0, 3);
    renderRecentNotes(recentNotes);
  } catch (error) {
    console.error('Error loading notes data:', error);
    updateStatsDisplay(0);
    renderRecentNotes([]);
  }
}

/**
 * Updates note count indicators in the header and banner
 * @param {number} count 
 */
function updateStatsDisplay(count) {
  const statsCountEl = document.getElementById('stats-count');
  const statsSummaryEl = document.getElementById('stats-summary-text');
  const recentCountText = document.getElementById('recent-count-text');

  if (statsCountEl) {
    statsCountEl.textContent = count.toString();
  }

  if (statsSummaryEl) {
    if (count === 1) {
      statsSummaryEl.textContent = '1 snippet saved';
    } else {
      statsSummaryEl.textContent = `${count} snippets saved`;
    }
  }

  if (recentCountText) {
    if (count === 0) {
      recentCountText.textContent = '0 items';
    } else if (count <= 3) {
      recentCountText.textContent = `${count} recent`;
    } else {
      recentCountText.textContent = 'Last 3 of ' + count;
    }
  }
}

/**
 * Renders recent notes previews in a safe manner using textContent
 * @param {Array<Object>} notes 
 */
function renderRecentNotes(notes) {
  const listContainer = document.getElementById('recent-notes-list');
  const emptyState = document.getElementById('empty-state');

  if (!listContainer || !emptyState) return;

  // Clear previous items safely
  while (listContainer.firstChild) {
    listContainer.removeChild(listContainer.firstChild);
  }

  if (!notes || notes.length === 0) {
    emptyState.hidden = false;
    listContainer.hidden = true;
    return;
  }

  emptyState.hidden = true;
  listContainer.hidden = false;

  for (const note of notes) {
    const card = createNoteCardElement(note);
    listContainer.appendChild(card);
  }
}

/**
 * Creates a single note DOM card safely without innerHTML
 * @param {Object} note 
 * @returns {HTMLElement}
 */
function createNoteCardElement(note) {
  const card = document.createElement('div');
  card.className = 'note-card';

  // Highlight color border
  if (note.color) {
    card.classList.add(`color-${note.color}`);
  }

  // Top row: Title and Copy Button
  const topRow = document.createElement('div');
  topRow.className = 'note-card-top';

  const titleEl = document.createElement('h3');
  titleEl.className = 'note-title';
  const displayTitle = note.title || note.pageTitle || note.metadata?.title || 'Academic Snippet';
  titleEl.textContent = displayTitle;
  titleEl.title = displayTitle;
  topRow.appendChild(titleEl);

  const actionsDiv = document.createElement('div');
  actionsDiv.style.display = 'flex';
  actionsDiv.style.gap = '4px';

  // Copy Button
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn-copy-callout';
  copyBtn.title = 'Copy Obsidian Callout format';

  const copyIconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  copyIconSvg.setAttribute('viewBox', '0 0 24 24');
  copyIconSvg.setAttribute('width', '12');
  copyIconSvg.setAttribute('height', '12');
  copyIconSvg.setAttribute('fill', 'none');
  copyIconSvg.setAttribute('stroke', 'currentColor');
  copyIconSvg.setAttribute('stroke-width', '2');
  copyIconSvg.setAttribute('stroke-linecap', 'round');
  copyIconSvg.setAttribute('stroke-linejoin', 'round');

  const rectPath = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rectPath.setAttribute('x', '9');
  rectPath.setAttribute('y', '9');
  rectPath.setAttribute('width', '13');
  rectPath.setAttribute('height', '13');
  rectPath.setAttribute('rx', '2');
  rectPath.setAttribute('ry', '2');

  const backPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  backPath.setAttribute('d', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');

  copyIconSvg.appendChild(rectPath);
  copyIconSvg.appendChild(backPath);

  const copyLabel = document.createElement('span');
  copyLabel.textContent = 'Copy';

  copyBtn.appendChild(copyIconSvg);
  copyBtn.appendChild(copyLabel);

  copyBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await handleCopyCallout(note, copyBtn, copyLabel);
  });

  // Delete Button
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'btn-copy-callout';
  delBtn.style.color = '#ef4444';
  delBtn.style.borderColor = '#ef4444';
  delBtn.title = 'Delete note';
  const delLabel = document.createElement('span');
  delLabel.textContent = 'Delete';
  delBtn.appendChild(delLabel);

  delBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await chrome.runtime.sendMessage({ type: 'DELETE_NOTE', id: note.id });
      await loadNoteData();
    } catch(err) {
      console.error(err);
    }
  });

  actionsDiv.appendChild(copyBtn);
  actionsDiv.appendChild(delBtn);

  topRow.appendChild(actionsDiv);
  card.appendChild(topRow);

  // Content Preview (Truncated to 50 words)
  const previewEl = document.createElement('p');
  previewEl.className = 'note-preview-text';
  const rawContent = note.content || note.text || '';
  const cleanSnippet = rawContent.replace(/\s+/g, ' ').trim();
  const words = cleanSnippet.split(/\s+/);
  const truncated = words.length > 50 ? words.slice(0, 50).join(' ') + '...' : cleanSnippet;
  previewEl.textContent = `“${truncated || '(Empty snippet)'}”`;
  card.appendChild(previewEl);

  // Metadata Bar (Date & Tags/Domain)
  const metaBar = document.createElement('div');
  metaBar.className = 'note-meta-bar';

  const dateEl = document.createElement('span');
  dateEl.className = 'note-date';
  dateEl.textContent = formatNoteDate(note.createdAt || note.timestamp);
  metaBar.appendChild(dateEl);

  // Show first tag or domain if available
  const tags = note.tags || [];
  const domain = note.domain || note.metadata?.domain || (note.url ? extractDomain(note.url) : '');

  if (tags.length > 0) {
    const tagChip = document.createElement('span');
    tagChip.className = 'note-tag-chip';
    tagChip.textContent = '#' + tags[0];
    metaBar.appendChild(tagChip);
  } else if (domain) {
    const domainChip = document.createElement('span');
    domainChip.className = 'note-tag-chip';
    domainChip.textContent = domain;
    metaBar.appendChild(domainChip);
  }

  card.appendChild(metaBar);

  return card;
}

/**
 * Formats date into a clean relative or academic date string
 * @param {string|number} dateValue 
 * @returns {string}
 */
function formatNoteDate(dateValue) {
  if (!dateValue) return 'Recently';

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    // Academic short date: e.g. "Oct 24, 2024"
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Recently';
  }
}

/**
 * Extracts clean domain name from URL
 * @param {string} urlString 
 * @returns {string}
 */
function extractDomain(urlString) {
  try {
    const url = new URL(urlString);
    let hostname = url.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    return hostname;
  } catch {
    return '';
  }
}

/**
 * Generates and copies the Obsidian Markdown callout to clipboard
 * @param {Object} note 
 * @param {HTMLButtonElement} button 
 * @param {HTMLSpanElement} label 
 */
async function handleCopyCallout(note, button, label) {
  try {
    const callout = generateObsidianCallout(note);
    await navigator.clipboard.writeText(callout);

    // Visual feedback
    button.classList.add('copied');
    label.textContent = '✓ Copied!';

    setTimeout(() => {
      button.classList.remove('copied');
      label.textContent = 'Copy';
    }, 1500);
  } catch (error) {
    console.error('Failed to copy Obsidian callout:', error);
    label.textContent = 'Error';
    setTimeout(() => {
      label.textContent = 'Copy';
    }, 1500);
  }
}

/**
 * Generates Obsidian Callout Markdown
 * @param {Object} note 
 * @returns {string}
 */
function generateObsidianCallout(note) {
  // Use global helper if loaded from utils/obsidian.js
  if (window.AcademicNotes?.Obsidian?.generateCallout) {
    return window.AcademicNotes.Obsidian.generateCallout(note);
  }

  // Robust fallback
  const colorMap = {
    yellow: 'warning',
    green: 'success',
    blue: 'info',
    purple: 'abstract',
    orange: 'attention'
  };

  const calloutType = colorMap[note.color] || 'quote';
  const title = note.title || note.pageTitle || note.metadata?.title || 'Academic Snippet';
  const content = (note.content || note.text || '').trim();
  const quotedLines = content ? content.split('\n').map(l => `> ${l}`).join('\n') : '> ';

  let citation = '';
  const authors = note.authors || note.metadata?.authors;
  if (Array.isArray(authors) && authors.length > 0) {
    citation += `— ${authors[0]}`;
    if (authors.length > 1) citation += ' et al.';
  } else if (typeof authors === 'string' && authors.trim()) {
    citation += `— ${authors.trim()}`;
  }

  const journal = note.journal || note.metadata?.journal;
  if (journal) {
    citation += citation ? `, *${journal}*` : `*${journal}*`;
  }

  const url = note.url || note.pageUrl || note.metadata?.url;
  if (url) {
    citation += ` [Source](${url})`;
  }

  let result = `> [!${calloutType}] ${title}\n${quotedLines}`;
  if (citation) {
    result += `\n>\n> ${citation}`;
  }

  return result;
}

/**
 * Loads the Force Unlock toggle state for the active tab
 */
async function loadUnlockState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_UNLOCK_STATE' });
    const isUnlocked = Boolean(response && response.enabled);
    updateUnlockButtonUI(isUnlocked);
  } catch (error) {
    console.warn('Could not retrieve unlock state:', error);
    updateUnlockButtonUI(false);
  }
}

/**
 * Updates the visual state and label of the Force Unlock button
 * @param {boolean} isUnlocked 
 */
function updateUnlockButtonUI(isUnlocked) {
  const btn = document.getElementById('btn-toggle-unlock');
  const label = document.getElementById('unlock-btn-label');

  if (!btn || !label) return;

  if (isUnlocked) {
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    btn.title = 'Force Unlock is ACTIVE on this tab. Click to disable.';
    label.textContent = 'Force Unlock: ON';
  } else {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
    btn.title = 'Bypass copy-paste and text selection restrictions on this tab';
    label.textContent = 'Force Unlock: OFF';
  }
}

/**
 * Handles toggling the Force Unlock selection feature
 */
async function handleToggleUnlock() {
  const btn = document.getElementById('btn-toggle-unlock');
  if (btn) {
    btn.disabled = true;
  }

  try {
    const response = await chrome.runtime.sendMessage({ type: 'TOGGLE_UNLOCK' });
    if (response && response.success) {
      updateUnlockButtonUI(Boolean(response.enabled));
    } else {
      // Invert local state if response was missing explicit boolean
      const currentlyActive = btn?.classList.contains('active');
      updateUnlockButtonUI(!currentlyActive);
    }
  } catch (error) {
    console.error('Failed to toggle force unlock:', error);
  } finally {
    if (btn) {
      btn.disabled = false;
    }
  }
}

/**
 * Handles opening Notes Manager in side panel or new tab
 */
async function handleOpenManager() {
  try {
    // 1. Try sidePanel.open if available in popup (Chrome 116+)
    if (typeof chrome.sidePanel !== 'undefined' && typeof chrome.sidePanel.open === 'function') {
      try {
        const currentWindow = await chrome.windows.getCurrent();
        if (currentWindow && currentWindow.id) {
          await chrome.sidePanel.open({ windowId: currentWindow.id });
          window.close();
          return;
        }
      } catch (sideErr) {
        console.warn('Direct side panel open failed:', sideErr);
      }
    }

    // 2. Try messaging background to open side panel
    try {
      const response = await chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
      if (response && response.success) {
        window.close();
        return;
      }
    } catch (msgErr) {
      console.warn('OPEN_SIDE_PANEL message failed:', msgErr);
    }

    // 3. Fallback: open manager in new tab (e.g. mobile or browsers without sidePanel)
    const managerUrl = chrome.runtime.getURL('manager/manager.html');
    await chrome.tabs.create({ url: managerUrl });
    window.close();
  } catch (error) {
    console.error('Failed to open manager:', error);
    try {
      const managerUrl = chrome.runtime.getURL('manager/manager.html');
      await chrome.tabs.create({ url: managerUrl });
      window.close();
    } catch (finalErr) {
      console.error('Final fallback tab create failed:', finalErr);
    }
  }
}

/**
 * Handles opening Options page
 */
async function handleOpenOptions() {
  try {
    if (chrome.runtime.openOptionsPage) {
      await chrome.runtime.openOptionsPage();
    } else {
      await chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
    }
    window.close();
  } catch (error) {
    console.error('Failed to open options page:', error);
    await chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
    window.close();
  }
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.academic_notes) {
    loadNoteData();
  }
});

