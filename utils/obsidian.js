window.AcademicNotes = window.AcademicNotes || {};

window.AcademicNotes.Obsidian = (function() {
  function escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/([\\`*_{}\[\]()#+\-.!|])/g, '\\$1');
  }

  return {
    generateCallout(note) {
      const colorMap = {
        yellow: 'warning',
        green: 'success',
        blue: 'info',
        purple: 'abstract',
        orange: 'attention'
      };
      const calloutType = colorMap[note.color] || 'quote';
      const lines = (note.content || '').split('\n');
      const quotedLines = lines.map(line => `> ${line}`).join('\n');
      
      let citation = '';
      if (note.authors && note.authors.length > 0) {
        citation += `— ${escapeMarkdown(note.authors[0])}`;
        if (note.authors.length > 1) citation += ' et al.';
      }
      if (note.journal) citation += `, *${escapeMarkdown(note.journal)}*`;
      if (note.pageUrl) citation += ` [Source](${note.pageUrl})`;
      
      let result = `> [!${calloutType}] ${escapeMarkdown(note.pageTitle || 'Snippet')}\n${quotedLines}`;
      if (citation) {
        result += `\n>\n> ${citation}`;
      }
      return result;
    },

    generateFrontmatter(note) {
      const authorsList = (note.authors || []).map(a => `  - "${a.replace(/"/g, '\\"')}"`).join('\n');
      const tagsList = (note.tags || []).map(t => `  - ${t}`).join('\n');
      
      let yaml = '---\n';
      yaml += `title: "${(note.pageTitle || '').replace(/"/g, '\\"')}"\n`;
      if (authorsList) {
        yaml += `authors:\n${authorsList}\n`;
      }
      if (note.journal) yaml += `source: "${note.journal.replace(/"/g, '\\"')}"\n`;
      if (note.doi) yaml += `doi: "${note.doi}"\n`;
      yaml += `url: "${note.pageUrl || ''}"\n`;
      yaml += `date_saved: "${note.createdAt || new Date().toISOString()}"\n`;
      if (tagsList) {
        yaml += `tags:\n${tagsList}\n`;
      }
      yaml += '---\n';
      return yaml;
    },

    generateFullNote(note) {
      const fm = this.generateFrontmatter(note);
      const title = `# ${escapeMarkdown(note.pageTitle || 'Academic Note')}\n\n`;
      const callout = this.generateCallout(note) + '\n\n';
      const userNote = note.userNote ? `## My Notes\n${note.userNote}\n` : '';
      
      return `${fm}\n${title}${callout}${userNote}`;
    },

    generateObsidianUri(note, vaultName) {
      const safeTitle = (note.pageTitle || 'Untitled Note').replace(/[\/\\?%*:|"<>]/g, '-');
      const content = this.generateFullNote(note);
      
      const uri = new URL('obsidian://new');
      if (vaultName) uri.searchParams.append('vault', vaultName);
      uri.searchParams.append('name', safeTitle);
      uri.searchParams.append('content', content);
      
      return uri.toString();
    }
  };
})();
