window.AcademicNotes = window.AcademicNotes || {};

window.AcademicNotes.Storage = (function() {
  const NOTES_KEY = 'academic_notes';
  const SETTINGS_KEY = 'academic_settings';

  const defaultSettings = {
    obsidianVault: 'Notes',
    defaultColor: 'yellow'
  };

  async function _get(key, defaultValue) {
    const result = await chrome.storage.local.get(key);
    return result[key] !== undefined ? result[key] : defaultValue;
  }

  async function _set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }

  return {
    async getAllNotes() {
      const notes = await _get(NOTES_KEY, []);
      return notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async saveNote(noteData) {
      const notes = await this.getAllNotes();
      const id = Date.now().toString();
      const createdAt = new Date().toISOString();
      const newNote = { ...noteData, id, createdAt };
      notes.push(newNote);
      await _set(NOTES_KEY, notes);
      return newNote;
    },

    async updateNote(id, updates) {
      const notes = await this.getAllNotes();
      const index = notes.findIndex(n => n.id === id);
      if (index !== -1) {
        notes[index] = { ...notes[index], ...updates };
        await _set(NOTES_KEY, notes);
        return notes[index];
      }
      return null;
    },

    async deleteNote(id) {
      const notes = await this.getAllNotes();
      const filtered = notes.filter(n => n.id !== id);
      await _set(NOTES_KEY, filtered);
    },

    async searchNotes(query) {
      if (!query) return await this.getAllNotes();
      const notes = await this.getAllNotes();
      const lowerQuery = query.toLowerCase();
      return notes.filter(note => {
        return (
          (note.content && note.content.toLowerCase().includes(lowerQuery)) ||
          (note.pageTitle && note.pageTitle.toLowerCase().includes(lowerQuery)) ||
          (note.authors && note.authors.some(a => a.toLowerCase().includes(lowerQuery))) ||
          (note.tags && note.tags.some(t => t.toLowerCase().includes(lowerQuery))) ||
          (note.userNote && note.userNote.toLowerCase().includes(lowerQuery))
        );
      });
    },

    async filterByTag(tag) {
      const notes = await this.getAllNotes();
      return notes.filter(note => note.tags && note.tags.includes(tag));
    },

    async filterBySource(sourceDomain) {
      const notes = await this.getAllNotes();
      return notes.filter(note => note.sourceDomain === sourceDomain);
    },

    async getSettings() {
      return await _get(SETTINGS_KEY, defaultSettings);
    },

    async saveSettings(settings) {
      await _set(SETTINGS_KEY, settings);
    },

    async exportAllNotes() {
      const notes = await this.getAllNotes();
      return JSON.stringify(notes, null, 2);
    },

    async importNotes(jsonString) {
      try {
        const imported = JSON.parse(jsonString);
        if (Array.isArray(imported)) {
          const current = await this.getAllNotes();
          const existingIds = new Set(current.map(n => n.id));
          const newNotes = imported.filter(n => !existingIds.has(n.id));
          const merged = [...current, ...newNotes];
          await _set(NOTES_KEY, merged);
          return newNotes.length;
        }
      } catch (e) {
        console.error("Import failed:", e);
      }
      return 0;
    }
  };
})();
