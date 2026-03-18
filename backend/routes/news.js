const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const cheerio = require('cheerio');

const cache = new NodeCache({ stdTTL: 300 });
const staleCache = new NodeCache({ stdTTL: 7200 }); // 2-hour stale fallback
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const BASE = 'https://eventregistry.org/api/v1';

// ─── Source domain → reliability score ───────────────────────────────────────
// NewsAPI.ai returns source.uri as a domain (e.g. "bbc.co.uk", "reuters.com")
const SOURCE_SCORES = {
  // Tier 1: 95–98 — Wire agencies
  'reuters.com': 98,        'reuters.co.uk': 98,
  'apnews.com': 97,         'ap.org': 97,
  'afp.com': 96,
  'dpa-international.com': 95,

  // Tier 2: 90–94 — Major international broadcasters
  'bbc.co.uk': 93,          'bbc.com': 93,
  'economist.com': 92,
  'ft.com': 91,
  'wsj.com': 90,            'online.wsj.com': 90,
  'nature.com': 96,         'science.org': 96,
  'thelancet.com': 93,      'bmj.com': 92,
  'nasa.gov': 92,
  'who.int': 90,

  // Tier 3: 85–89 — Top national newspapers
  'nytimes.com': 89,
  'theguardian.com': 88,    'guardian.com': 88,
  'bloomberg.com': 88,      'bloomberg.co.uk': 88,
  'washingtonpost.com': 87,
  'npr.org': 88,
  'pbs.org': 87,
  'thehindu.com': 87,
  'axios.com': 86,
  'thetimes.co.uk': 86,
  'news.sky.com': 85,       'sky.com': 85,
  'abc.net.au': 86,
  'channel4.com': 85,
  'dw.com': 86,
  'france24.com': 85,
  'nikkei.com': 85,         'asia.nikkei.com': 85,
  'propublica.org': 88,
  'theconversation.com': 83,
  'lemonde.fr': 85,
  'spiegel.de': 85,
  'mit.edu': 88,            'news.mit.edu': 88,
  'pewresearch.org': 90,

  // Tier 4: 78–84 — Reputable outlets
  'arstechnica.com': 84,
  'aljazeera.com': 83,      'aljazeera.net': 83,
  'abc.go.com': 83,         'abcnews.go.com': 83,
  'politico.com': 82,       'theatlantic.com': 82,
  'time.com': 82,           'fortune.com': 81,
  'independent.co.uk': 81,
  'wired.com': 80,          'wired.co.uk': 80,
  'techcrunch.com': 80,
  'theverge.com': 79,
  'telegraph.co.uk': 79,
  'cnbc.com': 78,           'marketwatch.com': 78,
  'foreignpolicy.com': 82,
  'statista.com': 84,
  'straitsimes.com': 82,    'straitstimes.com': 82,
  'japantimes.co.jp': 82,
  'asahi.com': 84,
  'corriere.it': 82,
  'elpais.com': 83,
  'scmp.com': 78,           'scmp.co.uk': 78,
  'sydneymorningherald.com.au': 82,
  'smh.com.au': 82,
  'thediplomat.com': 80,

  // Indian outlets
  'indianexpress.com': 80,
  'ndtv.com': 79,
  'hindustantimes.com': 78,
  'livemint.com': 79,       'mint.com': 79,
  'economictimes.indiatimes.com': 79,
  'businessstandard.com': 78,
  'scroll.in': 76,
  'thewire.in': 78,
  'theprint.in': 78,
  'firstpost.com': 74,
  'news18.com': 72,
  'indiatoday.in': 75,
  'timesofindia.indiatimes.com': 74,
  'deccanherald.com': 76,
  'thequint.com': 73,
  'financialexpress.com': 76,

  // South Asian
  'dawn.com': 78,
  'geo.tv': 72,
  'thedailystar.net': 74,

  // Middle East
  'gulfnews.com': 76,       'arabnews.com': 75,
  'themiddleeasteye.net': 76, 'middleeasteye.net': 76,
  'thenationalnews.com': 76,
  'dailysabah.com': 68,

  // Africa
  'dailymaverick.co.za': 78,
  'theeastafrican.co.ke': 74,

  // Latin America
  'folha.uol.com.br': 80,
  'lanacion.com.ar': 78,
  'globo.com': 76,

  // Tier 5: 68–77 — Mixed reliability
  'cnn.com': 74,
  'msnbc.com': 72,
  'usatoday.com': 74,
  'thehill.com': 73,
  'newsweek.com': 72,
  'businessinsider.com': 72,
  'vice.com': 70,
  'huffpost.com': 69,       'huffingtonpost.com': 69,
  'buzzfeed.com': 68,       'buzzfeednews.com': 68,
  'vox.com': 76,
  'slate.com': 72,
  'salon.com': 68,
  'variety.com': 72,
  'deadline.com': 70,
  'theintercept.com': 72,
  'motherjones.com': 70,
  'nationalreview.com': 65,
  'thefederalist.com': 58,
  'rollingstone.com': 68,

  // Tier 6: 50–67 — Low reliability
  'foxnews.com': 58,
  'breitbart.com': 52,
  'infowars.com': 20,
  'dailymail.co.uk': 55,    'dailymail.com': 55,
  'thesun.co.uk': 53,
  'nypost.com': 60,
  'thedailybeast.com': 62,
};

