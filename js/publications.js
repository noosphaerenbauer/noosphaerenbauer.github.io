// Function to render a single publication
async function renderPublication(publication) {
  // Check if tags exist, otherwise use empty array
  const tags = publication.tags || [];
  const tagsHTML = tags.map(tag => 
    `<span style="background-color:${getTagColor(tag)}">${tag}</span>`
  ).join('\n');

  // Combine regular tags and RTAI tags
  const allTagsHTML = tagsHTML;

  // Create author lookup maps if they don't exist
  if (!window.authorLookup) {
    window.authorLookup = new Map();
    window.authorNameLookup = new Map();
    if (typeof authorsData !== 'undefined' && authorsData.authors) {
      authorsData.authors.forEach(author => {
        window.authorLookup.set(author.id, author);
        window.authorNameLookup.set(author.name, author);
      });
    }
  }
  
  // Resolve author IDs to author objects
  // Add support for co-first (*) and co-last (†) author markings via optional arrays on publication
  const coFirst = Array.isArray(publication.coFirstAuthors) ? new Set(publication.coFirstAuthors) : new Set();
  const coLast = Array.isArray(publication.coLastAuthors) ? new Set(publication.coLastAuthors) : new Set();
  // New: core contributors (◦)
  const coreContrib = Array.isArray(publication.coreContributors) ? new Set(publication.coreContributors) : new Set();

  const hasMarker = (authorToken, set) => {
    if (set.size === 0) return false;
    if (set.has(authorToken)) return true;
    const author = window.authorLookup.get(authorToken) || window.authorNameLookup.get(authorToken);
    if (!author) return false;
    return set.has(author.id) || set.has(author.name);
  };

  const authorsHTML = publication.authors.map(authorToken => {
    // authorToken may be an author id (preferred) or a literal name in legacy entries
    const author = window.authorLookup.get(authorToken) || window.authorNameLookup.get(authorToken);

    const markers = [
      hasMarker(authorToken, coFirst) ? '<sup class="author-marker cofirst" aria-label="Shared lead author" title="Shared lead author">*</sup>' : '',
      hasMarker(authorToken, coLast) ? '<sup class="author-marker colast" aria-label="Shared advising" title="Shared advising">†</sup>' : '',
      hasMarker(authorToken, coreContrib) ? '<sup class="author-marker core" aria-label="Core contributor" title="Core contributor">◦</sup>' : ''
    ].join('');

    if (!author) {
      console.warn(`Author not found for token: ${authorToken}`);
      return authorToken + markers; // fallback to showing the token with markers if applicable
    }

    let nameHTML;
    if (author.isMe) {
      nameHTML = `<strong>${author.name}</strong>`;
    } else if (author.url) {
      nameHTML = `<a href="${author.url}">${author.name}</a>`;
    } else {
      nameHTML = author.name;
    }

    return nameHTML + markers;
  }).join(',\n');
  
  // Safely handle links
  const links = Array.isArray(publication.links) ? publication.links : [];
  const linksHTML = links.length > 0 ? 
    links.map(link => `<a href="${link.url}">${link.text}</a>`).join(' / ') : '';
  
  // Create a BibTeX toggle link (supports inline or lazy sources)
  const bibtexId = `bibtex-${publication.id}`;
  const hasInlineBibtex = Boolean(publication.bibtex && publication.bibtex.trim().length > 0);
  const provider = deriveBibtexProvider(publication);
  const hasAnyBibtex = hasInlineBibtex || Boolean(provider);
  const bibtexLinkHTML = hasAnyBibtex ? 
    `<a href="javascript:void(0)" onclick="loadAndShowBibtex('${bibtexId}', '${publication.id}')">BibTeX</a>` : '';
  
  // Create the BibTeX content pre element separately
  const initialContent = hasInlineBibtex ? publication.bibtex : '';
  const bibtexContentHTML = hasAnyBibtex ? 
    `<pre id="${bibtexId}" class="bibtex-content" style="display:none" onclick="selectAndCopyBibtex(event, '${bibtexId}')" data-loaded="${hasInlineBibtex ? 'true' : 'false'}">${initialContent}</pre>` : '';
  
  // Combine all links first (BibTeX link + other links)
  const combinedLinksHTML = bibtexLinkHTML + (linksHTML ? (bibtexLinkHTML ? ' / ' : '') + linksHTML : '');
  
  // Create the links section with the links on one line and the BibTeX content below them
  const linksSection = combinedLinksHTML ? 
    `<br>\n${combinedLinksHTML}\n${bibtexContentHTML}` : '';

  return `
    <div class="row common-rows">
      <div class="col-xs-12 col-sm-3 left-column">
          <img src="${publication.image}" alt="${publication.id}" class="paper-images">
      </div>
      <div class="col-xs-12 col-sm-9 right-column">
        ${allTagsHTML}
        <br>
        <a href="${publication.url}" id="${publication.id}">
          <papertitle>${publication.title}
          </papertitle>
        </a>
        <br>
        ${authorsHTML}.
        <br>
        <em>${publication.venue}</em>, ${publication.year}
        ${linksSection}
        <p>${publication.abstract}
        </p>
      </div>
    </div>
  `;
}

// Function to toggle BibTeX visibility
function toggleBibtex(id) {
  const bibtexElement = document.getElementById(id);
  if (bibtexElement.style.display === 'none') {
    bibtexElement.style.display = 'block';
  } else {
    bibtexElement.style.display = 'none';
  }
}

