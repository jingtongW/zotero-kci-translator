{
    "translatorID": "179714c7-b3a1-4dcd-8a5a-d9dc69121ff7",
    "label": "KCI",
    "creator": "tong",
    "target": "^https?://www\\.kci\\.go\\.kr/kciportal/ci/sereArticleSearch/ciSereArtiView\\.kci\\?sereArticleSearchBean\\.artiId=[A-Z0-9]+$",
    "minVersion": "3.0",
    "maxVersion": "",
    "priority": 100,
    "inRepository": true,
    "translatorType": 4,
    "browserSupport": "gcsibv",
    "lastUpdated": "2024-06-13 12:00:00"
}

function detectWeb(doc, url) {
    if (url.includes('kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci')) {
        return "journalArticle";
    }
    return false;
}

function doWeb(doc, url) {
    scrape(doc, url);
}

function scrape(doc, url) {
    let item = new Zotero.Item("journalArticle");
    
    // Get citation data from BibTeX format
    let bibtex = text(doc, '#BibTex');
    if (bibtex) {
        // Title
        let titleMatch = bibtex.match(/title=\{(.+?)\}/);
        if (titleMatch) item.title = titleMatch[1];

        // Authors
        let authorMatch = bibtex.match(/author=\{(.+?)\}/);
        if (authorMatch) {
            let authors = authorMatch[1].split(/\s+and\s+/);
            authors.forEach(author => {
                let names = author.split('/');
                item.creators.push({
                    firstName: names[1] ? names[1].trim() : "",
                    lastName: names[0].trim(),
                    creatorType: "author"
                });
            });
        }

        // Journal title
        let journalMatch = bibtex.match(/journal=\{(.+?)\}/);
        if (journalMatch) item.publicationTitle = journalMatch[1];

        // Volume
        let volMatch = bibtex.match(/volume=\{(\d+)\}/);
        if (volMatch) item.volume = volMatch[1];
        
        // Issue/Number
        let issueMatch = bibtex.match(/number=\{(\d+)\}/);
        if (issueMatch) item.issue = issueMatch[1];
        
        // Pages
        let pagesMatch = bibtex.match(/pages=\{(\d+)-(\d+)\}/);
        if (pagesMatch) {
            item.pages = pagesMatch[1] + "-" + pagesMatch[2];
        }

        // ISSN
        let issnMatch = bibtex.match(/issn=\{(\d{4}-[\dX]{4})\}/i);
        if (issnMatch) item.ISSN = issnMatch[1];

        // Date
        let yearMatch = bibtex.match(/year=\{(\d{4})\}/);
        if (yearMatch) item.date = yearMatch[1];

        // DOI
        let doiMatch = bibtex.match(/doi=\{(?:https?:\/\/(?:dx\.)?doi\.org\/)?(.+?)\}/);
        if (doiMatch) item.DOI = doiMatch[1];
    }

    // Get keywords from the page - only the direct text content of the links
    let keywords = Array.from(doc.querySelectorAll('a#keywd'))
        .map(el => el.firstChild.textContent.trim())  // Only get direct text content
        .filter(k => k && k.length > 1);

    // Get English keywords if they exist in a paragraph
    let englishKeywordsText = Array.from(doc.querySelectorAll('.box .innerBox p'))
        .map(p => p.textContent.trim())
        .find(text => /^[A-Za-z,\s]+$/.test(text));  // Only get the p tag with pure English content

    if (englishKeywordsText) {
        let englishKeywords = englishKeywordsText
            .split(',')
            .map(k => k.trim())
            .filter(k => k && k.length > 1 && !/^[\d\s,]+$/.test(k));  // Filter out numeric-only strings
        
        keywords = [...keywords, ...englishKeywords];
    }

    // Add keywords to item if we found any
    if (keywords.length > 0) {
        // Remove duplicates
        let seen = new Set();
        item.tags = keywords
            .filter(k => {
                let normalized = k.toLowerCase().replace(/\s+/g, ' ');
                if (seen.has(normalized)) return false;
                seen.add(normalized);
                return true;
            })
            .map(k => ({ tag: k }));
    }

    // Get abstracts - try both Korean and English
    let korAbst = text(doc, '#korAbst');
    let engAbst = text(doc, '#engAbst');
    if (korAbst) {
        item.abstractNote = korAbst;
    } else if (engAbst) {
        item.abstractNote = engAbst;
    }

    // URL and language
    item.url = url;
    item.language = "ko"; // Default to Korean

    item.complete();
}

// Helper function to safely get text content or attribute
function text(doc, selector, attr) {
    let el = doc.querySelector(selector);
    return el ? (attr ? el.getAttribute(attr) : el.textContent.trim()) : '';
}