// ─── Trusted global source URIs for world news (replaces unreliable percentile) ──
const GLOBAL_SOURCE_URIS = [
  'reuters.com', 'apnews.com', 'bbc.co.uk', 'bbc.com',
  'theguardian.com', 'bloomberg.com', 'nytimes.com',
  'washingtonpost.com', 'ft.com', 'economist.com',
  'npr.org', 'dw.com', 'france24.com', 'aljazeera.com',
  'politico.com', 'foreignpolicy.com', 'axios.com',
  'wsj.com', 'afp.com', 'abc.net.au',
];

// ─── Country → Wikipedia URI for sourceLocationUri ───────────────────────────
const COUNTRY_URIS = {
  'india': 'http://en.wikipedia.org/wiki/India',
  'united states of america': 'http://en.wikipedia.org/wiki/United_States',
  'united kingdom': 'http://en.wikipedia.org/wiki/United_Kingdom',
  'pakistan': 'http://en.wikipedia.org/wiki/Pakistan',
  'china': 'http://en.wikipedia.org/wiki/China',
  'germany': 'http://en.wikipedia.org/wiki/Germany',
  'france': 'http://en.wikipedia.org/wiki/France',
  'brazil': 'http://en.wikipedia.org/wiki/Brazil',
  'australia': 'http://en.wikipedia.org/wiki/Australia',
  'canada': 'http://en.wikipedia.org/wiki/Canada',
  'japan': 'http://en.wikipedia.org/wiki/Japan',
  'russia': 'http://en.wikipedia.org/wiki/Russia',
  'uae': 'http://en.wikipedia.org/wiki/United_Arab_Emirates',
  'saudi arabia': 'http://en.wikipedia.org/wiki/Saudi_Arabia',
  'south africa': 'http://en.wikipedia.org/wiki/South_Africa',
  'italy': 'http://en.wikipedia.org/wiki/Italy',
  'spain': 'http://en.wikipedia.org/wiki/Spain',
  'south korea': 'http://en.wikipedia.org/wiki/South_Korea',
  'mexico': 'http://en.wikipedia.org/wiki/Mexico',
  'indonesia': 'http://en.wikipedia.org/wiki/Indonesia',
  'turkey': 'http://en.wikipedia.org/wiki/Turkey',
  'nigeria': 'http://en.wikipedia.org/wiki/Nigeria',
  'egypt': 'http://en.wikipedia.org/wiki/Egypt',
  'argentina': 'http://en.wikipedia.org/wiki/Argentina',
  'israel': 'http://en.wikipedia.org/wiki/Israel',
  'ukraine': 'http://en.wikipedia.org/wiki/Ukraine',
  'poland': 'http://en.wikipedia.org/wiki/Poland',
  'netherlands': 'http://en.wikipedia.org/wiki/Netherlands',
  'sweden': 'http://en.wikipedia.org/wiki/Sweden',
  'switzerland': 'http://en.wikipedia.org/wiki/Switzerland',
  'singapore': 'http://en.wikipedia.org/wiki/Singapore',
  'malaysia': 'http://en.wikipedia.org/wiki/Malaysia',
  'thailand': 'http://en.wikipedia.org/wiki/Thailand',
  'philippines': 'http://en.wikipedia.org/wiki/Philippines',
  'bangladesh': 'http://en.wikipedia.org/wiki/Bangladesh',
  'sri lanka': 'http://en.wikipedia.org/wiki/Sri_Lanka',
  'kenya': 'http://en.wikipedia.org/wiki/Kenya',
  'ethiopia': 'http://en.wikipedia.org/wiki/Ethiopia',
  'ghana': 'http://en.wikipedia.org/wiki/Ghana',
  'morocco': 'http://en.wikipedia.org/wiki/Morocco',
  'iran': 'http://en.wikipedia.org/wiki/Iran',
  'iraq': 'http://en.wikipedia.org/wiki/Iraq',
  'new zealand': 'http://en.wikipedia.org/wiki/New_Zealand',
  'portugal': 'http://en.wikipedia.org/wiki/Portugal',
  'greece': 'http://en.wikipedia.org/wiki/Greece',
  'czech republic': 'http://en.wikipedia.org/wiki/Czech_Republic',
  'romania': 'http://en.wikipedia.org/wiki/Romania',
};

