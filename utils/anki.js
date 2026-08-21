/**
 * Academic Notes & Snippet Saver - Anki Flashcard Utility
 * Generates Spaced Repetition flashcards and TSV deck export for Anki.
 */

(() => {
  'use strict';

  window.AcademicNotes = window.AcademicNotes || {};

  window.AcademicNotes.Anki = {
    /**
     * Generates a single Anki card object with formatted HTML front/back
     */
    generateCard(note) {
      const title = note.title || note.pageTitle || 'Academic Quote';
      const content = (note.content || note.text || '').trim();
      const url = note.url || note.pageUrl || '';
      const authors = Array.isArray(note.authors) ? note.authors.join(', ') : (note.authors || '');
      const userNote = (note.userNote || note.userNotes || '').trim();
      const tags = Array.isArray(note.tags) ? note.tags.join(' ') : (note.tags || 'academic-notes');

      // Front: Question / Source context
      let frontHtml = `<strong>${this.escapeHtml(title)}</strong>`;
      if (userNote) {
        frontHtml += `<br><br><em>Prompt:</em> ${this.escapeHtml(userNote)}`;
      } else {
        frontHtml += `<br><br><em>Key Academic Excerpt</em>`;
      }

      // Back: Highlighted quote + Citation citation details
      let backHtml = `<blockquote style="border-left: 3px solid #2563eb; padding-left: 10px; margin: 10px 0; color: #333;">${this.escapeHtml(content).replace(/\n/g, '<br>')}</blockquote>`;
      
      const citationParts = [];
      if (authors) citationParts.push(`<b>Author(s):</b> ${this.escapeHtml(authors)}`);
      if (url) citationParts.push(`<a href="${this.escapeHtml(url)}">Source Link</a>`);
      
      if (citationParts.length > 0) {
        backHtml += `<div style="font-size: 0.85em; color: #666; margin-top: 8px;">${citationParts.join(' | ')}</div>`;
      }

      // TSV line: Front \t Back \t Tags
      const cleanFront = frontHtml.replace(/\t/g, ' ').replace(/\n/g, '<br>');
      const cleanBack = backHtml.replace(/\t/g, ' ').replace(/\n/g, '<br>');
      const cleanTags = tags.replace(/\t/g, ' ').replace(/\n/g, ' ');

      const tsvLine = `${cleanFront}\t${cleanBack}\t${cleanTags}`;

      return {
        front: frontHtml,
        back: backHtml,
        tags: cleanTags,
        tsv: tsvLine
      };
    },

    /**
     * Generates a bulk TSV file formatted for direct import into Anki
     */
    generateDeckTSV(notes) {
      const headers = [
        '#separator:tab',
        '#html:true',
        '#tags column:3',
        ''
      ];

      const lines = notes.map(note => this.generateCard(note).tsv);
      return headers.concat(lines).join('\n');
    },

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };
})();
