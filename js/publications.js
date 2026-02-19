let currentPublicationView = 'date';

const TOPIC_DEFINITIONS = [
  {
    id: 'data-curation',
    label: 'Data Curation',
    goal: 'Build higher-quality datasets and curation pipelines for training and evaluation.'
  },
  {
    id: 'scaling-rl',
    label: 'Scaling RL',
    goal: 'Scale supervision and reasoning with reinforcement-learning-based training signals.'
  },
  {
    id: 'science-of-benchmarking',
    label: 'Science of Benchmarking',
    goal: 'Design robust benchmarks that measure genuine capability and progress.'
  },
  {
    id: 'forecasting',
    label: 'Forecasting',
    goal: 'Predict future outcomes from open-ended evidence and model-generated reasoning.'
  },
  {
    id: 'continual-learning',
    label: 'Continual Learning',
    goal: 'Enable continuous adaptation without catastrophic forgetting.'
  },
  {
    id: 'unlearning',
    label: 'Unlearning',
    goal: 'Remove harmful or outdated information while preserving useful capabilities.'
  },
  {
    id: 'robustness-safety',
    label: 'Robustness and Safety',
    goal: 'Stress-test model behavior and improve safety under realistic failure modes.'
  },
  {
    id: 'other',
    label: 'Other Topics',
    goal: 'Additional work that does not fit the main topic buckets above.'
  }
];

const TOPIC_OVERRIDES = {
  chandak2025openended: ['forecasting'],
  shashwat2025oversight: ['scaling-rl'],
  struber2025beliefupdates: ['scaling-rl'],
  chandak2025answermatch: ['scaling-rl'],

  condareport2024: ['data-curation'],
  pretrainingguide2024: ['data-curation'],
  schuhmann2025alexandria: ['data-curation'],
  thaddaeus2025clipfreq: ['data-curation'],

  ghosh2024onebench: ['science-of-benchmarking'],
  prabhu2024randumb: ['science-of-benchmarking'],
  udandarao2024zeroshot: ['science-of-benchmarking'],
  mckenzie2023inversescaling: ['science-of-benchmarking'],
  zverev2025vggsounder: ['science-of-benchmarking'],
  harmon2025forgetting: ['science-of-benchmarking'],
  press2024citeme: ['science-of-benchmarking'],

  prabhu2023budgeted: ['continual-learning'],
  ghunaim2023realtime: ['continual-learning'],
  rubinstein2025ocl: ['continual-learning'],
  rubinstein2025slotstomasks: ['continual-learning'],
  prabhu2023noc: ['continual-learning'],
  hammoud2023rapidadaptation: ['continual-learning'],
  prabhu2023acm: ['continual-learning'],
  munagala2022clactive: ['continual-learning'],
  karthik2021nocost: ['continual-learning'],
  karthik2020mot: ['continual-learning'],
  prabhu2020gdumb: ['continual-learning'],
  gui2024knnclip: ['continual-learning'],

  goel2024corrective: ['unlearning'],
  fazl2025unlearning: ['unlearning'],
  sinha2024wumethod: ['unlearning'],
  li2024deltainfluence: ['unlearning'],

  terekhov2025adaptiveattacks: ['robustness-safety'],
  panfilov2025strategicdishonesty: ['robustness-safety'],
  sinha2025falsify: ['robustness-safety'],
  goel2022adversarialeval: ['robustness-safety'],
  prabhu2019modelrec: ['robustness-safety']
};

