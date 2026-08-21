let allNotes = [];
let filteredNotes = [];
let allFolders = ['Inbox'];
let currentFolder = 'Inbox';

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadFolders();
  await loadNotes();
  setupEventListeners();
  populateFilters();
});

async function loadFolders() {
  if (window.AcademicNotes?.DB) {
    try {
      allFolders = await window.AcademicNotes.DB.getAllFolders();
      renderFolderTree();
      return;
    } catch (e) {
      console.warn('SQLite DB loadFolders failed, fallback to background:', e);
    }
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_FOLDERS" }, (response) => {
      if (response && response.success) {
        allFolders = response.folders || ['Inbox'];
      }
      renderFolderTree();
      resolve();
    });
  });
}

let collapsedFolders = new Set();
let contextFolderTarget = null;
let contextFolderName = null;

function getFolderCounts() {
  const counts = {};
  allNotes.forEach(note => {
    const f = note.folder || 'Inbox';
    counts[f] = (counts[f] || 0) + 1;
  });
  return counts;
}

function buildFolderTreeData(folderList) {
  const tree = { name: 'root', fullPath: '', children: {}, isRoot: true };
  folderList.forEach(path => {
    if (!path) return;
    const parts = path.split('/');
    let current = tree;
    let currentPath = '';
    parts.forEach(part => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          fullPath: currentPath,
          children: {}
        };
      }
      current = current.children[part];
    });
  });
  return tree;
}

function renderFolderTree() {
  const folderTree = document.getElementById('folderTree');
  if (!folderTree) return;
  folderTree.innerHTML = '';

  const counts = getFolderCounts();

  // 1. "All Notes" item
  const allNode = document.createElement('div');
  allNode.className = 'tree-node';
  const allRow = document.createElement('div');
  allRow.className = 'tree-row' + (currentFolder === 'ALL' ? ' active' : '');
  allRow.innerHTML = `
    <span class="tree-arrow hidden-arrow">▶</span>
    <span class="tree-icon">📚</span>
    <span class="tree-name">All Notes</span>
    <span class="tree-count">${allNotes.length}</span>
  `;
  allRow.addEventListener('click', () => {
    currentFolder = 'ALL';
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('open');
    }
    renderFolderTree();
    applyFilters();
  });
  allNode.appendChild(allRow);
  folderTree.appendChild(allNode);

  // 2. Build hierarchical tree from allFolders
  const treeData = buildFolderTreeData(allFolders);

  // Render children of root (Inbox first, then others alphabetically)
  const rootKeys = Object.keys(treeData.children).sort((a, b) => {
    if (a === 'Inbox') return -1;
    if (b === 'Inbox') return 1;
    return a.localeCompare(b);
  });

  rootKeys.forEach(childKey => {
    const nodeEl = createTreeNodeElement(treeData.children[childKey], counts);
    folderTree.appendChild(nodeEl);
  });
}

