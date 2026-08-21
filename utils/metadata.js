window.AcademicNotes = window.AcademicNotes || {};

window.AcademicNotes.Metadata = (function() {
  function getMetaContent(name) {
    const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return meta ? meta.getAttribute('content') : null;
  }

  function getMetaContents(name) {
    const metas = document.querySelectorAll(`meta[name="${name}"], meta[property="${name}"]`);
    return Array.from(metas).map(m => m.getAttribute('content')).filter(Boolean);
  }

  return {
    extractMetadata() {
      const metadata = {
        title: getMetaContent('citation_title') || getMetaContent('DC.title') || getMetaContent('og:title') || document.title,
        authors: getMetaContents('citation_author').length ? getMetaContents('citation_author') :
                 getMetaContents('DC.creator').length ? getMetaContents('DC.creator') :
                 getMetaContents('article:author').length ? getMetaContents('article:author') :
                 getMetaContents('author'),
        doi: getMetaContent('citation_doi') || getMetaContent('DC.identifier') || '',
        journal: getMetaContent('citation_journal_title') || getMetaContent('DC.source') || getMetaContent('og:site_name') || '',
        publicationDate: getMetaContent('citation_date') || getMetaContent('DC.date') || getMetaContent('article:published_time') || '',
        pdfUrl: getMetaContent('citation_pdf_url') || '',
        abstract: getMetaContent('citation_abstract') || getMetaContent('DC.description') || getMetaContent('og:description') || getMetaContent('description') || ''
      };
      
      if (metadata.doi && metadata.doi.startsWith('doi:')) {
        metadata.doi = metadata.doi.replace('doi:', '').trim();
      }

      return metadata;
    },

    extractDomain(urlStr) {
      try {
        const url = new URL(urlStr);
        let domain = url.hostname;
        if (domain.startsWith('www.')) {
          domain = domain.substring(4);
        }
        return domain;
      } catch (e) {
        return '';
      }
    }
  };
})();