// Function to select and copy BibTeX text
function selectAndCopyBibtex(event, id) {
  event.stopPropagation(); // Prevent the click from triggering parent elements
  
  const bibtexElement = document.getElementById(id);
  const range = document.createRange();
  range.selectNodeContents(bibtexElement);
  
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  
  try {
    // Copy the selected text to clipboard
    document.execCommand('copy');
    
    // Visual feedback for copy
    const originalBgColor = bibtexElement.style.backgroundColor;
    bibtexElement.style.backgroundColor = '#e8f5e9'; // Light green for success
    
    setTimeout(() => {
      bibtexElement.style.backgroundColor = originalBgColor;
    }, 300);
    
    console.log('BibTeX copied to clipboard');
  } catch (err) {
    console.error('Failed to copy BibTeX: ', err);
  }
}

// Function to get color for tag
function getTagColor(tag) {
  const tagColors = {
    'Privacy & Security': '#b5ead7',
    'Evaluation': '#e2c7e5',
    'Robustness': '#ff9aa2',
    'Uncertainty': '#ffdac1',
    'Explainability': '#c7ceea',
    'Large-Scale ML': '#C9D3D8'
  };
  
  return tagColors[tag] || '#cccccc';
}

// Function to render all publications
async function renderPublications() {
  const publicationsContainer = document.getElementById('publications-container');
  if (!publicationsContainer) return;
  
  // Publications data comes from data/publications.js (already loaded in the page)
  if (typeof publicationsData === 'undefined') {
    console.error('Publications data not found. Make sure data/publications.js is loaded before this script.');
    return;
  }
  
  // Sort publications by year (descending)
  const publications = [...publicationsData].sort((a, b) => b.year - a.year);
  
  // Using Promise.all correctly to await all async renderPublication calls
  const publicationsHTMLArray = await Promise.all(publications.map(pub => renderPublication(pub)));
  publicationsContainer.innerHTML = publicationsHTMLArray.join('\n');
}

// Initialize when the DOM is loaded
window.addEventListener('DOMContentLoaded', function() {
  renderPublications();
});

// Helper: derive a BibTeX provider for a publication, preferring conferences/journals
function deriveBibtexProvider(publication) {
  const allUrls = [];
  if (publication.url) allUrls.push(publication.url);
  if (Array.isArray(publication.links)) {
    publication.links.forEach(l => { if (l && l.url) allUrls.push(l.url); });
  }

  // ACL Anthology direct .bib
  const acl = allUrls.find(u => /aclanthology\.org\//i.test(u));
  if (acl) {
    let bibUrl = acl.replace(/\/?$/, ''); // trim trailing slash
    if (!/\.bib$/i.test(bibUrl)) bibUrl = bibUrl + '.bib';
    return { type: 'directUrl', url: bibUrl, source: 'ACL' };
  }

  // CVF OpenAccess (ECCV/CVPR) – parse HTML and extract first <pre> with '@'
  const cvf = allUrls.find(u => /openaccess\.thecvf\.com/i.test(u));
  if (cvf) {
    return { type: 'htmlPre', url: cvf, source: 'CVF' };
  }

  // PMLR (CoLLAs, ICML workshops, etc.)
  const pmlr = allUrls.find(u => /proceedings\.mlr\.press\//i.test(u));
  if (pmlr) {
    return { type: 'htmlPre', url: pmlr, source: 'PMLR' };
  }

  // arXiv – derive bibtex endpoint from arXiv abs URL
  const arxivAbs = allUrls.find(u => /arxiv\.org\/abs\//i.test(u));
  if (arxivAbs) {
    const m = arxivAbs.match(/arxiv\.org\/abs\/([0-9]{4}\.[0-9]{4,5})(?:v\d+)?/i);
    if (m) {
      const bibUrl = `https://arxiv.org/bibtex/${m[1]}`;
      return { type: 'directUrl', url: bibUrl, source: 'arXiv' };
    }
  }

  return null;
}

// Helper: fetch BibTeX content given a provider
async function fetchBibtexFromProvider(provider) {
  try {
    const resp = await fetch(provider.url, { headers: { 'Accept': 'text/html, text/plain' } });
    const text = await resp.text();

    if (provider.type === 'directUrl') {
      return text.trim();
    }

    if (provider.type === 'htmlPre') {
      // Extract first <pre> block that looks like BibTeX
      const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch) {
        const content = preMatch[1]
          .replace(/<br\s*\/?>(\n)?/gi, '\n') // convert line breaks
          .replace(/<[^>]+>/g, '') // strip tags
          .trim();
        // If multiple PREs exist, this grabs the first; acceptable for CVF/PMLR pages
        return content;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch BibTeX from provider', provider, e);
  }
  return '';
}

// Lazy loader to toggle and, if necessary, fetch BibTeX
async function loadAndShowBibtex(bibtexId, publicationId) {
  const pre = document.getElementById(bibtexId);
  if (!pre) return;

  if (pre.dataset.loaded !== 'true') {
    // Try to find publication in global data by id
    const pub = (typeof publicationsData !== 'undefined') ? publicationsData.find(p => p.id === publicationId) : null;
    let content = '';
    if (pub && pub.bibtex && pub.bibtex.trim().length > 0) {
      content = pub.bibtex.trim();
    } else if (pub) {
      const provider = deriveBibtexProvider(pub);
      if (provider) {
        pre.textContent = 'Loading BibTeX...';
        content = await fetchBibtexFromProvider(provider);
      }
    }
    if (content) {
      pre.textContent = content;
      pre.dataset.loaded = 'true';
    } else {
      pre.textContent = 'BibTeX unavailable';
      pre.dataset.loaded = 'true';
    }
  }

  // Toggle visibility
  if (pre.style.display === 'none') {
    pre.style.display = 'block';
  } else {
    pre.style.display = 'none';
  }
}
