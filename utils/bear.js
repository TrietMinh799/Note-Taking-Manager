/**
 * Academic Notes & Snippet Saver - Bear App Integration Utility
 * Generates Bear-flavored Markdown with tags and bear:// deep links.
 */

(() => {
  'use strict';

  window.AcademicNotes = window.AcademicNotes || {};

  window.AcademicNotes.Bear = {
    /**
     * Generates Bear-formatted Markdown
     */
    generateContent(note) {
      const title = note.title || note.pageTitle || 'Academic Note';
      const content = (note.content || note.text || '').trim();
      const url = note.url || note.pageUrl || '';
      const authors = Array.isArray(note.authors) ? note.authors.join(', ') : (note.authors || '');
      const userNote = (note.userNote || note.userNotes || '').trim();
      const tags = Array.isArray(note.tags) 
        ? note.tags.map(t => `#academic/${t.replace(/\s+/g, '_')}`).join(' ') 
        : '#academic/notes';

      const lines = [];
      lines.push(`# ${title}`);
      lines.push('');
      if (url) lines.push(`**Source:** [${url}](${url})`);
      if (authors) lines.push(`**Authors:** ${authors}`);
      lines.push('');
      lines.push(`> "${content}"`);
      
      if (userNote) {
        lines.push('');
        lines.push(`💭 **Note:** ${userNote}`);
      }

      lines.push('');
      lines.push(tags);

      return lines.join('\n');
    },

    /**
     * Generates bear:// create URI
     */
    generateBearUri(note) {
      const title = note.title || note.pageTitle || 'Academic Note';
      const text = this.generateContent(note);
      const tags = Array.isArray(note.tags) 
        ? note.tags.map(t => `academic/${t.replace(/\s+/g, '_')}`).join(',') 
        : 'academic/notes';

      const uri = new URL('bear://x-callback-url/create');
      uri.searchParams.append('title', title);
      uri.searchParams.append('text', text);
      uri.searchParams.append('tags', tags);
      return uri.toString();
    }
  };
})();
