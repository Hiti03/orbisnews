const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 }); // cache for 5 minutes

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_BASE = 'https://newsapi.org/v2';

// Map country names to NewsAPI country codes
const COUNTRY_CODES = {
  'India': 'in',
  'United States of America': 'us',
  'United Kingdom': 'gb',
  'Pakistan': 'pk',
  'China': 'cn',
  'Germany': 'de',
  'France': 'fr',
  'Brazil': 'br',
  'Australia': 'au',
  'Canada': 'ca',
  'Japan': 'jp',
  'Russia': 'ru',
  'UAE': 'ae',
  'Saudi Arabia': 'sa',
  'South Africa': 'za',
  'Italy': 'it',
  'Spain': 'es',
  'South Korea': 'kr',
  'Mexico': 'mx',
  'Indonesia': 'id',
};

// Source reliability scores (rule-based accuracy meter)
const SOURCE_RELIABILITY = {
  'reuters.com': 95,
  'apnews.com': 95,
  'bbc.com': 92,
  'bbc.co.uk': 92,
  'theguardian.com': 88,
  'nytimes.com': 87,
  'washingtonpost.com': 86,
  'bloomberg.com': 88,
  'economist.com': 90,
  'ft.com': 89,
  'aljazeera.com': 80,
  'cnn.com': 78,
  'foxnews.com': 65,
  'ndtv.com': 78,
  'thehindu.com': 85,
  'hindustantimes.com': 78,
  'timesofindia.com': 75,
  'default': 70,
};

function getReliabilityScore(sourceUrl) {
  if (!sourceUrl) return SOURCE_RELIABILITY['default'];
  const domain = sourceUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  return SOURCE_RELIABILITY[domain] || SOURCE_RELIABILITY['default'];
}

function formatArticle(article) {
  const score = getReliabilityScore(article.url);
  return {
    title: article.title,
    description: article.description || 'No description available.',
    url: article.url,
    imageUrl: article.urlToImage,
    source: article.source?.name || 'Unknown',
    publishedAt: article.publishedAt,
    accuracyScore: score,
    accuracyLabel: score >= 90 ? 'High' : score >= 75 ? 'Medium' : 'Low',
  };
}

async function getTopHeadlines(country = null, category = null) {
  const cacheKey = `headlines_${country}_${category}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const params = { apiKey: NEWS_API_KEY, pageSize: 20, language: 'en' };
  if (country && COUNTRY_CODES[country]) params.country = COUNTRY_CODES[country];
  if (category) params.category = category;

  const res = await axios.get(`${NEWS_API_BASE}/top-headlines`, { params });
  const articles = res.data.articles
    .filter(a => a.title && a.title !== '[Removed]' && a.url)
    .map(formatArticle);

  cache.set(cacheKey, articles);
  return articles;
}

async function searchNews(query, page = 1) {
  const cacheKey = `search_${query}_${page}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const params = {
    apiKey: NEWS_API_KEY,
    q: query,
    pageSize: 20,
    page,
    language: 'en',
    sortBy: 'publishedAt',
  };

  const res = await axios.get(`${NEWS_API_BASE}/everything`, { params });
  const articles = res.data.articles
    .filter(a => a.title && a.title !== '[Removed]' && a.url)
    .map(formatArticle);

  cache.set(cacheKey, articles);
  return articles;
}

async function getPersonalizedFeed(interests, country) {
  const query = interests.slice(0, 3).join(' OR ');
  const [interestNews, topNews] = await Promise.all([
    searchNews(query),
    getTopHeadlines(country),
  ]);

  // Merge: top news first, then interest-based, deduplicate by title
  const seen = new Set();
  const merged = [...topNews, ...interestNews].filter(a => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });

  return merged;
}

module.exports = { getTopHeadlines, searchNews, getPersonalizedFeed };
