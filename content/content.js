/**
 * Academic Notes & Snippet Saver - Content Script
 * Injected into all web pages to handle text selection, metadata extraction,
 * and presenting the quick save UI.
 */

(function () {
  'use strict';

  // State
  let selectedText = '';
  let selectionRect = null;
  let shadowRoot = null;
  let uiContainer = null;
  let isUnlockActive = false;
  
  const UNLOCK_STYLE_ID = 'academic-notes-force-unlock-style';

  // Initialize
  function init() {
    createShadowDOM();
    setupSelectionListeners();
    setupMessageListeners();
  }

  // Create Shadow DOM to isolate styles
  function createShadowDOM() {
    uiContainer = document.createElement('div');
    uiContainer.id = 'academic-notes-ui-root';
    // Position outside normal flow
    uiContainer.style.position = 'absolute';
    uiContainer.style.top = '0';
    uiContainer.style.left = '0';
    uiContainer.style.width = '100%';
    uiContainer.style.height = '100%';
    uiContainer.style.pointerEvents = 'none'; // Let clicks pass through by default
    uiContainer.style.zIndex = '2147483647'; // Max z-index
    
    document.body.appendChild(uiContainer);
    
    shadowRoot = uiContainer.attachShadow({ mode: 'closed' });
    
    // Inject styles into Shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      :host {
        --primary: #4f46e5;
        --primary-hover: #4338ca;
        --surface: #ffffff;
        --text: #1f2937;
        --text-light: #6b7280;
        --border: #e5e7eb;
        --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        --radius: 8px;
        --error: #ef4444;
        --success: #10b981;
      }
      
      @media (prefers-color-scheme: dark) {
        :host {
          --surface: #1f2937;
          --text: #f9fafb;
          --text-light: #9ca3af;
          --border: #374151;
        }
      }

      * { box-sizing: border-box; }

      .fab {
        position: absolute;
        background-color: var(--primary);
        color: white;
        border: none;
        border-radius: 22px;
        padding: 0 16px;
        height: 44px; /* Minimum touch target */
        min-width: 44px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: var(--shadow);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        pointer-events: auto;
        transform: translate(-50%, -100%);
        margin-top: -10px;
        z-index: 1000;
        transition: transform 0.2s, opacity 0.2s;
      }
      
      .fab:hover {
        background-color: var(--primary-hover);
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        z-index: 2000;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .modal {
        background: var(--surface);
        color: var(--text);
        width: 90%;
        max-width: 400px;
        border-radius: var(--radius);
        padding: 20px;
        box-shadow: var(--shadow-lg);
        font-family: system-ui, -apple-system, sans-serif;
        transform: translateY(20px);
        transition: transform 0.2s;
        max-height: 90vh;
        overflow-y: auto;
      }
      
      .modal-overlay.open {
        opacity: 1;
      }
      
      .modal-overlay.open .modal {
        transform: translateY(0);
      }

      @media (max-width: 768px) {
        .modal-overlay {
          align-items: flex-end;
        }
        .modal {
          width: 100%;
          max-width: 100%;
          border-radius: 16px 16px 0 0;
          transform: translateY(100%);
        }
      }

      .modal-header {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
      }

      .preview-text {
        font-style: italic;
        color: var(--text-light);
        margin-bottom: 16px;
        font-size: 14px;
        border-left: 3px solid var(--primary);
        padding-left: 10px;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .metadata-preview {
        font-size: 12px;
        color: var(--text-light);
        margin-bottom: 16px;
      }

      .input-group {
        margin-bottom: 16px;
      }

      .input-group label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 4px;
        color: var(--text-light);
      }

      .input-group input, .input-group textarea {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: transparent;
        color: var(--text);
        font-family: inherit;
        font-size: 14px;
      }
      
      .input-group textarea {
        resize: vertical;
        min-height: 60px;
      }

      .input-group input:focus, .input-group textarea:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
      }

      .color-picker {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
      }

      .color-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        padding: 0;
      }
      
      .color-btn.selected {
        border-color: var(--text);
        transform: scale(1.1);
      }
      
      .color-yellow { background-color: #fef08a; }
      .color-green { background-color: #bbf7d0; }
      .color-blue { background-color: #bfdbfe; }
      .color-purple { background-color: #e9d5ff; }
      .color-orange { background-color: #fed7aa; }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      .btn {
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        min-height: 44px; /* Mobile touch target */
      }

      .btn-cancel {
        background: transparent;
        color: var(--text);
        border: 1px solid var(--border);
      }

      .btn-save {
        background: var(--primary);
        color: white;
      }

      .toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: var(--success);
        color: white;
        padding: 12px 24px;
        border-radius: var(--radius);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: var(--shadow-lg);
        pointer-events: none;
        z-index: 3000;
        transform: translateY(100px);
        opacity: 0;
        transition: transform 0.3s, opacity 0.3s;
      }

      .toast.show {
        transform: translateY(0);
        opacity: 1;
      }

      @media (max-width: 768px) {
        .toast {
          left: 24px;
          right: 24px;
          bottom: 24px;
          text-align: center;
        }
      }
    `;
    shadowRoot.appendChild(style);
  }

  // Handle selection events
  function setupSelectionListeners() {
    document.addEventListener('mouseup', handleSelectionEnd);
    document.addEventListener('touchend', handleSelectionEnd);
    document.addEventListener('mousedown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction, { passive: true });
    
    // Listen to scroll to reposition or hide FAB
    document.addEventListener('scroll', () => {
      // Simplest approach: hide FAB on scroll to avoid complex repositioning
      removeFAB();
    }, { passive: true });
  }
  
  function handleInteraction(e) {
    // If click is outside our shadow DOM, try to clean up FAB if selection is empty
    if (e.target !== uiContainer) {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim() === '') {
          removeFAB();
        }
      }, 10);
    }
  }

  function handleSelectionEnd(e) {
    // Don't trigger if interacting with our own UI
    if (e.target === uiContainer) return;
    
    // Give browser time to update selection
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      
      if (text.length > 0) {
        selectedText = text;
        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        if (rects.length > 0) {
          // Use the last rect where selection ended (near cursor/touch)
          selectionRect = rects[rects.length - 1];
        } else {
          selectionRect = range.getBoundingClientRect();
        }
        
        showFAB();
      } else {
        removeFAB();
      }
    });
  }

  function showFAB() {
    removeFAB(); // Ensure only one exists
    
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.id = 'academic-notes-fab';
    
    // Detect mobile for icon-only button
    const isMobile = window.matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window);
    
    const iconSpan = document.createElement('span');
    iconSpan.textContent = '📌';
    fab.appendChild(iconSpan);
    
    if (!isMobile) {
      const textSpan = document.createElement('span');
      textSpan.textContent = 'Save';
      fab.appendChild(textSpan);
    }
    
    // Calculate position (absolute relative to document)
    const top = selectionRect.top + window.scrollY;
    const left = selectionRect.left + (selectionRect.width / 2) + window.scrollX;
    
    fab.style.top = Math.max(top, 10) + 'px';
    fab.style.left = left + 'px';
    
    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFAB();
      showQuickSaveModal();
    });
    
    shadowRoot.appendChild(fab);
  }

  function removeFAB() {
    const existing = shadowRoot.getElementById('academic-notes-fab');
    if (existing) {
      existing.remove();
    }
  }

  function showQuickSaveModal() {
    const metadata = extractMetadata();
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    // Prevent clicks inside modal from closing it
    modal.addEventListener('click', e => e.stopPropagation());
    
    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.textContent = 'Save Snippet';
    modal.appendChild(header);
    
    // Preview Text
    const previewText = document.createElement('div');
    previewText.className = 'preview-text';
    previewText.textContent = selectedText.length > 200 ? selectedText.substring(0, 200) + '...' : selectedText;
    modal.appendChild(previewText);
    
    // Metadata preview
    const metaPreview = document.createElement('div');
    metaPreview.className = 'metadata-preview';
    metaPreview.textContent = `From: ${metadata.title} (${metadata.domain})`;
    modal.appendChild(metaPreview);
    
    // Notes input
    const noteGroup = document.createElement('div');
    noteGroup.className = 'input-group';
    const noteLabel = document.createElement('label');
    noteLabel.textContent = 'Notes (optional)';
    const noteInput = document.createElement('textarea');
    noteInput.placeholder = 'Add your thoughts...';
    noteGroup.appendChild(noteLabel);
    noteGroup.appendChild(noteInput);
    modal.appendChild(noteGroup);
    
    // Folder input
    const folderGroup = document.createElement('div');
    folderGroup.className = 'input-group';
    const folderLabel = document.createElement('label');
    folderLabel.textContent = 'Folder';
    const folderSelect = document.createElement('select');
    folderSelect.style.width = '100%';
    folderSelect.style.padding = '8px 12px';
    folderSelect.style.border = '1px solid var(--border)';
    folderSelect.style.borderRadius = '6px';
    folderSelect.style.background = 'transparent';
    folderSelect.style.color = 'var(--text)';
    folderSelect.style.fontFamily = 'inherit';
    folderSelect.style.fontSize = '14px';
    
    // Fetch folders
    chrome.runtime.sendMessage({ type: 'GET_FOLDERS' }, (res) => {
      if (res && res.success && res.folders) {
        res.folders.forEach(folder => {
          const opt = document.createElement('option');
          opt.value = folder;
          opt.textContent = folder;
          if (folder === 'Inbox') opt.selected = true;
          folderSelect.appendChild(opt);
        });
      } else {
        const opt = document.createElement('option');
        opt.value = 'Inbox';
        opt.textContent = 'Inbox';
        folderSelect.appendChild(opt);
      }
    });

    folderGroup.appendChild(folderLabel);
    folderGroup.appendChild(folderSelect);
    modal.appendChild(folderGroup);
    
    // Tags input
    const tagsGroup = document.createElement('div');
    tagsGroup.className = 'input-group';
    const tagsLabel = document.createElement('label');
    tagsLabel.textContent = 'Tags (comma separated)';
    const tagsInput = document.createElement('input');
    tagsInput.type = 'text';
    tagsInput.placeholder = 'e.g., theory, methodology, important';
    tagsGroup.appendChild(tagsLabel);
    tagsGroup.appendChild(tagsInput);
    modal.appendChild(tagsGroup);
    
    // Color picker
    const colorGroup = document.createElement('div');
    colorGroup.className = 'input-group';
    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Highlight Color';
    colorGroup.appendChild(colorLabel);
    
    const colorPicker = document.createElement('div');
    colorPicker.className = 'color-picker';
    
    const colors = ['yellow', 'green', 'blue', 'purple', 'orange'];
    let selectedColor = 'yellow';
    
    colors.forEach(color => {
      const btn = document.createElement('button');
      btn.className = `color-btn color-${color} ${color === selectedColor ? 'selected' : ''}`;
      btn.title = color;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Remove selected from all
        colorPicker.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedColor = color;
      });
      colorPicker.appendChild(btn);
    });
    colorGroup.appendChild(colorPicker);
    modal.appendChild(colorGroup);
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'actions';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => closeOverlay(overlay));
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      
      const noteData = {
        text: selectedText,
        metadata: metadata,
        userNotes: noteInput.value.trim(),
        tags: tagsInput.value.split(',').map(t => t.trim()).filter(t => t),
        folder: folderSelect.value || 'Inbox',
        color: selectedColor,
        timestamp: new Date().toISOString()
      };
      
      try {
        await chrome.runtime.sendMessage({
          type: 'SAVE_NOTE',
          data: noteData
        });
        
        closeOverlay(overlay);
        showToast('✓ Snippet saved!');
        
        // Clear native selection
        window.getSelection().removeAllRanges();
      } catch (err) {
        console.error('Failed to save note:', err);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
        alert('Failed to save. Extension might be reloaded.');
      }
    });
    
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    modal.appendChild(actions);
    
    overlay.appendChild(modal);
    shadowRoot.appendChild(overlay);
    
    // Close on background click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay(overlay);
    });
    
    // Trigger animation
    requestAnimationFrame(() => {
      overlay.classList.add('open');
    });
  }

  function closeOverlay(overlay) {
    overlay.classList.remove('open');
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 200);
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    shadowRoot.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
      }, 2000);
    });
  }

  // --- Metadata Extraction ---
  function extractMetadata() {
    let currentUrl = window.location.href;
    
    // Check if inside PDF viewer or iframe with query params
    try {
      if (window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const fileParam = urlParams.get('file') || urlParams.get('src') || urlParams.get('url');
        if (fileParam && (fileParam.startsWith('http://') || fileParam.startsWith('https://') || fileParam.startsWith('file:///'))) {
          currentUrl = decodeURIComponent(fileParam);
        }
      }
    } catch(e) {}

    // Check embedded or iframe elements
    if (currentUrl.startsWith('chrome-extension://') || currentUrl.startsWith('edge-extension://') || currentUrl.startsWith('moz-extension://') || currentUrl.startsWith('extension://')) {
      const match = currentUrl.match(/(https?:\/\/[^\s"'<>]+|file:\/\/\/[^\s"'<>]+)/i);
      if (match) {
        currentUrl = decodeURIComponent(match[1]);
      } else {
        const embed = document.querySelector('embed[src], iframe[src]');
        if (embed && embed.src && !embed.src.startsWith('chrome-extension://') && !embed.src.startsWith('extension://')) {
          currentUrl = embed.src;
        } else {
          try {
            if (window.top && window.top.location && window.top.location.href) {
              const topUrl = window.top.location.href;
              if (topUrl && !topUrl.startsWith('chrome-extension://') && !topUrl.startsWith('extension://')) {
                currentUrl = topUrl;
              }
            }
          } catch(e) {}
          if (currentUrl.startsWith('extension://') || currentUrl.startsWith('chrome-extension://')) {
             if (document.referrer && (document.referrer.startsWith('http') || document.referrer.startsWith('file'))) {
               currentUrl = document.referrer;
             }
          }
        }
      }
    }

    let currentDomain = '';
    try {
      if (currentUrl.startsWith('file:///')) {
        currentDomain = 'Local PDF File';
      } else {
        currentDomain = new URL(currentUrl).hostname;
      }
    } catch (e) {
      currentDomain = window.location.hostname || '';
    }

    const meta = {
      title: document.title || '',
      url: currentUrl,
      referrer: document.referrer || '',
      domain: currentDomain,
      authors: [],
      doi: '',
      siteName: '',
      publicationDate: ''
    };

    try {
      // Title fallbacks
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const citationTitle = document.querySelector('meta[name="citation_title"]');
      if (citationTitle) meta.title = citationTitle.getAttribute('content') || meta.title;
      else if (ogTitle) meta.title = ogTitle.getAttribute('content') || meta.title;

      // Site name
      const ogSiteName = document.querySelector('meta[property="og:site_name"]');
      if (ogSiteName) meta.siteName = ogSiteName.getAttribute('content') || '';

      // Authors
      const citationAuthors = document.querySelectorAll('meta[name="citation_author"]');
      if (citationAuthors.length > 0) {
        citationAuthors.forEach(node => {
          const content = node.getAttribute('content');
          if (content) meta.authors.push(content);
        });
      } else {
        const articleAuthor = document.querySelector('meta[property="article:author"]');
        if (articleAuthor) {
          const content = articleAuthor.getAttribute('content');
          if (content) meta.authors.push(content);
        }
      }

      // DOI
      const citationDoi = document.querySelector('meta[name="citation_doi"]');
      if (citationDoi) meta.doi = citationDoi.getAttribute('content') || '';

      // Date
      const citationDate = document.querySelector('meta[name="citation_publication_date"]');
      if (citationDate) meta.publicationDate = citationDate.getAttribute('content') || '';
    } catch (e) {
      console.warn('Academic Notes: Error extracting metadata', e);
    }

    return meta;
  }

  // --- Force Unlock Functionality ---
  
  // Handlers for preventing default block behaviors
  const preventBlockHandler = (e) => {
    e.stopPropagation();
  };

  function toggleForceUnlock(active) {
    isUnlockActive = active;
    
    if (active) {
      // Inject CSS
      let styleEl = document.getElementById(UNLOCK_STYLE_ID);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = UNLOCK_STYLE_ID;
        styleEl.textContent = `
          * {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            pointer-events: auto !important;
          }
          ::selection {
            background-color: rgba(37, 99, 235, 0.4) !important;
            color: inherit !important;
          }
          /* PDF.js / Academic PDF Text Layer specific overrides */
          .textLayer, .textLayer > span, .textLayer > div, [class*="textLayer"], [class*="TextLayer"], [data-text-layer="true"] {
            opacity: 1 !important;
            pointer-events: auto !important;
            user-select: text !important;
            -webkit-user-select: text !important;
            display: block !important;
            visibility: visible !important;
            cursor: text !important;
            z-index: 999 !important;
          }
          .canvasWrapper, canvas {
            pointer-events: auto !important;
          }
          /* Neutralize invisible shields/overlays blocking click & drag */
          .protect-overlay, .shield, .no-copy, .disable-select, .watermark-shield, .copy-shield, [class*="shield"], [class*="unselectable"] {
            pointer-events: none !important;
            display: none !important;
          }
        `;
        document.head.appendChild(styleEl);
      }

      // Neutralize inline handler attributes
      try {
        window.oncopy = null;
        window.onselectstart = null;
        window.oncontextmenu = null;
        document.oncopy = null;
        document.onselectstart = null;
        document.oncontextmenu = null;
        if (document.body) {
          document.body.oncopy = null;
          document.body.onselectstart = null;
          document.body.oncontextmenu = null;
        }
      } catch (e) {}

      // Strip inline user-select: none
      try {
        document.querySelectorAll('*').forEach(el => {
          if (el.style && (el.style.userSelect === 'none' || el.style.webkitUserSelect === 'none')) {
            el.style.userSelect = 'text';
            el.style.webkitUserSelect = 'text';
          }
        });
      } catch (e) {}
      
      // Add event blockers (capture phase)
      document.addEventListener('copy', preventBlockHandler, true);
      document.addEventListener('selectstart', preventBlockHandler, true);
      document.addEventListener('contextmenu', preventBlockHandler, true);
      
      showUnlockIndicator(true);
    } else {
      // Remove CSS
      const styleEl = document.getElementById(UNLOCK_STYLE_ID);
      if (styleEl) styleEl.remove();
      
      // Remove event blockers
      document.removeEventListener('copy', preventBlockHandler, true);
      document.removeEventListener('selectstart', preventBlockHandler, true);
      document.removeEventListener('contextmenu', preventBlockHandler, true);
      
      showUnlockIndicator(false);
    }
  }

  function showUnlockIndicator(show) {
    const existing = document.getElementById('academic-notes-unlock-indicator');
    if (existing) {
      existing.remove();
    }
    
    if (show) {
      const banner = document.createElement('div');
      banner.id = 'academic-notes-unlock-indicator';
      banner.className = 'academic-notes-unlock-indicator';
      banner.textContent = '🔓 Text selection unlocked';
      document.body.appendChild(banner);
    }
  }

  // --- Message Handling ---
  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TOGGLE_UNLOCK') {
        const active = message.enabled !== undefined ? message.enabled : (message.data ? message.data.active : true);
        toggleForceUnlock(active);
        sendResponse({ success: true, enabled: active });
        return true;
      }
    });
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
