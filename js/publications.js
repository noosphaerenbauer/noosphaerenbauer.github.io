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

    const markers = `${hasMarker(authorToken, coFirst) ? '<sup>*</sup>' : ''}${hasMarker(authorToken, coLast) ? '<sup>†</sup>' : ''}`;

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
  
  // Create a BibTeX toggle link (without the pre element)
  const bibtexId = `bibtex-${publication.id}`;
  const bibtexLinkHTML = publication.bibtex ? 
    `<a href="javascript:void(0)" onclick="toggleBibtex('${bibtexId}')">BibTeX</a>` : '';
  
  // Create the BibTeX content pre element separately
  const bibtexContentHTML = publication.bibtex ? 
    `<pre id="${bibtexId}" class="bibtex-content" style="display:none" onclick="selectAndCopyBibtex(event, '${bibtexId}')">${publication.bibtex}</pre>` : '';
  
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