const TOPIC_KEYWORDS = {
  'data-curation': [
    'data contamination', 'curation', 'dataset', 'data-centric', 'pretraining',
    'synthetic data', 'multimodal pretraining', 'alexandria', 'guide'
  ],
  'scaling-rl': [
    'reinforcement learning', 'rl', 'reasoning', 'oversight', 'belief updates',
    'agent', 'test-time compute'
  ],
  'science-of-benchmarking': [
    'benchmark', 'evaluation', 'evaluations', 'measure', 'measuring',
    'inverse scaling', 'report card', 'onebench', 'vggsounder'
  ],
  forecasting: [
    'predict the future', 'forecast', 'forecasting'
  ],
  'continual-learning': [
    'continual learning', 'online continual', 'lifelong', 'ocl', 'name-only',
    'gdumb', 'model adaptation', 'expanding large vocabularies'
  ],
  unlearning: [
    'unlearning', 'forgetting', 'poison', 'machine unlearning'
  ],
  'robustness-safety': [
    'robustness', 'adversarial', 'trusted monitors', 'safety', 'dishonesty',
    'falsify', 'attack', 'model-reuse'
  ]
};

function ensureAuthorLookups() {
  if (window.authorLookup && window.authorNameLookup) return;

  window.authorLookup = new Map();
  window.authorNameLookup = new Map();

  if (typeof authorsData === 'undefined' || !authorsData.authors) return;

  authorsData.authors.forEach((author) => {
    window.authorLookup.set(author.id, author);
    window.authorNameLookup.set(author.name, author);
  });
}

function getArxivDateScore(publication) {
  const urls = [];
  if (publication.url) urls.push(publication.url);
  if (Array.isArray(publication.links)) {
    publication.links.forEach((link) => {
      if (link && link.url) urls.push(link.url);
    });
  }

  for (const url of urls) {
    const match = url.match(/arxiv\.org\/abs\/(\d{2})(\d{2})\.\d{4,5}/i);
    if (match) {
      const year = 2000 + Number(match[1]);
      const month = Number(match[2]);
      if (month >= 1 && month <= 12) {
        return (year * 100) + month;
      }
    }
  }

  return null;
}

function getDateSortScore(publication) {
  const year = Number(publication.year) || 0;
  const arxivScore = getArxivDateScore(publication);
  return arxivScore || (year * 100);
}

function getDateSortedPublications(publications) {
  return publications
    .map((publication, sourceIndex) => ({
      publication,
      sourceIndex,
      score: getDateSortScore(publication),
      year: Number(publication.year) || 0
    }))
    .sort((a, b) => (
      (b.score - a.score) ||
      (b.year - a.year) ||
      (a.sourceIndex - b.sourceIndex)
    ))
    .map((item) => item.publication);
}

function normalizeTopicId(raw) {
  const topic = String(raw || '').trim().toLowerCase().replace(/\s+/g, '-');
  return TOPIC_DEFINITIONS.some((entry) => entry.id === topic) ? topic : null;
}

function inferTopicsByKeywords(publication) {
  const text = `${publication.title || ''} ${publication.venue || ''}`.toLowerCase();
  const inferred = [];

  Object.entries(TOPIC_KEYWORDS).forEach(([topicId, keywords]) => {
    if (keywords.some((keyword) => text.includes(keyword))) {
      inferred.push(topicId);
    }
  });

  return inferred;
}

function getPublicationTopics(publication) {
  if (Array.isArray(publication.topics) && publication.topics.length > 0) {
    const normalized = publication.topics
      .map((topic) => normalizeTopicId(topic))
      .filter(Boolean);
    if (normalized.length > 0) return [...new Set(normalized)];
  }

  if (TOPIC_OVERRIDES[publication.id]) {
    return [...new Set(TOPIC_OVERRIDES[publication.id])];
  }

  const inferred = inferTopicsByKeywords(publication);
  if (inferred.length > 0) return [...new Set(inferred)];

  return ['other'];
}

function getTopicLabel(topicId) {
  const found = TOPIC_DEFINITIONS.find((entry) => entry.id === topicId);
  return found ? found.label : topicId;
}

function getTopicGoal(topicId) {
  const found = TOPIC_DEFINITIONS.find((entry) => entry.id === topicId);
  return found ? found.goal : '';
}

