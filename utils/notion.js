/**
 * Academic Notes & Snippet Saver - Notion Integration Utility
 * Generates Notion-friendly Markdown callouts, block structures, and toggle lists.
 */

(() => {
  'use strict';

  window.AcademicNotes = window.AcademicNotes || {};

  const COLOR_EMOJIS = {
    yellow: '💡',
    green: '🌱',
    blue: '📘',
    purple: '🔮',
    orange: '⚡'
  };

  window.AcademicNotes.Notion = {
    /**
     * Generates a Notion-formatted Callout block
     * In Notion, pasting `> 💡 **Title**\n> Quote` automatically creates a Callout block
     */
    generateCallout(note) {
      const emoji = COLOR_EMOJIS[note.color] || '💡';
      const title = note.title || note.pageTitle || 'Untitled Academic Note';
      const content = (note.content || note.text || '').trim();
      const url = note.url || note.pageUrl || '';
      const authors = Array.isArray(note.authors) ? note.authors.join(', ') : (note.authors || '');
      const userNote = (note.userNote || note.userNotes || '').trim();
      const tags = Array.isArray(note.tags) ? note.tags.map(t => `#${t}`).join(' ') : '';

      const lines = [];
      lines.push(`> ${emoji} **[${title}](${url || '#'})**`);
      
      if (authors) {
        lines.push(`> *by ${authors}*`);
      }

      lines.push(`> `);
      
      // Indent content lines inside callout
      content.split('\n').forEach(line => {
        lines.push(`> "${line}"`);
      });

      if (userNote) {
        lines.push(`> `);
        lines.push(`> 💬 **Note:** *${userNote}*`);
      }

      if (tags) {
        lines.push(`> `);
        lines.push(`> 🏷️ ${tags}`);
      }

      return lines.join('\n');
    },

    /**
     * Generates a full Notion page in Markdown with Database Properties
     */
    generatePageContent(note) {
      const title = note.title || note.pageTitle || 'Untitled Academic Note';
      const content = (note.content || note.text || '').trim();
      const url = note.url || note.pageUrl || '';
      const authors = Array.isArray(note.authors) ? note.authors.join(', ') : (note.authors || '');
      const doi = note.doi || '';
      const journal = note.journal || '';
      const userNote = (note.userNote || note.userNotes || '').trim();
      const tags = Array.isArray(note.tags) ? note.tags.map(t => `#${t}`).join(' ') : '';
      const date = note.createdAt || note.date || note.timestamp || new Date().toISOString().split('T')[0];

      const lines = [];
      lines.push(`# ${title}`);
      lines.push('');
      lines.push('### 📋 Properties');
      lines.push(`- **URL:** [${url}](${url})`);
      if (authors) lines.push(`- **Authors:** ${authors}`);
      if (doi) lines.push(`- **DOI:** [${doi}](https://doi.org/${doi})`);
      if (journal) lines.push(`- **Journal/Source:** ${journal}`);
      lines.push(`- **Date Captured:** ${date}`);
      if (tags) lines.push(`- **Tags:** ${tags}`);
      lines.push('');
      lines.push('### 📌 Highlight');
      lines.push(this.generateCallout(note));
      
      if (userNote) {
        lines.push('');
        lines.push('### 💭 Personal Reflection & Commentary');
        lines.push(userNote);
      }

      return lines.join('\n');
    }
  };
})();