function createTreeNodeElement(node, counts) {
  const hasChildren = Object.keys(node.children).length > 0;
  const isExpanded = !collapsedFolders.has(node.fullPath);
  const isActive = currentFolder === node.fullPath;

  // Calculate total count (direct + recursive subfolders)
  let totalCount = counts[node.fullPath] || 0;
  Object.keys(counts).forEach(path => {
    if (path.startsWith(node.fullPath + '/')) {
      totalCount += counts[path];
    }
  });

  const nodeContainer = document.createElement('div');
  nodeContainer.className = 'tree-node';

  const row = document.createElement('div');
  row.className = 'tree-row' + (isActive ? ' active' : '');
  row.dataset.path = node.fullPath;

  // Arrow
  const arrow = document.createElement('span');
  arrow.className = 'tree-arrow' + (hasChildren ? (isExpanded ? ' expanded' : '') : ' hidden-arrow');
  arrow.textContent = '▶';
  arrow.title = hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : '';
  arrow.addEventListener('click', (e) => {
    e.stopPropagation();
    if (hasChildren) {
      if (collapsedFolders.has(node.fullPath)) {
        collapsedFolders.delete(node.fullPath);
      } else {
        collapsedFolders.add(node.fullPath);
      }
      renderFolderTree();
    }
  });

  // Icon
  const icon = document.createElement('span');
  icon.className = 'tree-icon';
  if (node.fullPath === 'Inbox') {
    icon.textContent = '📥';
  } else if (hasChildren) {
    icon.textContent = isExpanded ? '📂' : '📁';
  } else {
    icon.textContent = '📁';
  }

  // Name
  const nameSpan = document.createElement('span');
  nameSpan.className = 'tree-name';
  nameSpan.textContent = node.name;
  nameSpan.title = node.fullPath;

  // Count
  const countSpan = document.createElement('span');
  countSpan.className = 'tree-count';
  countSpan.textContent = totalCount.toString();

  row.append(arrow, icon, nameSpan, countSpan);

  // Left click: select folder & toggle expansion if it has children
  row.addEventListener('click', () => {
    if (hasChildren) {
      if (collapsedFolders.has(node.fullPath)) {
        collapsedFolders.delete(node.fullPath);
      } else {
        collapsedFolders.add(node.fullPath);
      }
    }

    currentFolder = node.fullPath;
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('open');
    }
    renderFolderTree();
    applyFilters();
  });

  // Double click: toggle expand
  row.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    if (hasChildren) {
      if (collapsedFolders.has(node.fullPath)) {
        collapsedFolders.delete(node.fullPath);
      } else {
        collapsedFolders.add(node.fullPath);
      }
      renderFolderTree();
    }
  });

  // Right click Context Menu
  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openExplorerContextMenu(e.clientX, e.clientY, node.fullPath, node.name);
  });

  // Drag and Drop (Drop note card onto folder)
  row.addEventListener('dragover', (e) => {
    e.preventDefault();
    row.classList.add('drag-over');
  });

  row.addEventListener('dragleave', () => {
    row.classList.remove('drag-over');
  });

  row.addEventListener('drop', (e) => {
    e.preventDefault();
    row.classList.remove('drag-over');
    const noteId = e.dataTransfer.getData('text/plain');
    if (noteId) {
      moveNoteToFolder(noteId, node.fullPath);
    }
  });

  nodeContainer.appendChild(row);

  // Children container
  if (hasChildren) {
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children' + (isExpanded ? '' : ' collapsed');
    Object.keys(node.children).sort().forEach(childKey => {
      childrenContainer.appendChild(createTreeNodeElement(node.children[childKey], counts));
    });
    nodeContainer.appendChild(childrenContainer);
  }

  return nodeContainer;
}

function openExplorerContextMenu(x, y, folderPath, folderName) {
  contextFolderTarget = folderPath;
  contextFolderName = folderName;

  const menu = document.getElementById('explorerContextMenu');
  if (!menu) return;
  menu.classList.remove('hidden');

  const menuWidth = 190;
  const menuHeight = 200;
  const posX = Math.min(x, window.innerWidth - menuWidth - 10);
  const posY = Math.min(y, window.innerHeight - menuHeight - 10);

  menu.style.left = `${posX}px`;
  menu.style.top = `${posY}px`;

  const delItem = menu.querySelector('[data-action="delete-folder"]');
  const renameItem = menu.querySelector('[data-action="rename-folder"]');
  const copyPathItem = menu.querySelector('[data-action="copy-path"]');
  const copyNameItem = menu.querySelector('[data-action="copy-name"]');
  const newSubItem = menu.querySelector('[data-action="new-subfolder"]');

  const isInbox = folderPath === 'Inbox';
  const isTargeted = Boolean(folderPath);

  if (delItem) delItem.style.display = isTargeted && !isInbox ? 'flex' : 'none';
  if (renameItem) renameItem.style.display = isTargeted && !isInbox ? 'flex' : 'none';
  if (copyPathItem) copyPathItem.style.display = isTargeted ? 'flex' : 'none';
  if (copyNameItem) copyNameItem.style.display = isTargeted ? 'flex' : 'none';
  if (newSubItem) newSubItem.style.display = isTargeted ? 'flex' : 'none';
}

function closeExplorerContextMenu() {
  const menu = document.getElementById('explorerContextMenu');
  if (menu) menu.classList.add('hidden');
}

function normalizeFolderPath(path) {
  if (!path) return '';
  return path.split('/').map(p => p.trim()).filter(Boolean).join('/');
}

function addFolder(folderPath) {
  const clean = normalizeFolderPath(folderPath);
  if (!clean) return;
  chrome.runtime.sendMessage({ type: "ADD_FOLDER", folder: clean }, async (res) => {
    if (res && res.success) {
      if (window.AcademicNotes?.DB) {
        await window.AcademicNotes.DB.addFolder(clean);
      }
      showToast(`Folder "${clean}" created`);
      await loadFolders();
    }
  });
}

