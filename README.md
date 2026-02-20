# Personal Academic Website Template

A lightweight personal website for researchers with:
- a homepage (`index.html`)
- a dedicated publications page (`publications.html`)
- publication data separated from layout (`data/*.js`)
- two publication views: **By Date** and **By Topic**
- light/dark theme toggle

No build step is required.

## Quick Start

1. Fork this repo.
2. Update profile content in `index.html`.
3. Update publication and author data in `data/publications.js` and `data/authors.js`.
4. Update domain settings:
   - edit/remove `CNAME`
   - update canonical/OpenGraph URLs in `index.html` and `publications.html`
5. Deploy with GitHub Pages (or any static host).

## Project Structure

- `index.html`: homepage (bio, links, logos)
- `publications.html`: publications page shell + view toggle UI
- `data/authors.js`: author registry (id, name, url, isMe)
- `data/publications.js`: publication records
- `js/publications.js`: rendering, date sorting, topic grouping, BibTeX loading
- `stylesheet.css`: shared styles
- `pictures/`: site images/logos

## Local Preview

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Editing Publications

### 1) Add/Update Authors
Add authors in `data/authors.js`:

```js
{
  "id": "jane_doe",
  "name": "Jane Doe",
  "url": "https://janedoe.github.io/",
  "isMe": false
}
```

Use stable IDs; publications should reference these IDs.

### 2) Add a Publication
Add an entry to `data/publications.js` (JS object, not strict JSON):

```js
{
  "id": "doe2026example",
  "title": "Example Paper",
  "authors": ["jane_doe", "ameya_prabhu"],
  "venue": "ICML",
  "year": "2026",
  "url": "https://arxiv.org/abs/2601.12345",
  "bibtex": "",
  "links": [
    { "text": "arXiv", "url": "https://arxiv.org/abs/2601.12345" }
  ],
  "abstract": "",
  "tags": ["Evaluation"]
}
```

Optional fields used by renderer:
- `coFirstAuthors`
- `coLastAuthors`
- `coreContributors`

## Topic View Configuration

The **By Topic** view is controlled in `js/publications.js`:
- `TOPIC_DEFINITIONS`: topic names + short goals
- `TOPIC_OVERRIDES`: explicit paper-to-topic mapping (recommended)
- `TOPIC_KEYWORDS`: fallback keyword-based assignment

If a paper is uncategorized, it falls back to `other`.

## Date Ordering

The **By Date** view sorts latest → earliest using:
1. arXiv ID month/year when available (`YYMM.xxxxx`)
2. otherwise the `year` field

## Notes for Reusers

- Keep author links as personal websites when possible, then Scholar (`https://scholar.google.com/citations?user=...`).
- Update social links/icons in `index.html`.
- If you change your repository/domain, also update metadata URLs and `CNAME`.
