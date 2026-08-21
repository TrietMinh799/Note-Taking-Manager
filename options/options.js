/**
 * Academic Notes & Snippet Saver - Options Script
 * Handles settings persistence, data export/import, storage metrics, and auto-save.
 */

'use strict';

// Default configuration constants
const SETTINGS_KEY = 'academic_settings';
const NOTES_KEY = 'academic_notes';

const DEFAULT_SETTINGS = {
  primaryApp: 'obsidian',
  obsidianVault: 'Notes',
  includeYamlFrontmatter: true,
  defaultColor: 'yellow',
  defaultTags: 'research, literature-review, citation',
  lastBackupDate: null
};

// State
let currentSettings = { ...DEFAULT_SETTINGS };
let saveDebounceTimer = null;
let toastTimeout = null;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializeOptions();
  } catch (error) {
    console.error('Error initializing options page:', error);
  }
});

/**
 * Main initialization
 */
async function initializeOptions() {
  bindFormInputs();
  bindActionButtons();

  await Promise.all([
    loadAndPopulateSettings(),
    refreshStorageStats()
  ]);
}

/**
 * Binds change and input events to all configuration inputs for debounced auto-save
 */
function bindFormInputs() {
  const primaryAppSelect = document.getElementById('primary-app');
  const vaultInput = document.getElementById('obsidian-vault');
  const yamlCheckbox = document.getElementById('include-yaml');
  const colorRadios = document.querySelectorAll('input[name="defaultColor"]');
  const defaultTagsInput = document.getElementById('default-tags');

  if (primaryAppSelect) {
    primaryAppSelect.addEventListener('change', scheduleAutoSave);
  }

  if (vaultInput) {
    vaultInput.addEventListener('input', scheduleAutoSave);
  }

  if (yamlCheckbox) {
    yamlCheckbox.addEventListener('change', scheduleAutoSave);
  }

  colorRadios.forEach(radio => {
    radio.addEventListener('change', scheduleAutoSave);
  });

  if (defaultTagsInput) {
    defaultTagsInput.addEventListener('input', scheduleAutoSave);
  }
}

/**
 * Binds click events to interactive action buttons
 */
function bindActionButtons() {
  const btnSaveManual = document.getElementById('btn-save-manual');
  const btnConfigureShortcuts = document.getElementById('btn-configure-shortcuts');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnImportJson = document.getElementById('btn-import-json');
  const importFileInput = document.getElementById('import-file-input');
  const btnClearNotes = document.getElementById('btn-clear-notes');
  const btnClearCancel = document.getElementById('btn-clear-cancel');
  const btnClearConfirm = document.getElementById('btn-clear-confirm');

  if (btnSaveManual) {
    btnSaveManual.addEventListener('click', async () => {
      await saveSettingsFromForm(true);
    });
  }

  if (btnConfigureShortcuts) {
    btnConfigureShortcuts.addEventListener('click', handleConfigureShortcuts);
  }

  if (btnExportJson) {
    btnExportJson.addEventListener('click', handleExportNotes);
  }

  if (btnImportJson && importFileInput) {
    btnImportJson.addEventListener('click', () => {
      importFileInput.value = '';
      importFileInput.click();
    });

    importFileInput.addEventListener('change', handleImportFileSelected);
  }

  if (btnClearNotes) {
    btnClearNotes.addEventListener('click', () => {
      toggleClearConfirmation(true);
    });
  }

  if (btnClearCancel) {
    btnClearCancel.addEventListener('click', () => {
      toggleClearConfirmation(false);
    });
  }

  if (btnClearConfirm) {
    btnClearConfirm.addEventListener('click', handleConfirmClearNotes);
  }
}

/**
 * Loads settings from chrome.storage.local and populates the form controls
 */
async function loadAndPopulateSettings() {
  try {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    currentSettings = { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] || {}) };

    // Primary App
    const primaryAppSelect = document.getElementById('primary-app');
    if (primaryAppSelect) {
      primaryAppSelect.value = currentSettings.primaryApp || 'obsidian';
    }

    // Vault Name
    const vaultInput = document.getElementById('obsidian-vault');
    if (vaultInput) {
      vaultInput.value = currentSettings.obsidianVault || '';
    }

    // YAML Frontmatter
    const yamlCheckbox = document.getElementById('include-yaml');
    if (yamlCheckbox) {
      yamlCheckbox.checked = Boolean(currentSettings.includeYamlFrontmatter);
    }

    // Default Color
    const selectedColor = currentSettings.defaultColor || 'yellow';
    const colorRadio = document.querySelector(`input[name="defaultColor"][value="${selectedColor}"]`);
    if (colorRadio) {
      colorRadio.checked = true;
    }

    // Default Tags
    const defaultTagsInput = document.getElementById('default-tags');
    if (defaultTagsInput) {
      defaultTagsInput.value = currentSettings.defaultTags || '';
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    showToast('Failed to load settings from storage.');
  }
}