function renameFolder(oldPath, newPath) {
  const cleanNew = normalizeFolderPath(newPath);
  if (!oldPath || !cleanNew || oldPath === cleanNew) return;
  chrome.runtime.sendMessage({ type: "RENAME_FOLDER", oldFolder: oldPath, newFolder: cleanNew }, async (res) => {
    if (res && res.success) {
      if (window.AcademicNotes?.DB) {
        await window.AcademicNotes.DB.renameFolder(oldPath, cleanNew);
      }
      showToast(`Renamed to "${cleanNew}"`);
      if (currentFolder === oldPath || currentFolder.startsWith(oldPath + '/')) {
        currentFolder = cleanNew + currentFolder.slice(oldPath.length);
      }
      await loadFolders();
      await loadNotes();
    }
  });
}

function deleteFolder(folderPath) {
  if (!folderPath || folderPath === 'Inbox') return;
  chrome.runtime.sendMessage({ type: "DELETE_FOLDER", folder: folderPath }, async (res) => {
    if (res && res.success) {
      if (window.AcademicNotes?.DB) {
        await window.AcademicNotes.DB.deleteFolder(folderPath);
      }
      if (currentFolder === folderPath || currentFolder.startsWith(folderPath + '/')) {
        currentFolder = 'Inbox';
      }
      await loadFolders();
      await loadNotes();
      showToast(`Folder "${folderPath}" deleted`);
    }
  });
}

function moveNoteToFolder(noteId, newFolder) {
  const note = allNotes.find(n => n.id === noteId);
  if (!note) return;
  if (note.folder === newFolder) return;

  const updatedNote = { ...note, folder: newFolder };
  if (window.AcademicNotes?.DB) {
    window.AcademicNotes.DB.updateNote(noteId, { folder: newFolder }).catch(console.error);
  }
  chrome.runtime.sendMessage({
    type: "UPDATE_NOTE",
    id: noteId,
    updates: updatedNote
  }, (res) => {
    if (res && res.success) {
      showToast(`Moved note to ${newFolder}`);
      const index = allNotes.findIndex(n => n.id === noteId);
      if (index > -1) allNotes[index] = updatedNote;
      renderFolderTree();
      applyFilters();
    }
  });
}

// Theme handling
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  
  chrome.storage.local.get(['theme'], (result) => {
    if (result.theme === 'dark') {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
      themeToggle.textContent = '☀️';
    } else if (result.theme === 'light') {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
      themeToggle.textContent = '🌙';
    } else {
      // System pref
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      themeToggle.textContent = prefersDark ? '☀️' : '🌙';
    }
  });

  themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-mode') || 
                  (!document.body.classList.contains('light-mode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      themeToggle.textContent = '🌙';
      chrome.storage.local.set({ theme: 'light' });
    } else {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
      themeToggle.textContent = '☀️';
      chrome.storage.local.set({ theme: 'dark' });
    }
  });
}

// Load and Render
async function loadNotes() {
  if (window.AcademicNotes?.DB) {
    try {
      allNotes = await window.AcademicNotes.DB.getAllNotes();
      allNotes.forEach(n => {
        n._searchTokens = `${n.content || ''} ${n.title || ''} ${n.userNote || ''} ${(n.tags || []).join(' ')}`.toLowerCase();
      });
      filteredNotes = [...allNotes];
      renderFolderTree();
      applyFilters();
      return;
    } catch (e) {
      console.warn('SQLite DB loadNotes failed, fallback to background:', e);
    }
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_NOTES" }, (response) => {
      if (response && response.success) {
        allNotes = response.notes || [];
        // Sort newest first
        allNotes.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.timestamp || a.date || 0).getTime();
          const dateB = new Date(b.createdAt || b.timestamp || b.date || 0).getTime();
          return dateB - dateA;
        });
        allNotes.forEach(n => {
          n._searchTokens = `${n.content || ''} ${n.title || ''} ${n.userNote || ''} ${(n.tags || []).join(' ')}`.toLowerCase();
        });
        filteredNotes = [...allNotes];
        renderFolderTree();
        applyFilters();
      }
      resolve();
    });
  });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if ((changes.academic_notes || changes.sqlite_last_updated) && !document.querySelector('.edit-form')) {
      loadNotes();
    }
    if (changes.academic_folders || changes.sqlite_last_updated) {
      loadFolders();
    }
  }
});

