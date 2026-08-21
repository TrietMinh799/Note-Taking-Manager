window.AcademicNotes = window.AcademicNotes || {};

window.AcademicNotes.Zotero = (function() {
  function generateCiteKey(note) {
    let key = '';
    if (note.authors && note.authors.length > 0) {
      const firstAuthor = note.authors[0].split(',')[0].split(' ').pop().toLowerCase();
      key += firstAuthor;
    } else {
      key += 'unknown';
    }
    
    if (note.publicationDate) {
      const year = new Date(note.publicationDate).getFullYear();
      if (!isNaN(year)) key += year;
    }
    
    if (note.pageTitle) {
      const words = note.pageTitle.split(/[\s\-_]+/);
      const firstWord = words.find(w => w.length > 2) || words[0] || '';
      key += firstWord.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    return key || `note_${note.id || Date.now()}`;
  }

  return {
    generateBibTeX(note) {
      const type = note.doi || note.journal ? 'article' : 'misc';
      const key = generateCiteKey(note);
      
      let bib = `@${type}{${key},\n`;
      if (note.pageTitle) bib += `  title = {${note.pageTitle}},\n`;
      if (note.authors && note.authors.length > 0) {
        bib += `  author = {${note.authors.join(' and ')}},\n`;
      }
      if (note.journal) bib += `  journal = {${note.journal}},\n`;
      if (note.publicationDate) {
        const year = new Date(note.publicationDate).getFullYear();
        if (!isNaN(year)) bib += `  year = {${year}},\n`;
      }
      if (note.pageUrl) bib += `  url = {${note.pageUrl}},\n`;
      if (note.doi) bib += `  doi = {${note.doi}},\n`;
      if (note.content) bib += `  note = {Saved Snippet: ${note.content.replace(/[\n\r]+/g, ' ')}},\n`;
      
      bib = bib.replace(/,\n$/, '\n');
      bib += `}`;
      return bib;
    },

    generateRIS(note) {
      const lines = [];
      lines.push(`TY  - ${note.doi || note.journal ? 'JOUR' : 'GEN'}`);
      if (note.pageTitle) lines.push(`TI  - ${note.pageTitle}`);
      if (note.authors && note.authors.length > 0) {
        note.authors.forEach(a => lines.push(`AU  - ${a}`));
      }
      if (note.journal) lines.push(`JO  - ${note.journal}`);
      if (note.publicationDate) {
        const year = new Date(note.publicationDate).getFullYear();
        if (!isNaN(year)) lines.push(`PY  - ${year}`);
      }
      if (note.pageUrl) lines.push(`UR  - ${note.pageUrl}`);
      if (note.doi) lines.push(`DO  - ${note.doi}`);
      if (note.content) lines.push(`N1  - Saved Snippet: ${note.content.replace(/[\n\r]+/g, ' ')}`);
      if (note.userNote) lines.push(`N2  - User Note: ${note.userNote.replace(/[\n\r]+/g, ' ')}`);
      
      lines.push(`ER  - `);
      return lines.join('\n');
    },

    generateBibTeXBatch(notes) {
      return notes.map(n => this.generateBibTeX(n)).join('\n\n');
    },

    generateRISBatch(notes) {
      return notes.map(n => this.generateRIS(n)).join('\n\n');
    }
  };
})();