async function renderPublication(publication) {
  const tags = Array.isArray(publication.tags) ? publication.tags : [];
  const tagsHTML = tags.map((tag) => (
    `<span style="background-color:${getTagColor(tag)}">${tag}</span>`
  )).join('\n');

  ensureAuthorLookups();

  const coFirst = Array.isArray(publication.coFirstAuthors) ? new Set(publication.coFirstAuthors) : new Set();
  const coLast = Array.isArray(publication.coLastAuthors) ? new Set(publication.coLastAuthors) : new Set();
  const coreContrib = Array.isArray(publication.coreContributors) ? new Set(publication.coreContributors) : new Set();

  const hasMarker = (authorToken, set) => {
    if (set.size === 0) return false;
    if (set.has(authorToken)) return true;

    const author = window.authorLookup.get(authorToken) || window.authorNameLookup.get(authorToken);
    if (!author) return false;
    return set.has(author.id) || set.has(author.name);
  };

  const authorsHTML = publication.authors.map((authorToken) => {
    const author = window.authorLookup.get(authorToken) || window.authorNameLookup.get(authorToken);

    const markers = [
      hasMarker(authorToken, coFirst) ? '<sup class="author-marker cofirst" aria-label="Shared lead author" title="Shared lead author">*</sup>' : '',
      hasMarker(authorToken, coLast) ? '<sup class="author-marker colast" aria-label="Shared advising" title="Shared advising">†</sup>' : '',
      hasMarker(authorToken, coreContrib) ? '<sup class="author-marker core" aria-label="Core contributor" title="Core contributor">◦</sup>' : ''
    ].join('');

    if (!author) {
      console.warn(`Author not found for token: ${authorToken}`);
      return authorToken + markers;
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

  const links = Array.isArray(publication.links) ? publication.links : [];
  const linksHTML = links.length > 0
    ? links.map((link) => `<a href="${link.url}">${link.text}</a>`).join(' / ')
    : '';

  const bibtexId = `bibtex-${publication.id}`;
  const hasInlineBibtex = Boolean(publication.bibtex && publication.bibtex.trim().length > 0);
  const provider = deriveBibtexProvider(publication);
  const hasAnyBibtex = hasInlineBibtex || Boolean(provider);
  const bibtexLinkHTML = hasAnyBibtex
    ? `<a href="javascript:void(0)" onclick="loadAndShowBibtex('${bibtexId}', '${publication.id}')">BibTeX</a>`
    : '';

  const initialContent = hasInlineBibtex ? publication.bibtex : '';
  const bibtexContentHTML = hasAnyBibtex
    ? `<pre id="${bibtexId}" class="bibtex-content" style="display:none" onclick="selectAndCopyBibtex(event, '${bibtexId}')" data-loaded="${hasInlineBibtex ? 'true' : 'false'}">${initialContent}</pre>`
    : '';

  const combinedLinksHTML = bibtexLinkHTML + (linksHTML ? (bibtexLinkHTML ? ' / ' : '') + linksHTML : '');
  const linksSection = combinedLinksHTML
    ? `<br>\n${combinedLinksHTML}\n${bibtexContentHTML}`
    : '';

  const tagBlock = tagsHTML ? `${tagsHTML}<br>` : '';

  return `
    <div class="row common-rows publication-row">
      <div class="col-12 publication-column">
        ${tagBlock}
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

function toggleBibtex(id) {
  const bibtexElement = document.getElementById(id);
  if (bibtexElement.style.display === 'none') {
    bibtexElement.style.display = 'block';
  } else {
    bibtexElement.style.display = 'none';
  }
}

function selectAndCopyBibtex(event, id) {
  event.stopPropagation();

  const bibtexElement = document.getElementById(id);
  const range = document.createRange();
  range.selectNodeContents(bibtexElement);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  try {
    document.execCommand('copy');

    const originalBgColor = bibtexElement.style.backgroundColor;
    bibtexElement.style.backgroundColor = '#e8f5e9';

    setTimeout(() => {
      bibtexElement.style.backgroundColor = originalBgColor;
    }, 300);

    console.log('BibTeX copied to clipboard');
  } catch (err) {
    console.error('Failed to copy BibTeX: ', err);
  }
}

function getTagColor(tag) {
  const tagColors = {
    'Privacy & Security': '#b5ead7',
    Evaluation: '#e2c7e5',
    Robustness: '#ff9aa2',
    Uncertainty: '#ffdac1',
    Explainability: '#c7ceea',
    'Large-Scale ML': '#C9D3D8'
  };

  return tagColors[tag] || '#cccccc';
}

async function renderByDate(container, publications) {
  const sorted = getDateSortedPublications(publications);
  const publicationHTML = await Promise.all(sorted.map((pub) => renderPublication(pub)));
  container.innerHTML = publicationHTML.join('\n');
}

async function renderByTopic(container, publications) {
  const grouped = new Map(TOPIC_DEFINITIONS.map((entry) => [entry.id, []]));

  publications.forEach((publication) => {
    const topics = getPublicationTopics(publication);
    topics.forEach((topic) => {
      if (!grouped.has(topic)) grouped.set(topic, []);
      grouped.get(topic).push(publication);
    });
  });

  const cards = [];
  const topicPayload = {};

  for (const topicEntry of TOPIC_DEFINITIONS) {
    const topicPublications = grouped.get(topicEntry.id) || [];
    if (topicPublications.length === 0) continue;

    const sorted = getDateSortedPublications(topicPublications);
    const publicationHTML = await Promise.all(sorted.map((pub) => renderPublication(pub)));
    const buttonId = `topic-toggle-${topicEntry.id}`;
    const topicHtml = publicationHTML.join('\n');

    topicPayload[topicEntry.id] = {
      topicId: topicEntry.id,
      label: getTopicLabel(topicEntry.id),
      goal: getTopicGoal(topicEntry.id),
      count: topicPublications.length,
      html: topicHtml
    };

    cards.push(`
      <article class="topic-card" id="topic-${topicEntry.id}">
        <button
          type="button"
          class="topic-card-toggle"
          id="${buttonId}"
          data-topic-id="${topicEntry.id}"
          aria-expanded="false"
          aria-controls="topic-detail"
        >
          <span class="topic-card-title-wrap">
            <span class="topic-card-title">${getTopicLabel(topicEntry.id)}</span>
            <span class="topic-card-count">${topicPublications.length} papers</span>
          </span>
          <span class="topic-card-chevron" aria-hidden="true">▾</span>
        </button>
        <p class="topic-card-goal">${getTopicGoal(topicEntry.id)}</p>
      </article>
    `);
  }

  container.innerHTML = `
    <div class="topic-grid">${cards.join('\n')}</div>
    <section class="topic-detail" id="topic-detail" role="region" aria-live="polite" hidden>
      <h4 class="topic-detail-title" id="topic-detail-title"></h4>
      <p class="topic-detail-goal" id="topic-detail-goal"></p>
      <div id="topic-detail-list"></div>
    </section>
  `;
  setupTopicDropdowns(container, topicPayload);
}

function setupTopicDropdowns(container, topicPayload) {
  const toggles = container.querySelectorAll('.topic-card-toggle');
  const detailSection = container.querySelector('#topic-detail');
  const detailTitle = container.querySelector('#topic-detail-title');
  const detailGoal = container.querySelector('#topic-detail-goal');
  const detailList = container.querySelector('#topic-detail-list');

  let activeTopicId = null;

  toggles.forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const topicId = toggle.getAttribute('data-topic-id');
      if (!topicId || !topicPayload[topicId]) return;

      const isAlreadyActive = activeTopicId === topicId;

      toggles.forEach((button) => {
        const card = button.closest('.topic-card');
        if (!card) return;
        button.setAttribute('aria-expanded', 'false');
        card.classList.remove('is-active');
      });

      if (isAlreadyActive) {
        activeTopicId = null;
        if (detailSection) detailSection.hidden = true;
        if (detailList) detailList.innerHTML = '';
        return;
      }

      activeTopicId = topicId;
      const selected = topicPayload[topicId];
      const card = toggle.closest('.topic-card');

      toggle.setAttribute('aria-expanded', 'true');
      if (card) card.classList.add('is-active');

      if (detailTitle) detailTitle.textContent = `${selected.label} (${selected.count})`;
      if (detailGoal) detailGoal.textContent = selected.goal;
      if (detailList) detailList.innerHTML = selected.html;
      if (detailSection) detailSection.hidden = false;
    });
  });
}

async function renderPublications() {
  const publicationsContainer = document.getElementById('publications-container');
  if (!publicationsContainer) return;

  if (typeof publicationsData === 'undefined') {
    console.error('Publications data not found. Make sure data/publications.js is loaded before this script.');
    return;
  }

  if (currentPublicationView === 'topic') {
    await renderByTopic(publicationsContainer, publicationsData);
  } else {
    await renderByDate(publicationsContainer, publicationsData);
  }
}

function setupPublicationViewToggle() {
  const buttons = document.querySelectorAll('[data-publication-view]');
  if (!buttons.length) return;

  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const requestedView = button.getAttribute('data-publication-view');
      if (!requestedView || requestedView === currentPublicationView) return;

      currentPublicationView = requestedView;

      buttons.forEach((otherButton) => {
        const isActive = otherButton === button;
        otherButton.classList.toggle('is-active', isActive);
        otherButton.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      await renderPublications();
    });
  });
}

window.addEventListener('DOMContentLoaded', function() {
  setupPublicationViewToggle();
  renderPublications();
});

function deriveBibtexProvider(publication) {
  const allUrls = [];
  if (publication.url) allUrls.push(publication.url);
  if (Array.isArray(publication.links)) {
    publication.links.forEach((l) => {
      if (l && l.url) allUrls.push(l.url);
    });
  }

  const acl = allUrls.find((u) => /aclanthology\.org\//i.test(u));
  if (acl) {
    let bibUrl = acl.replace(/\/?$/, '');
    if (!/\.bib$/i.test(bibUrl)) bibUrl += '.bib';
    return { type: 'directUrl', url: bibUrl, source: 'ACL' };
  }

  const cvf = allUrls.find((u) => /openaccess\.thecvf\.com/i.test(u));
  if (cvf) {
    return { type: 'htmlPre', url: cvf, source: 'CVF' };
  }

  const pmlr = allUrls.find((u) => /proceedings\.mlr\.press\//i.test(u));
  if (pmlr) {
    return { type: 'htmlPre', url: pmlr, source: 'PMLR' };
  }

  const arxivAbs = allUrls.find((u) => /arxiv\.org\/abs\//i.test(u));
  if (arxivAbs) {
    const match = arxivAbs.match(/arxiv\.org\/abs\/([0-9]{4}\.[0-9]{4,5})(?:v\d+)?/i);
    if (match) {
      const bibUrl = `https://arxiv.org/bibtex/${match[1]}`;
      return { type: 'directUrl', url: bibUrl, source: 'arXiv' };
    }
  }

  return null;
}

async function fetchBibtexFromProvider(provider) {
  try {
    const resp = await fetch(provider.url, { headers: { Accept: 'text/html, text/plain' } });
    const text = await resp.text();

    if (provider.type === 'directUrl') {
      return text.trim();
    }

    if (provider.type === 'htmlPre') {
      const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch) {
        const content = preMatch[1]
          .replace(/<br\s*\/?>(\n)?/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .trim();
        return content;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch BibTeX from provider', provider, e);
  }
  return '';
}

async function loadAndShowBibtex(bibtexId, publicationId) {
  const pre = document.getElementById(bibtexId);
  if (!pre) return;

  if (pre.dataset.loaded !== 'true') {
    const pub = (typeof publicationsData !== 'undefined')
      ? publicationsData.find((p) => p.id === publicationId)
      : null;

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

  if (pre.style.display === 'none') {
    pre.style.display = 'block';
  } else {
    pre.style.display = 'none';
  }
}