function renderNotes(notes) {
  const container = document.getElementById('notesContainer');
  const emptyState = document.getElementById('emptyState');
  const notesCount = document.getElementById('notesCount');
  
  container.innerHTML = '';
  notesCount.textContent = `${notes.length} snippet${notes.length !== 1 ? 's' : ''} saved`;
  
  if (notes.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  notes.forEach(note => {
    container.appendChild(createNoteCard(note));
  });
}

function format50Words(text) {
  if (!text) return '';
  // O(1) performance optimization for very long text
  const previewChunk = text.slice(0, 1500).trim();
  const words = previewChunk.split(/\s+/);
  if (words.length > 50) {
    return words.slice(0, 50).join(' ') + '...';
  }
  if (text.length > 1500) {
    return words.join(' ') + '...';
  }
  return text.trim();
}

function createNoteCard(note) {
  const card = document.createElement('div');
  card.className = 'note-card';
  card.dataset.id = note.id;
  if (note.color) {
    card.style.borderLeftColor = note.color;
  }

  // Make card draggable into folder tree
  card.draggable = true;
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', note.id);
    card.style.opacity = '0.4';
  });
  card.addEventListener('dragend', () => {
    card.style.opacity = '1';
  });

  // Top header row: Title & Meta on left, 3-dot Kebab Menu on right
  const headerRow = document.createElement('div');
  headerRow.className = 'note-card-header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'note-header-left';

  // Title
  const titleLink = document.createElement('a');
  titleLink.className = 'note-title';
  const noteUrl = note.url || note.pageUrl || note.metadata?.url || '#';
  titleLink.href = noteUrl;
  titleLink.target = '_blank';
  titleLink.rel = 'noopener noreferrer';
  titleLink.textContent = note.title || note.pageTitle || note.metadata?.title || 'Academic Snippet';
  headerLeft.appendChild(titleLink);

  // Meta row (Domain, Folder, Authors, Date)
  const metaSub = document.createElement('div');
  metaSub.className = 'note-meta';

  if (noteUrl && noteUrl !== '#') {
    try {
      const url = new URL(noteUrl);
      const domainSpan = document.createElement('span');
      domainSpan.className = 'note-domain';
      domainSpan.textContent = url.hostname;
      metaSub.appendChild(domainSpan);
    } catch(e) {}
  }

  // Folder Badge
  const folderBadge = document.createElement('span');
  folderBadge.className = 'note-folder-badge';
  folderBadge.textContent = `📁 ${note.folder || 'Inbox'}`;
  metaSub.appendChild(folderBadge);

  const authors = note.authors || note.metadata?.authors;
  if (Array.isArray(authors) && authors.length > 0) {
    const authorsSpan = document.createElement('span');
    authorsSpan.className = 'note-authors';
    authorsSpan.textContent = `by ${authors.join(', ')}`;
    metaSub.appendChild(authorsSpan);
  } else if (typeof authors === 'string' && authors.trim()) {
    const authorsSpan = document.createElement('span');
    authorsSpan.className = 'note-authors';
    authorsSpan.textContent = `by ${authors}`;
    metaSub.appendChild(authorsSpan);
  }

  const dateSpan = document.createElement('span');
  dateSpan.className = 'note-date';
  const dateVal = note.date || note.createdAt || note.timestamp;
  dateSpan.textContent = relativeTime(dateVal);
  metaSub.appendChild(dateSpan);

  headerLeft.appendChild(metaSub);
  headerRow.appendChild(headerLeft);

  // Kebab Menu (3 dots) on Top Right
  const kebabContainer = document.createElement('div');
  kebabContainer.className = 'kebab-container';

  const kebabBtn = document.createElement('button');
  kebabBtn.type = 'button';
  kebabBtn.className = 'kebab-btn';
  kebabBtn.title = 'Options & Actions';
  kebabBtn.innerHTML = '&#8942;'; // Vertical three dots ⋮

  const kebabDropdown = document.createElement('div');
  kebabDropdown.className = 'kebab-dropdown hidden';

  // Helper to add menu item
  const addItem = (icon, label, onClick, isDanger = false) => {
    const item = document.createElement('div');
    item.className = 'kebab-item' + (isDanger ? ' danger' : '');
    item.innerHTML = `<span>${icon}</span><span>${label}</span>`;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      kebabDropdown.classList.add('hidden');
      onClick();
    });
    kebabDropdown.appendChild(item);
  };

  addItem('📋', 'Copy Markdown (Obsidian)', () => {
    const text = window.AcademicNotes?.Obsidian?.generateCallout(note) || generateFallbackMD(note);
    copyToClipboard(text, 'Markdown copied!');
  });

  addItem('🚀', 'Send to Obsidian', () => {
    chrome.storage.local.get(['obsidianVault'], (res) => {
      const vault = res.obsidianVault || '';
      if (!vault) {
        const input = prompt('Please enter your Obsidian vault name:');
        if (input) {
          chrome.storage.local.set({ obsidianVault: input });
          sendToObsidian(note, input);
        }
      } else {
        sendToObsidian(note, vault);
      }
    });
  });

  addItem('📑', 'Copy BibTeX (Zotero)', () => {
    const text = window.AcademicNotes?.Zotero?.generateBibTeX(note) || 'No BibTeX utility found';
    copyToClipboard(text, 'BibTeX copied!');
  });

  addItem('📄', 'Copy RIS (Zotero)', () => {
    const text = window.AcademicNotes?.Zotero?.generateRIS(note) || 'No RIS utility found';
    copyToClipboard(text, 'RIS copied!');
  });

  // Divider
  const divider1 = document.createElement('div');
  divider1.className = 'kebab-divider';
  kebabDropdown.appendChild(divider1);

  // Folder selector row
  const folderRow = document.createElement('div');
  folderRow.className = 'kebab-folder-row';
  const folderRowLabel = document.createElement('span');
  folderRowLabel.textContent = '📁 Move to:';
  const folderSelect = document.createElement('select');
  folderSelect.className = 'kebab-folder-select';
  allFolders.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    if (note.folder === f || (!note.folder && f === 'Inbox')) {
      opt.selected = true;
    }
    folderSelect.appendChild(opt);
  });
  folderSelect.addEventListener('change', (e) => {
    e.stopPropagation();
    const newFolder = folderSelect.value;
    const updatedNote = { ...note, folder: newFolder };
    chrome.runtime.sendMessage({
      type: "UPDATE_NOTE",
      id: updatedNote.id,
      updates: updatedNote
    }, (res) => {
      if (res && res.success) {
        showToast(`Moved to ${newFolder}`);
        const index = allNotes.findIndex(n => n.id === note.id);
        if (index > -1) allNotes[index] = updatedNote;
        kebabDropdown.classList.add('hidden');
        applyFilters();
      }
    });
  });
  folderRow.append(folderRowLabel, folderSelect);
  kebabDropdown.appendChild(folderRow);

  // Divider
  const divider2 = document.createElement('div');
  divider2.className = 'kebab-divider';
  kebabDropdown.appendChild(divider2);

  addItem('✏️', 'Edit Note', () => toggleEdit(card, note));
  addItem('🗑️', 'Delete Note', () => confirmDelete(card, note.id), true);

  kebabBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close other dropdowns
    document.querySelectorAll('.kebab-dropdown').forEach(d => {
      if (d !== kebabDropdown) d.classList.add('hidden');
    });
    kebabDropdown.classList.toggle('hidden');
  });

  kebabContainer.appendChild(kebabBtn);
  kebabContainer.appendChild(kebabDropdown);
  headerRow.appendChild(kebabContainer);

  card.appendChild(headerRow);

  // Snippet preview (50 words max + ellipsis)
  const rawSnippet = note.content || note.text || '';
  const snippetQuote = document.createElement('blockquote');
  snippetQuote.className = 'note-snippet';
  snippetQuote.textContent = format50Words(rawSnippet);
  if (rawSnippet.trim().split(/\s+/).length > 50) {
    snippetQuote.title = 'Full snippet:\n' + rawSnippet;
  }
  card.appendChild(snippetQuote);

  // Tags
  if (note.tags && note.tags.length > 0) {
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'note-tags';
    note.tags.forEach(tag => {
      const tagPill = document.createElement('span');
      tagPill.className = 'tag-pill';
      tagPill.textContent = `#${tag}`;
      tagPill.addEventListener('click', () => {
        document.getElementById('filterSelect').value = `tag:${tag}`;
        applyFilters();
      });
      tagsDiv.appendChild(tagPill);
    });
    card.appendChild(tagsDiv);
  }

  // User Note
  if (note.userNote || note.userNotes) {
    const userNoteDiv = document.createElement('div');
    userNoteDiv.className = 'note-user';
    userNoteDiv.textContent = `💭 ${note.userNote || note.userNotes}`;
    card.appendChild(userNoteDiv);
  }

  return card;
}