/**
 * Schedules debounced auto-save
 */
function scheduleAutoSave() {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(async () => {
    await saveSettingsFromForm(false);
  }, 400);
}

/**
 * Reads form state and persists to chrome.storage.local
 * @param {boolean} showToastFlag 
 */
async function saveSettingsFromForm(showToastFlag = false) {
  try {
    const primaryAppSelect = document.getElementById('primary-app');
    const vaultInput = document.getElementById('obsidian-vault');
    const yamlCheckbox = document.getElementById('include-yaml');
    const checkedColorRadio = document.querySelector('input[name="defaultColor"]:checked');
    const defaultTagsInput = document.getElementById('default-tags');

    const updatedSettings = {
      ...currentSettings,
      primaryApp: primaryAppSelect ? primaryAppSelect.value : DEFAULT_SETTINGS.primaryApp,
      obsidianVault: vaultInput ? vaultInput.value.trim() : DEFAULT_SETTINGS.obsidianVault,
      includeYamlFrontmatter: yamlCheckbox ? yamlCheckbox.checked : DEFAULT_SETTINGS.includeYamlFrontmatter,
      defaultColor: checkedColorRadio ? checkedColorRadio.value : DEFAULT_SETTINGS.defaultColor,
      defaultTags: defaultTagsInput ? defaultTagsInput.value.trim() : DEFAULT_SETTINGS.defaultTags
    };

    await chrome.storage.local.set({ [SETTINGS_KEY]: updatedSettings });
    currentSettings = updatedSettings;

    // Show saved indicator in header
    showSaveStatusFeedback();

    if (showToastFlag) {
      showToast('Settings saved successfully!');
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    showToast('Error saving settings.');
  }
}

/**
 * Displays header auto-save confirmation pill
 */
function showSaveStatusFeedback() {
  const statusPill = document.getElementById('save-status');
  const statusText = document.getElementById('save-status-text');

  if (!statusPill) return;

  if (statusText) {
    statusText.textContent = 'All changes saved';
  }

  statusPill.classList.add('show');

  setTimeout(() => {
    statusPill.classList.remove('show');
  }, 2000);
}

/**
 * Calculates note count and local storage usage
 */
async function refreshStorageStats() {
  try {
    const noteCountEl = document.getElementById('stat-note-count');
    const storageSizeEl = document.getElementById('stat-storage-size');
    const lastBackupEl = document.getElementById('stat-last-backup');

    const data = await chrome.storage.local.get([NOTES_KEY, SETTINGS_KEY]);
    const notes = Array.isArray(data[NOTES_KEY]) ? data[NOTES_KEY] : [];
    const settings = data[SETTINGS_KEY] || {};

    // 1. Total notes
    if (noteCountEl) {
      noteCountEl.textContent = notes.length.toLocaleString();
    }

    // 2. Storage used in bytes
    let bytesUsed = 0;
    if (chrome.storage.local.getBytesInUse) {
      try {
        bytesUsed = await chrome.storage.local.getBytesInUse(null);
      } catch {
        bytesUsed = estimateStorageBytes(data);
      }
    } else {
      bytesUsed = estimateStorageBytes(data);
    }

    if (storageSizeEl) {
      storageSizeEl.textContent = formatBytes(bytesUsed);
    }

    // 3. Last backup date
    if (lastBackupEl) {
      const backupDate = settings.lastBackupDate || currentSettings.lastBackupDate;
      if (backupDate) {
        try {
          const date = new Date(backupDate);
          lastBackupEl.textContent = date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        } catch {
          lastBackupEl.textContent = 'Recently';
        }
      } else {
        lastBackupEl.textContent = 'Never';
      }
    }
  } catch (error) {
    console.error('Error refreshing storage stats:', error);
  }
}

/**
 * Estimates storage bytes when getBytesInUse is unavailable
 * @param {Object} data 
 * @returns {number}
 */
function estimateStorageBytes(data) {
  try {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  } catch {
    return 0;
  }
}

/**
 * Formats bytes into clean human readable string
 * @param {number} bytes 
 * @returns {string}
 */
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Handles exporting all saved notes as a JSON backup file
 */
async function handleExportNotes() {
  try {
    const data = await chrome.storage.local.get(NOTES_KEY);
    const notes = Array.isArray(data[NOTES_KEY]) ? data[NOTES_KEY] : [];

    if (notes.length === 0) {
      showToast('No notes to export.');
      return;
    }

    const jsonContent = JSON.stringify(notes, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `academic-notes-backup-${dateStr}.json`;

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    // Record last backup date in settings
    const nowIso = now.toISOString();
    currentSettings.lastBackupDate = nowIso;
    await chrome.storage.local.set({
      [SETTINGS_KEY]: { ...currentSettings, lastBackupDate: nowIso }
    });

    await refreshStorageStats();
    showToast(`Exported ${notes.length} notes successfully!`);
  } catch (error) {
    console.error('Failed to export notes:', error);
    showToast('Failed to export notes.');
  }
}

/**
 * Handles file selection for JSON import
 * @param {Event} event 
 */
async function handleImportFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await readFileAsText(file);
    let importedData = null;

    try {
      importedData = JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON file format.');
    }

    if (!Array.isArray(importedData)) {
      throw new Error('Imported JSON must be an array of notes.');
    }

    // Try background message first
    let importedCount = 0;
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'IMPORT_NOTES',
        data: importedData
      });

      if (response && response.success) {
        importedCount = response.count || importedData.length;
      }
    } catch (msgErr) {
      console.warn('IMPORT_NOTES message failed, merging in local storage:', msgErr);
    }

    // Direct merge fallback if message wasn't handled
    if (importedCount === 0) {
      const currentData = await chrome.storage.local.get(NOTES_KEY);
      const existingNotes = Array.isArray(currentData[NOTES_KEY]) ? currentData[NOTES_KEY] : [];
      const combined = [...importedData, ...existingNotes];

      // Deduplicate by ID
      const noteMap = new Map();
      for (const note of combined) {
        const id = note.id || crypto.randomUUID();
        if (!noteMap.has(id)) {
          noteMap.set(id, { ...note, id });
        }
      }

      const uniqueNotes = Array.from(noteMap.values());
      await chrome.storage.local.set({ [NOTES_KEY]: uniqueNotes });

      // Update badge
      if (chrome.action?.setBadgeText) {
        await chrome.action.setBadgeText({
          text: uniqueNotes.length > 0 ? uniqueNotes.length.toString() : ''
        });
      }
      importedCount = uniqueNotes.length;
    }

    await refreshStorageStats();
    showToast(`Successfully imported notes! (Total: ${importedCount})`);
  } catch (error) {
    console.error('Failed to import notes:', error);
    showToast(`Import failed: ${error.message || 'Unknown error'}`);
  } finally {
    event.target.value = '';
  }
}

