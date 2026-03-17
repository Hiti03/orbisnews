const BASE_URL = 'https://backend-production-19dc.up.railway.app/api';

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data;
}

export async function fetchTopNews(country, forceRefresh = false) {
  const params = new URLSearchParams({ country });
  if (forceRefresh) params.set('refresh', 'true');
  const data = await apiFetch(`${BASE_URL}/news/top?${params}`);
  return data.articles || [];
}

export async function fetchTrending(forceRefresh = false) {
  const url = forceRefresh
    ? `${BASE_URL}/news/trending?refresh=true`
    : `${BASE_URL}/news/trending`;
  const data = await apiFetch(url);
  return data.articles || [];
}

export async function fetchHeadlines(category, forceRefresh = false) {
  const params = new URLSearchParams({ category });
  if (forceRefresh) params.set('refresh', 'true');
  const data = await apiFetch(`${BASE_URL}/news/headlines?${params}`);
  return data.articles || [];
}

export async function fetchXTrending(country) {
  const data = await apiFetch(
    `${BASE_URL}/news/x-trending?country=${encodeURIComponent(country)}`
  );
  return data; // { trends, country, updatedAt }
}

export async function fetchPersonalizedFeed(interests, country, forceRefresh = false) {
  const data = await apiFetch(`${BASE_URL}/news/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interests, country, refresh: forceRefresh }),
  });
  return data.articles || [];
}

export async function fetchQuickBites(interests, country, forceRefresh = false) {
  const data = await apiFetch(`${BASE_URL}/news/quickbites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interests, country, refresh: forceRefresh }),
  });
  return data.articles || [];
}

// Returns { articles, totalResults, page }
export async function searchNews(query, options = {}) {
  const { page = 1, sortBy = 'publishedAt', from = '' } = options;
  const params = new URLSearchParams({ q: query, page, sortBy });
  if (from) params.set('from', from);
  return apiFetch(`${BASE_URL}/news/search?${params.toString()}`);
}