function sendToObsidian(note, vaultName) {
  if (window.AcademicNotes?.Obsidian?.sendToObsidian) {
    window.AcademicNotes.Obsidian.sendToObsidian(note, vaultName);
  } else {
    showToast('Obsidian utility not loaded');
  }
}

function generateFallbackMD(note) {
  const content = note.content || note.text || '';
  const title = note.title || note.pageTitle || 'Untitled';
  const authors = note.authors ? (Array.isArray(note.authors) ? note.authors.join(', ') : note.authors) : '';
  return `> [!quote] ${title}\n> ${content}\n> \n> -- ${authors}`;
}

// Edit Mode
function toggleEdit(card, note) {
  if (card.querySelector('.edit-form')) return;

  const originalContent = Array.from(card.childNodes);
  while(card.firstChild) {
    card.removeChild(card.firstChild);
  }

  const form = document.createElement('div');
  form.className = 'edit-form';

  const userNoteLabel = document.createElement('label');
  userNoteLabel.textContent = 'User Note:';
  const userNoteInput = document.createElement('textarea');
  userNoteInput.value = note.userNote || note.userNotes || '';
  userNoteInput.rows = 3;

  const tagsLabel = document.createElement('label');
  tagsLabel.textContent = 'Tags (comma separated):';
  const tagsInput = document.createElement('input');
  tagsInput.type = 'text';
  tagsInput.value = (note.tags || []).join(', ');

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'edit-actions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'primary';
  saveBtn.textContent = 'Save';
  saveBtn.onclick = () => {
    const updatedNote = {
      ...note,
      userNote: userNoteInput.value,
      tags: tagsInput.value.split(',').map(t => t.trim()).filter(t => t)
    };
    
    chrome.runtime.sendMessage({
      type: "UPDATE_NOTE",
      id: updatedNote.id,
      updates: updatedNote
    }, (res) => {
      if (res && res.success) {
        showToast('Note updated');
        const index = allNotes.findIndex(n => n.id === note.id);
        if (index > -1) allNotes[index] = updatedNote;
        applyFilters();
      }
    });
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => {
    card.innerHTML = '';
    originalContent.forEach(node => card.appendChild(node));
  };

  actionsDiv.append(cancelBtn, saveBtn);
  form.append(userNoteLabel, userNoteInput, tagsLabel, tagsInput, actionsDiv);
  card.appendChild(form);
}

function confirmDelete(card, noteId) {
  const originalContent = Array.from(card.childNodes);
  card.innerHTML = '';
  
  const confirmBox = document.createElement('div');
  confirmBox.style.padding = '0.75rem';
  confirmBox.style.display = 'flex';
  confirmBox.style.alignItems = 'center';
  confirmBox.style.justifyContent = 'space-between';
  confirmBox.style.gap = '1rem';
  confirmBox.style.background = 'rgba(239, 68, 68, 0.08)';
  confirmBox.style.borderRadius = '6px';
  confirmBox.style.border = '1px solid var(--danger)';

  const msg = document.createElement('span');
  msg.textContent = 'Are you sure you want to delete this note?';
  msg.style.color = 'var(--danger)';
  msg.style.fontWeight = '500';
  msg.style.fontSize = '0.85rem';

  const btnsDiv = document.createElement('div');
  btnsDiv.style.display = 'flex';
  btnsDiv.style.gap = '0.5rem';

  const yesBtn = document.createElement('button');
  yesBtn.className = 'btn-danger';
  yesBtn.textContent = 'Yes, Delete';
  yesBtn.onclick = () => {
    chrome.runtime.sendMessage({ type: "DELETE_NOTE", id: noteId }, (res) => {
      if (res && res.success) {
        showToast('Note deleted');
        allNotes = allNotes.filter(n => n.id !== noteId);
        applyFilters();
      }
    });
  };

  const noBtn = document.createElement('button');
  noBtn.textContent = 'Cancel';
  noBtn.onclick = () => {
    card.innerHTML = '';
    originalContent.forEach(n => card.appendChild(n));
  };

  btnsDiv.append(noBtn, yesBtn);
  confirmBox.append(msg, btnsDiv);
  card.appendChild(confirmBox);
}

// Search and Filter
function populateFilters() {
  const filterSelect = document.getElementById('filterSelect');
  // keep first option
  while (filterSelect.options.length > 1) {
    filterSelect.remove(1);
  }

  const tags = new Set();
  const domains = new Set();

  allNotes.forEach(note => {
    if (note.tags) note.tags.forEach(t => tags.add(t));
    if (note.url) {
      try {
        const url = new URL(note.url);
        domains.add(url.hostname);
      } catch(e) {}
    }
  });

  if (tags.size > 0) {
    const group = document.createElement('optgroup');
    group.label = 'By Tag';
    [...tags].sort().forEach(tag => {
      const opt = document.createElement('option');
      opt.value = `tag:${tag}`;
      opt.textContent = `#${tag}`;
      group.appendChild(opt);
    });
    filterSelect.appendChild(group);
  }

  if (domains.size > 0) {
    const group = document.createElement('optgroup');
    group.label = 'By Source';
    [...domains].sort().forEach(domain => {
      const opt = document.createElement('option');
      opt.value = `domain:${domain}`;
      opt.textContent = domain;
      group.appendChild(opt);
    });
    filterSelect.appendChild(group);
  }
}

function applyFilters() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const filterVal = document.getElementById('filterSelect').value;

  filteredNotes = allNotes.filter(note => {
    // folder check
    if (currentFolder !== 'ALL') {
      const noteFolder = note.folder || 'Inbox';
      if (noteFolder !== currentFolder && !noteFolder.startsWith(currentFolder + '/')) {
        return false;
      }
    }

    // High-performance token search
    if (query) {
      if (note._searchTokens) {
        if (!note._searchTokens.includes(query)) return false;
      } else {
        const content = (note.content || note.text || '').toLowerCase();
        const title = (note.title || note.pageTitle || note.metadata?.title || '').toLowerCase();
        const userNote = (note.userNote || note.userNotes || '').toLowerCase();
        if (!content.includes(query) && !title.includes(query) && !userNote.includes(query)) {
          return false;
        }
      }
    }

    // dropdown filter
    if (filterVal === 'all') return true;
    
    if (filterVal.startsWith('tag:')) {
      const tag = filterVal.substring(4);
      return note.tags && note.tags.includes(tag);
    }
    
    if (filterVal.startsWith('domain:')) {
      const domain = filterVal.substring(7);
      if (!note.url) return false;
      try {
        const url = new URL(note.url);
        return url.hostname === domain;
      } catch(e) {
        return false;
      }
    }
    
    return true;
  });

  renderNotes(filteredNotes);
}