/**
 * Promise wrapper around FileReader for text files
 * @param {File} file 
 * @returns {Promise<string>}
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

/**
 * Toggles the inline Clear All Notes confirmation box
 * @param {boolean} show 
 */
function showClearConfirmation(show) {
  const confirmBox = document.getElementById('clear-confirm-box');
  const btnClearNotes = document.getElementById('btn-clear-notes');

  if (confirmBox) {
    confirmBox.hidden = !show;
  }

  if (btnClearNotes) {
    btnClearNotes.disabled = show;
  }
}

/**
 * Handles confirmed deletion of all notes
 */
async function handleConfirmClearNotes() {
  try {
    await chrome.storage.local.set({ [NOTES_KEY]: [] });

    // Clear badge
    if (chrome.action?.setBadgeText) {
      await chrome.action.setBadgeText({ text: '' });
    }

    showClearConfirmation(false);
    await refreshStorageStats();
    showToast('All notes have been cleared.');
  } catch (error) {
    console.error('Failed to clear notes:', error);
    showToast('Failed to clear notes.');
  }
}

/**
 * Handles opening the browser shortcut configuration page
 */
async function handleConfigureShortcuts() {
  const shortcutsUrl = 'chrome://extensions/shortcuts';
  try {
    await chrome.tabs.create({ url: shortcutsUrl });
  } catch (error) {
    console.warn('Could not directly open shortcuts page:', error);
    showToast('Please open chrome://extensions/shortcuts in your address bar.');
  }
}

/**
 * Displays a non-intrusive bottom toast message
 * @param {string} message 
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toast.textContent = message;
  toast.hidden = false;

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.hidden = true;
    }, 300);
  }, 2800);
}
