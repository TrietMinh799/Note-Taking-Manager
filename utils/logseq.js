/**
 * Academic Notes & Snippet Saver - Logseq Integration Utility
 * Generates Logseq outliner blocks with page properties (::), wikilinks, and logseq:// links.
 */

(() => {
  'use strict';

  window.AcademicNotes = window.AcademicNotes || {};

  window.AcademicNotes.Logseq = {
    /**
     * Generates a Logseq block hierarchy with properties
     */
    generateBlock(note) {
      const title = note.title || note.pageTitle || 'Untitled Paper';
      const content = (note.content || note.text || '').trim();
      const url = note.url || note.pageUrl || '';
      const authors = Array.isArray(note.authors) 
        ? note.authors.map(a => `[[${a}]]`).join(', ') 
        : (note.authors ? `[[${note.authors}]]` : '');
      const doi = note.doi || '';
      const journal = note.journal || '';
      const userNote = (note.userNote || note.userNotes || '').trim();
      const tags = Array.isArray(note.tags) ? note.tags.map(t => `#[[${t}]]`).join(' ') : '';
      const date = note.createdAt || note.date || note.timestamp || new Date().toISOString().split('T')[0];

      const lines = [];
      lines.push(`- ### [[${title}]]`);
      lines.push(`  type:: #academic-note`);
      if (url) lines.push(`  url:: ${url}`);
      if (authors) lines.push(`  authors:: ${authors}`);
      if (doi) lines.push(`  doi:: https://doi.org/${doi}`);
      if (journal) lines.push(`  journal:: [[${journal}]]`);
      lines.push(`  date-captured:: [[${date}]]`);
      if (tags) lines.push(`  tags:: ${tags}`);
      
      // Highlight quote block
      lines.push(`  - > ${content.replace(/\n/g, '\n    > ')}`);
      
      if (userNote) {
        lines.push(`  - **My Notes:** ${userNote}`);
      }

      return lines.join('\n');
    },

    /**
     * Generates a Logseq deep link URI
     */
    generateLogseqUri(note, graphName = 'default') {
      const title = (note.title || note.pageTitle || 'Academic Note').replace(/[\/\\?%*:|"<>]/g, '-');
      const content = this.generateBlock(note);
      const uri = new URL('logseq://graph/' + encodeURIComponent(graphName));
      uri.searchParams.append('page', title);
      uri.searchParams.append('content', content);
      return uri.toString();
    }
  };
})();