function setupEventListeners() {
  // Global click to close kebab dropdowns, context menu, and sidebar when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.kebab-container')) {
      document.querySelectorAll('.kebab-dropdown').forEach(d => d.classList.add('hidden'));
    }
    if (!e.target.closest('.explorer-context-menu')) {
      closeExplorerContextMenu();
    }
    if (window.innerWidth <= 768) {
      const sidebar = document.getElementById('sidebar');
      const toggle = document.getElementById('sidebarToggle');
      if (sidebar && sidebar.classList.contains('open') && 
          !sidebar.contains(e.target) && 
          !toggle.contains(e.target) && 
          !e.target.closest('#explorerContextMenu')) {
        sidebar.classList.remove('open');
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeExplorerContextMenu();
      document.querySelectorAll('.kebab-dropdown').forEach(d => d.classList.add('hidden'));
    }
  });

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', debounce(applyFilters, 250));
  
  const filterSelect = document.getElementById('filterSelect');
  filterSelect.addEventListener('change', applyFilters);

  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  sidebarToggle.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });

  // Right-click on sidebar background to create root folder
  sidebar.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.tree-row')) return;
    e.preventDefault();
    openExplorerContextMenu(e.clientX, e.clientY, null, null);
  });

  const addFolderBtn = document.getElementById('addFolderBtn');
  addFolderBtn.addEventListener('click', () => {
    const newFolder = prompt('Enter new folder name (use / for subfolders):');
    if (newFolder && newFolder.trim()) {
      addFolder(newFolder.trim());
    }
  });

  // Explorer Context Menu Item Clicks
  const explorerMenu = document.getElementById('explorerContextMenu');
  if (explorerMenu) {
    explorerMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.context-item');
      if (!item) return;
      const action = item.dataset.action;
      closeExplorerContextMenu();

      if (action === 'new-subfolder') {
        const subName = prompt(`Enter subfolder name inside "${contextFolderTarget}":`);
        if (subName && subName.trim()) {
          addFolder(`${contextFolderTarget}/${subName.trim()}`);
        }
      } else if (action === 'new-root-folder') {
        const rootName = prompt('Enter new folder name:');
        if (rootName && rootName.trim()) {
          addFolder(rootName.trim());
        }
      } else if (action === 'copy-path') {
        if (contextFolderTarget) {
          copyToClipboard(contextFolderTarget, 'Folder path copied!');
        }
      } else if (action === 'copy-name') {
        if (contextFolderName || contextFolderTarget) {
          copyToClipboard(contextFolderName || contextFolderTarget, 'Folder name copied!');
        }
      } else if (action === 'rename-folder') {
        if (contextFolderTarget && contextFolderTarget !== 'Inbox') {
          const newName = prompt(`Rename folder "${contextFolderTarget}" to:`, contextFolderTarget);
          if (newName && newName.trim() && newName.trim() !== contextFolderTarget) {
            renameFolder(contextFolderTarget, newName.trim());
          }
        }
      } else if (action === 'delete-folder') {
        if (contextFolderTarget && contextFolderTarget !== 'Inbox') {
          if (confirm(`Delete folder "${contextFolderTarget}" and its subfolders? Notes will be moved to Inbox.`)) {
            deleteFolder(contextFolderTarget);
          }
        }
      }
    });
  }

  // Exports
  const exportSqliteBtn = document.getElementById('exportSqliteBtn');
  if (exportSqliteBtn) {
    exportSqliteBtn.addEventListener('click', async () => {
      if (window.AcademicNotes?.DB) {
        try {
          showToast('Generating SQLite .db...');
          const binary = await window.AcademicNotes.DB.exportDatabaseBinary();
          const blob = new Blob([binary], { type: 'application/x-sqlite3' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'academic_notes.db';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('SQLite Database exported (.db)');
          return;
        } catch (e) {
          console.error('Failed to export SQLite db:', e);
        }
      }
      showToast('SQLite database is initializing...');
    });
  }

  document.getElementById('exportMdBtn').addEventListener('click', () => {
    if (!window.AcademicNotes?.Obsidian) return showToast('Obsidian utility not loaded');
    let md = '';
    allNotes.forEach(note => {
      md += window.AcademicNotes.Obsidian.generateNoteContent(note) + '\n\n---\n\n';
    });
    downloadFile('academic-notes.md', md, 'text/markdown');
  });

  document.getElementById('exportBibtexBtn').addEventListener('click', () => {
    if (!window.AcademicNotes?.Zotero) return showToast('Zotero utility not loaded');
    let bib = '';
    allNotes.forEach(note => {
      bib += window.AcademicNotes.Zotero.generateBibTeX(note) + '\n\n';
    });
    downloadFile('academic-notes.bib', bib, 'text/x-bibtex');
  });

  document.getElementById('exportRisBtn').addEventListener('click', () => {
    if (!window.AcademicNotes?.Zotero) return showToast('Zotero utility not loaded');
    let ris = '';
    allNotes.forEach(note => {
      ris += window.AcademicNotes.Zotero.generateRIS(note) + '\n\n';
    });
    downloadFile('academic-notes.ris', ris, 'application/x-research-info-systems');
  });

  document.getElementById('exportJsonBtn').addEventListener('click', () => {
    downloadFile('academic-notes.json', JSON.stringify(allNotes, null, 2), 'application/json');
  });

  const importFileInput = document.getElementById('importFileInput');
  document.getElementById('importJsonBtn').addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.db') || file.name.endsWith('.sqlite')) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const uint8 = new Uint8Array(ev.target.result);
          if (window.AcademicNotes?.DB) {
            await window.AcademicNotes.DB.importDatabaseBinary(uint8);
            showToast('SQLite Database restored successfully!');
            await loadFolders();
            await loadNotes();
          }
        } catch (err) {
          console.error('Failed to import SQLite db:', err);
          showToast('Failed to import SQLite .db file');
        }
      };
      reader.readAsArrayBuffer(file);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (Array.isArray(imported)) {
          chrome.runtime.sendMessage({ type: "IMPORT_NOTES", data: imported }, async (res) => {
            if (res && res.success) {
              showToast(`Imported ${imported.length} notes`);
              await loadFolders();
              await loadNotes();
            }
          });
        }
      } catch (err) {
        showToast('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  });
}

// Utilities
async function copyToClipboard(text, successMsg = 'Copied!') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMsg);
  } catch (err) {
    console.error('Failed to copy', err);
    showToast('Failed to copy');
  }
}

let toastTimeout;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden', 'fade-out');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 3000);
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function relativeTime(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  
  return date.toLocaleDateString();
}