// ─── Interest → category keywords ─────────────────────────────────────────────
const INTEREST_KEYWORDS = {
  geopolitics:    'geopolitics diplomacy foreign policy international relations',
  technology:     'technology AI software startup innovation',
  stocks:         'stock market finance economy investment earnings',
  infrastructure: 'infrastructure construction urban development transport',
  science:        'science research discovery breakthrough study',
  health:         'health medicine pandemic disease treatment',
  sports:         'sports football cricket basketball tennis',
  entertainment:  'entertainment movies music celebrity film',
  environment:    'environment climate change sustainability renewable',
  military:       'military defence army war conflict weapons',
  energy:         'energy oil gas coal renewable electricity',
  space:          'space NASA SpaceX rocket satellite asteroid',
};

// Single-word keywords only — multi-word strings break EventRegistry when combined with percentile filters
const CATEGORY_KEYWORDS = {
  technology:    'technology',
  business:      'business',
  sports:        'sports',
  health:        'health',
  science:       'science',
  entertainment: 'entertainment',
  general:       'politics',
};

// ─── X/Twitter country slugs for trends24.in ─────────────────────────────────
const TRENDS24_SLUG = {
  'india': 'india',
  'united states of america': 'united-states',
  'united kingdom': 'united-kingdom',
  'pakistan': 'pakistan',
  'australia': 'australia',
  'canada': 'canada',
  'germany': 'germany',
  'france': 'france',
  'brazil': 'brazil',
  'japan': 'japan',
  'russia': 'russia',
  'uae': 'united-arab-emirates',
  'saudi arabia': 'saudi-arabia',
  'south africa': 'south-africa',
  'italy': 'italy',
  'spain': 'spain',
  'south korea': 'korea',
  'mexico': 'mexico',
  'indonesia': 'indonesia',
  'turkey': 'turkey',
  'nigeria': 'nigeria',
  'egypt': 'egypt',
  'argentina': 'argentina',
  'israel': 'israel',
  'ukraine': 'ukraine',
  'netherlands': 'netherlands',
  'sweden': 'sweden',
  'thailand': 'thailand',
  'philippines': 'philippines',
  'new zealand': 'new-zealand',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAccuracy(src) {
  const uri  = (src?.id   || '').toLowerCase().trim();
  const name = (src?.name || '').toLowerCase().trim();
  const score = SOURCE_SCORES[uri] || SOURCE_SCORES[name] || 62;
  let label, color;
  if (score >= 90)      { label = 'Very High'; color = '#00c853'; }
  else if (score >= 80) { label = 'High';      color = '#2ecc71'; }
  else if (score >= 70) { label = 'Medium';    color = '#f39c12'; }
  else                  { label = 'Low';       color = '#e74c3c'; }
  return { score, label, color };
}

function forceHttps(url) {
  if (!url) return null;
  return url.replace(/^http:\/\//i, 'https://');
}

// Filter only definitively bad images — keep this list short to avoid killing valid CDN URLs
function cleanImageUrl(url) {
  if (!url) return null;
  const u = forceHttps(url);
  const lower = u.toLowerCase();
  // Only filter patterns that are unambiguously not real article images
  const badPatterns = [
    '300x300',
    'redesign/images/seo',  // investing.com SEO thumbnail
    'placeholder',
    'no-image', 'no_image', 'noimage',
    'site-icon', 'favicon',
    'og-fallback',
  ];
  if (badPatterns.some(p => lower.includes(p))) return null;
  return u;
}

const THIRTY_DAYS_MS = 30 * 24 * 3600000;

function dateStr(daysAgo = 0) {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function isValid(a) {
  if (!a.title || !a.url) return false;
  if (a.title === '[Removed]' || a.title === 'Remove') return false;
  const pub = new Date(a.dateTime || a.dateTimePub || a.date);
  if (isNaN(pub.getTime())) return false;
  if (pub.getTime() < Date.now() - THIRTY_DAYS_MS) return false;
  if (pub.getTime() > Date.now() + 3600000) return false;
  return true;
}

function formatArticle(a, index) {
  const twoHoursAgo = Date.now() - 2 * 3600000;
  const publishedAt = a.dateTimePub || a.dateTime || `${a.date}T${a.time || '00:00:00'}Z`;
  const srcUri  = a.source?.uri   || '';
  const srcName = a.source?.title || 'Unknown';
  return {
    id: `${index}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: a.title,
    source: srcName,
    sourceId: srcUri,
    body: a.body ? a.body.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim() : '',
    description: a.body ? a.body.replace(/\n/g, ' ').substring(0, 300) : '',
    imageUrl: cleanImageUrl(a.image),
    url: a.url,
    publishedAt,
    accuracy: getAccuracy({ id: srcUri, name: srcName }),
    isLive: new Date(publishedAt).getTime() > twoHoursAgo,
  };
}

// POST to EventRegistry / NewsAPI.ai
async function apiPost(params) {
  const r = await axios.post(`${BASE}/article/getArticles`, {
    resultType: 'articles',
    dataType: ['news'],
    lang: 'eng',
    includeArticleImage: true,
    includeArticleBody: true,
    articleBodyLen: 800,
    articlesPage: 1,
    articlesCount: 20,
    articlesSortBy: 'date',
    articlesSortByAsc: false,
    apiKey: NEWS_API_KEY,
    ...params,
  });
  const d = r.data?.articles || {};
  return {
    articles: d.results || [],
    totalResults: d.totalResults || 0,
    page: d.page || 1,
  };
}

function mergeDedupe(arrays, limit = 50) {
  const seenUrl = new Set();
  const seenTitle = new Set();
  const out = [];
  for (const arr of arrays) {
    for (const a of arr) {
      const titleKey = (a.title || '').toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 80);
      if (a.url && !seenUrl.has(a.url) && !seenTitle.has(titleKey)) {
        seenUrl.add(a.url);
        seenTitle.add(titleKey);
        out.push(a);
      }
    }
  }
  return out
    .filter(isValid)
    .sort((a, b) => {
      const da = new Date(a.dateTimePub || a.dateTime || a.date || 0);
      const db = new Date(b.dateTimePub || b.dateTime || b.date || 0);
      return db - da;
    })
    .slice(0, limit);
}

// ─── GET /api/news/top?country=India ─────────────────────────────────────────
router.get('/top', async (req, res) => {
  const { country = 'United States of America', refresh } = req.query;
  const cacheKey = `top_${country}`;
  if (refresh === 'true') cache.del(cacheKey);
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const countryKey = country.toLowerCase();
    const isWorld = countryKey === 'world' || countryKey === 'worldwide';
    const countryUri = COUNTRY_URIS[countryKey];
    const dateStart = dateStr(7);

    const calls = isWorld
      ? [
          // World mode: two passes at top global sources
          apiPost({ articlesCount: 30, articlesSortBy: 'sourceImportance', startSourceRankPercentile: 0, endSourceRankPercentile: 25, dateStart }),
          apiPost({ articlesCount: 20, articlesSortBy: 'date', startSourceRankPercentile: 0, endSourceRankPercentile: 30, dateStart }),
        ]
      : [
          // Country mode: global top sources + country-specific sources
          apiPost({ articlesCount: 20, articlesSortBy: 'sourceImportance', startSourceRankPercentile: 0, endSourceRankPercentile: 30, dateStart }),
          countryUri
            ? apiPost({ sourceLocationUri: countryUri, articlesCount: 25, articlesSortBy: 'date', dateStart })
            : apiPost({ keyword: country, keywordLoc: 'title', articlesCount: 20, articlesSortBy: 'date', dateStart }),
        ];

    const results = await Promise.all(calls);
    const articles = mergeDedupe(
      results.map(r => r.articles),
      50
    ).map(formatArticle);

    const result = { articles };
    cache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('TOP error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ─── GET /api/news/trending ───────────────────────────────────────────────────
router.get('/trending', async (req, res) => {
  const { refresh } = req.query;
  const cacheKey = 'trending_live';
  if (refresh === 'true') cache.del(cacheKey);
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const dateStart = dateStr(2);
    const [topSources, breaking] = await Promise.all([
      apiPost({
        articlesCount: 25,
        articlesSortBy: 'sourceImportance',
        startSourceRankPercentile: 0,
        endSourceRankPercentile: 20,
        dateStart,
      }),
      apiPost({
        keyword: 'breaking news latest update',
        articlesCount: 20,
        articlesSortBy: 'date',
        dateStart,
      }),
    ]);

    const articles = mergeDedupe([topSources.articles, breaking.articles], 30)
      .map(formatArticle);

    const result = { articles };
    cache.set(cacheKey, result, 120); // 2-min TTL
    res.json(result);
  } catch (err) {
    console.error('TRENDING error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ─── GET /api/news/headlines?category=technology ─────────────────────────────
router.get('/headlines', async (req, res) => {
  const { category = 'general', refresh } = req.query;
  const cacheKey = `headlines_${category}`;
  if (refresh === 'true') cache.del(cacheKey);
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const keyword = CATEGORY_KEYWORDS[category] || category;
    const { articles: raw } = await apiPost({
      keyword,
      articlesCount: 25,
      articlesSortBy: 'sourceImportance',
      startSourceRankPercentile: 0,
      endSourceRankPercentile: 40,
      dateStart: dateStr(7),
    });

    const articles = raw.filter(isValid).map(formatArticle);
    const result = { articles };
    cache.set(cacheKey, result, 300);
    res.json(result);
  } catch (err) {
    console.error('HEADLINES error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ─── GET /api/news/x-trending?country=India ──────────────────────────────────
router.get('/x-trending', async (req, res) => {
  const { country = 'worldwide' } = req.query;
  const slug = TRENDS24_SLUG[country.toLowerCase()] || 'worldwide';
  const cacheKey = `xtrend_${slug}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { data: html } = await axios.get(`https://trends24.in/${slug}/`, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    const $ = cheerio.load(html);
    const trends = [];

    $('.trend-card__list').first().find('li').each((i, el) => {
      if (trends.length >= 25) return false;
      const tag = $(el).find('.trend-link, a').first().text().trim();
      const countAttr = $(el).find('.tweet-count').attr('data-count');
      const count = countAttr && countAttr !== '' ? countAttr : null;
      if (tag && tag.length > 1) {
        trends.push({ rank: trends.length + 1, tag, count });
      }
    });

    const result = { trends, country: slug, updatedAt: new Date().toISOString() };
    cache.set(cacheKey, result, 300);
    res.json(result);
  } catch (err) {
    console.error('X-TRENDING error:', err.message);
    res.json({ trends: [], country: slug, updatedAt: new Date().toISOString() });
  }
});

// ─── GET /api/news/search?q=...&sortBy=...&from=...&page=... ─────────────────
router.get('/search', async (req, res) => {
  const { q, page = 1, sortBy = 'date', from = '' } = req.query;
  if (!q) return res.status(400).json({ error: 'Query q is required' });

  // Map frontend sort keys to EventRegistry sort keys
  const sortMap = { publishedAt: 'date', relevancy: 'rel', popularity: 'socialScore' };
  const erSort = sortMap[sortBy] || sortBy;

  // Map time filter to dateStart
  let dateStart;
  if (from === '1h' || from === '24h') dateStart = dateStr(1);
  else if (from === '7d') dateStart = dateStr(7);
  else dateStart = dateStr(30);

  const cacheKey = `search_${q}_${page}_${erSort}_${from}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { articles: raw, totalResults } = await apiPost({
      keyword: q,
      keywordLoc: 'title,body',
      articlesPage: parseInt(page),
      articlesCount: 50,
      articlesSortBy: erSort,
      articlesSortByAsc: false,
      dateStart,
    });

    const articles = raw.filter(isValid).map(formatArticle);
    const result = { articles, totalResults, page: parseInt(page) };
    cache.set(cacheKey, result, from === '1h' ? 60 : 300);
    res.json(result);
  } catch (err) {
    console.error('SEARCH error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ─── POST /api/news/feed  { interests: [...], country: "India" } ──────────────
router.post('/feed', async (req, res) => {
  const { interests = [], country = 'world', refresh = false, strict = false, city = null } = req.body;
  const cacheKey = `feed_${strict ? 'strict' : 'mix'}_${country}_${city || ''}_${interests.join('_')}`;
  if (refresh) cache.del(cacheKey);
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const countryUri = COUNTRY_URIS[country.toLowerCase()];
    const dateStart = dateStr(7);

    const interestKeywords = interests.length > 0
      ? interests.slice(0, 5).map(i => INTEREST_KEYWORDS[i] || i).join(' OR ')
      : 'world news politics science technology';

    // strict mode: only fetch interest-specific articles, no general/country mixing
    const calls = strict
      ? [
          apiPost({
            keyword: interestKeywords,
            articlesCount: 40,
            articlesSortBy: 'date',
            dateStart,
          }),
        ]
      : [
          // Top articles from reputable sources (fresh & quality)
          apiPost({
            articlesCount: 20,
            articlesSortBy: 'sourceImportance',
            startSourceRankPercentile: 0,
            endSourceRankPercentile: 30,
            dateStart,
          }),
          // Interest-matched articles
          apiPost({
            keyword: interestKeywords,
            articlesCount: 25,
            articlesSortBy: 'date',
            dateStart,
          }),
          // Country-specific articles
          countryUri
            ? apiPost({
                sourceLocationUri: countryUri,
                articlesCount: 15,
                articlesSortBy: 'date',
                dateStart,
              })
            : Promise.resolve({ articles: [] }),
          // City-specific articles (if location was shared)
          city
            ? apiPost({
                keyword: city,
                keywordLoc: 'title,body',
                articlesCount: 15,
                articlesSortBy: 'date',
                dateStart,
              })
            : Promise.resolve({ articles: [] }),
        ];

    const results = await Promise.all(calls);
    const articles = mergeDedupe(
      results.map(r => r.articles),
      50
    ).map(formatArticle);

    const result = { articles };
    cache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('FEED error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ─── 60-word bite helper (Inshorts-style: always ends at a sentence) ─────────
function to60Words(text) {
  if (!text) return '';
  const clean = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ');
  if (words.length <= 60) return clean;
  const snippet = words.slice(0, 60).join(' ');
  // Find the last sentence ending (.  !  ?) after at least 40% of the snippet
  const minPos = Math.floor(snippet.length * 0.4);
  let bestEnd = -1;
  for (let i = snippet.length - 1; i >= minPos; i--) {
    if ('.!?'.includes(snippet[i]) && (i + 1 >= snippet.length || snippet[i + 1] === ' ')) {
      bestEnd = i;
      break;
    }
  }
  if (bestEnd > 0) return snippet.slice(0, bestEnd + 1);
  return snippet + '…';
}

// ─── Helper: fetch + cache quickbites data ────────────────────────────────────
async function refreshQuickBites(cacheKey, interests, country) {
  const countryUri = COUNTRY_URIS[country.toLowerCase()];
  const dateStart = dateStr(5);
  const topKeywords = interests.slice(0, 2).map(i => {
    const kws = (INTEREST_KEYWORDS[i] || i).toLowerCase().split(/\s+/);
    return kws[0];
  }).filter(Boolean);

  const [worldCall, countryCall, ...interestCalls] = await Promise.all([
    apiPost({
      sourceUri: GLOBAL_SOURCE_URIS,
      articlesCount: 12,
      articlesSortBy: 'date',
      dateStart,
      articleBodyLen: 400,
    }),
    countryUri
      ? apiPost({
          sourceLocationUri: countryUri,
          articlesCount: 12,
          articlesSortBy: 'date',
          dateStart,
          articleBodyLen: 400,
        })
      : apiPost({
          keyword: country,
          keywordLoc: 'title',
          articlesCount: 10,
          articlesSortBy: 'date',
          startSourceRankPercentile: 0,
          endSourceRankPercentile: 30,
          dateStart,
          articleBodyLen: 400,
        }),
    ...topKeywords.map(kw => apiPost({
      keyword: kw,
      keywordLoc: 'title',
      articlesCount: 10,
      articlesSortBy: 'date',
      startSourceRankPercentile: 0,
      endSourceRankPercentile: 30,
      dateStart,
      articleBodyLen: 400,
    })),
  ]);

  const interestWordSet = new Set(
    interests
      .flatMap(i => (INTEREST_KEYWORDS[i] || '').toLowerCase().split(/\s+/))
      .filter(w => w.length > 3)
  );

  const interestArticles = interestCalls.flatMap(r => r.articles || []);
  const raw = mergeDedupe(
    [interestArticles, worldCall.articles, countryCall.articles || []],
    80
  );

  const articles = raw
    .map((a, idx) => {
      const base = formatArticle(a, idx);
      const bite = to60Words(a.body || '');
      const text = ((a.title || '') + ' ' + (a.body || '')).toLowerCase();
      const matchCount = [...interestWordSet].filter(kw => text.includes(kw)).length;
      const interestBoost = Math.min(matchCount * 8, 60);
      const freshness = Math.max(0, 100 - (Date.now() - new Date(base.publishedAt)) / 3600000 * 3.33);
      const biteScore = (base.accuracy?.score || 60) * 0.35 + freshness * 0.4 + interestBoost;
      return { ...base, bite, biteScore };
    })
    .sort((a, b) => b.biteScore - a.biteScore)
    .filter((() => {
      const sourceCounts = {};
      return a => {
        const src = a.sourceId || a.source || 'unknown';
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
        return sourceCounts[src] <= 2;
      };
    })())
    .slice(0, 30)
    .map(({ biteScore, ...rest }) => rest);

  const result = { articles };
  cache.set(cacheKey, result, 1800);      // fresh for 30 min
  staleCache.set(cacheKey, result, 7200); // stale fallback for 2 hrs
  return result;
}

// ─── POST /api/news/quickbites  { interests, country } ───────────────────────
router.post('/quickbites', async (req, res) => {
  const { interests = [], country = 'United States of America', refresh = false } = req.body;
  const cacheKey = `qbites_${country}_${[...interests].sort().join('_')}`;
  if (refresh) { cache.del(cacheKey); staleCache.del(cacheKey); }

  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  // Serve stale data instantly while refreshing in background
  const stale = staleCache.get(cacheKey);
  if (stale) {
    res.json(stale);
    setImmediate(async () => {
      try { await refreshQuickBites(cacheKey, interests, country); } catch {}
    });
    return;
  }

  try {
    const result = await refreshQuickBites(cacheKey, interests, country);
    res.json(result);
  } catch (err) {
    console.error('QUICKBITES error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

module.exports = router;
