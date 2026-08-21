/**
 * Academic Notes & Snippet Saver - EndNote & Mendeley Export Utility
 * Generates standardized EndNote (.enw) records.
 */

(() => {
  'use strict';

  window.AcademicNotes = window.AcademicNotes || {};

  window.AcademicNotes.EndNote = {
    /**
     * Generates a single EndNote (.enw) record
     */
    generateRecord(note) {
      const title = note.title || note.pageTitle || 'Untitled';
      const content = (note.content || note.text || '').trim();
      const url = note.url || note.pageUrl || '';
      const authors = Array.isArray(note.authors) ? note.authors : (note.authors ? [note.authors] : []);
      const doi = note.doi || '';
      const journal = note.journal || '';
      const tags = Array.isArray(note.tags) ? note.tags : [];
      const userNote = (note.userNote || note.userNotes || '').trim();
      
      let year = '';
      if (note.createdAt || note.date) {
        const d = new Date(note.createdAt || note.date);
        if (!isNaN(d.getFullYear())) year = d.getFullYear().toString();
      }

      const lines = [];
      lines.push('%0 Generic');
      lines.push(`%T ${title}`);
      
      authors.forEach(author => {
        if (author.trim()) lines.push(`%A ${author.trim()}`);
      });

      if (journal) lines.push(`%J ${journal}`);
      if (year) lines.push(`%D ${year}`);
      if (url) lines.push(`%U ${url}`);
      if (doi) lines.push(`%R ${doi}`);

      tags.forEach(tag => {
        if (tag.trim()) lines.push(`%K ${tag.trim()}`);
      });

      let notesField = `Quote: "${content}"`;
      if (userNote) notesField += `\nPersonal Note: ${userNote}`;
      lines.push(`%Z ${notesField.replace(/\n/g, ' ')}`);

      return lines.join('\n');
    },

    /**
     * Generates bulk EndNote file content
     */
    generateBatch(notes) {
      return notes.map(note => this.generateRecord(note)).join('\n\n');
    }
  };
})();
