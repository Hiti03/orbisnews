import {
  View, Text, StyleSheet, TextInput, FlatList, ScrollView,
  ActivityIndicator, TouchableOpacity, Keyboard,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import NewsCard from '../../components/NewsCard';
import { searchNews, fetchTrending, fetchHeadlines, fetchXTrending } from '../../services/newsApi';

const CATEGORIES = [
  { id: 'breaking',      label: '🔴 Breaking',     type: 'trending' },
  { id: 'technology',    label: '💻 Tech',           type: 'headlines', cat: 'technology' },
  { id: 'business',      label: '💼 Business',       type: 'headlines', cat: 'business' },
  { id: 'politics',      label: '🏛️ Politics',       type: 'search',    q: 'politics government' },
  { id: 'sports',        label: '⚽ Sports',          type: 'headlines', cat: 'sports' },
  { id: 'science',       label: '🔬 Science',         type: 'headlines', cat: 'science' },
  { id: 'health',        label: '🏥 Health',          type: 'headlines', cat: 'health' },
  { id: 'entertainment', label: '🎬 Entertainment',   type: 'headlines', cat: 'entertainment' },
  { id: 'world',         label: '🌍 World',           type: 'search',    q: 'world news international' },
  { id: 'climate',       label: '🌱 Climate',         type: 'search',    q: 'climate change environment' },
  { id: 'india',         label: '🇮🇳 India',           type: 'search',    q: 'India news' },
  { id: 'cricket',       label: '🏏 Cricket',          type: 'search',    q: 'cricket IPL' },
  { id: 'ai',            label: '🤖 AI',               type: 'search',    q: 'artificial intelligence AI' },
  { id: 'space',         label: '🚀 Space',             type: 'search',    q: 'space NASA SpaceX' },
];

const SORT_OPTIONS = [
  { key: 'publishedAt', label: '🕐 Latest' },
  { key: 'relevancy',   label: '🎯 Relevant' },
  { key: 'popularity',  label: '🔥 Popular' },
];

const TIME_OPTIONS = [
  { key: '',    label: 'Any time' },
  { key: '24h', label: 'Today' },
  { key: '7d',  label: 'This week' },
];

const STORAGE_KEY = 'recent_searches';
const MAX_RECENT = 8;
const PAGE_SIZE = 50;

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function TrendingRow({ article, theme, onPress }) {
  return (
    <TouchableOpacity
      style={[tr.item, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={tr.left}>
        {article.isLive && <View style={tr.liveDot} />}
        <View style={tr.textWrap}>
          <Text style={[tr.title, { color: theme.text }]} numberOfLines={2}>
            {article.title}
          </Text>
          <Text style={[tr.meta, { color: theme.subtext }]}>
            {article.source} · {timeAgo(article.publishedAt)}
          </Text>
        </View>
      </View>
      <Text style={[tr.arrow, { color: theme.subtext }]}>›</Text>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mode, setMode] = useState('browse');
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('publishedAt');
  const [timeFilter, setTimeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [xTrends, setXTrends] = useState([]);
  const [xLoading, setXLoading] = useState(true);
  const [userCountry, setUserCountry] = useState('worldwide');

  useEffect(() => {
    loadRecentSearches();
    loadBrowseData();
  }, []);

  async function loadBrowseData() {
    const country = (await AsyncStorage.getItem('user_country')) || 'worldwide';
    setUserCountry(country);
    loadTrending();
    loadXTrends(country);
  }

  async function loadRecentSearches() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch (_) {}
  }

  async function saveRecentSearch(term) {
    try {
      const updated = [term, ...recentSearches.filter(r => r !== term)].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  }

  async function removeRecentSearch(term) {
    try {
      const updated = recentSearches.filter(r => r !== term);
      setRecentSearches(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  }

  async function clearAllRecent() {
    setRecentSearches([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  async function loadTrending() {
    setTrendingLoading(true);
    try {
      const data = await fetchTrending();
      setTrending(data);
    } catch (_) {}
    setTrendingLoading(false);
  }

  async function loadXTrends(country) {
    setXLoading(true);
    try {
      const data = await fetchXTrending(country);
      setXTrends(data.trends || []);
    } catch (_) {}
    setXLoading(false);
  }

  async function doSearch(term, pg = 1, sort = sortBy, time = timeFilter) {
    if (!term.trim()) return;
    Keyboard.dismiss();

    if (pg === 1) {
      setLoading(true);
      setArticles([]);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await searchNews(term.trim(), { page: pg, sortBy: sort, from: time });
      const newArticles = result.articles || [];
      if (pg === 1) {
        setArticles(newArticles);
        setSearchTerm(term.trim());
        setMode('results');
        saveRecentSearch(term.trim());
      } else {
        setArticles(prev => [...prev, ...newArticles]);
      }
      setTotalResults(result.totalResults || 0);
      setPage(pg);
      setHasMore(newArticles.length === PAGE_SIZE);
    } catch (e) {
      setError('Search failed. Make sure the backend is running.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function handleCategoryPress(cat) {
    Keyboard.dismiss();
    if (cat.type === 'trending') {
      setMode('results');
      setLoading(true);
      setArticles([]);
      setError(null);
      setSearchTerm(cat.label);
      try {
        const data = await fetchTrending();
        setArticles(data);
        setTotalResults(data.length);
        setHasMore(false);
      } catch (e) {
        setError('Failed to load breaking news.');
      } finally {
        setLoading(false);
      }
    } else if (cat.type === 'headlines') {
      setMode('results');
      setLoading(true);
      setArticles([]);
      setError(null);
      setSearchTerm(cat.label);
      try {
        const data = await fetchHeadlines(cat.cat);
        setArticles(data);
        setTotalResults(data.length);
        setHasMore(false);
      } catch (e) {
        setError('Failed to load headlines.');
      } finally {
        setLoading(false);
      }
    } else {
      setQuery(cat.q);
      doSearch(cat.q);
    }
  }

  function clearSearch() {
    setQuery('');
    setArticles([]);
    setMode('browse');
    setError(null);
    setSortBy('publishedAt');
    setTimeFilter('');
    setPage(1);
    setSearchTerm('');
  }

  function applySort(key) {
    setSortBy(key);
    if (mode === 'results' && searchTerm) doSearch(searchTerm, 1, key, timeFilter);
  }

  function applyTime(key) {
    setTimeFilter(key);
    if (mode === 'results' && searchTerm) doSearch(searchTerm, 1, sortBy, key);
  }

  function loadMore() {
    if (!loadingMore && hasMore && searchTerm) doSearch(searchTerm, page + 1);
  }

  const s = makeStyles(theme);

  const listHeader = mode === 'results' ? (
    <View>
      <View style={s.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[s.filterChip, sortBy === opt.key && s.filterChipActive]}
              onPress={() => applySort(opt.key)}
            >
              <Text style={[s.filterChipText, sortBy === opt.key && s.filterChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={s.filterDivider} />
          {TIME_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[s.filterChip, timeFilter === opt.key && s.filterChipActive]}
              onPress={() => applyTime(opt.key)}
            >
              <Text style={[s.filterChipText, timeFilter === opt.key && s.filterChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {!loading && (
        <Text style={s.resultCount}>
          {totalResults > 0
            ? `${totalResults.toLocaleString()} results for "${searchTerm}"`
            : `Results for "${searchTerm}"`}
        </Text>
      )}
    </View>
  ) : null;

  return (
    <View style={s.container}>
      {/* ── Fixed Header ── */}
      <View style={s.header}>
        <Text style={s.title}>🔍 Search News</Text>
        <View style={s.searchBox}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={[s.input, { color: theme.text }]}
            placeholder="Search topics, people, events..."
            placeholderTextColor={theme.subtext}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => doSearch(query)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {(query.length > 0 || mode === 'results') && (
            <TouchableOpacity onPress={clearSearch} style={s.clearBtn}>
              <Text style={[s.clearText, { color: theme.subtext }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[s.catChip, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => handleCategoryPress(cat)}
            >
              <Text style={[s.catChipText, { color: theme.text }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {mode === 'browse' ? (
        <ScrollView contentContainerStyle={s.browseContent} showsVerticalScrollIndicator={false}>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Recent</Text>
                <TouchableOpacity onPress={clearAllRecent}>
                  <Text style={[s.actionLink, { color: theme.primary }]}>Clear all</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map(term => (
                <TouchableOpacity
                  key={term}
                  style={[s.recentRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => { setQuery(term); doSearch(term); }}
                >
                  <Text style={s.recentIcon}>🕐</Text>
                  <Text style={[s.recentText, { color: theme.text }]} numberOfLines={1}>{term}</Text>
                  <TouchableOpacity onPress={() => removeRecentSearch(term)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={[s.recentRemove, { color: theme.subtext }]}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 𝕏 Trending */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>𝕏 Trending on X</Text>
              <TouchableOpacity onPress={() => loadXTrends(userCountry)}>
                <Text style={[s.actionLink, { color: theme.primary }]}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {xLoading ? (
              <View style={s.loaderRow}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[s.loaderText, { color: theme.subtext }]}>Fetching X trends...</Text>
              </View>
            ) : xTrends.length > 0 ? (
              <View style={s.xGrid}>
                {xTrends.slice(0, 20).map(item => (
                  <TouchableOpacity
                    key={`${item.rank}_${item.tag}`}
                    style={[s.xChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => { setQuery(item.tag); doSearch(item.tag); }}
                  >
                    <Text style={[s.xRank, { color: theme.subtext }]}>{item.rank}</Text>
                    <View style={s.xTextWrap}>
                      <Text style={[s.xTag, { color: theme.text }]} numberOfLines={1}>{item.tag}</Text>
                      {item.count ? (
                        <Text style={[s.xCount, { color: theme.subtext }]}>{item.count}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[s.xUnavail, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={s.xUnavailEmoji}>𝕏</Text>
                <Text style={[s.xUnavailText, { color: theme.subtext }]}>
                  X trends unavailable right now
                </Text>
              </View>
            )}
          </View>

          {/* 🔥 Trending News */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>🔥 Trending News</Text>
              <TouchableOpacity onPress={loadTrending}>
                <Text style={[s.actionLink, { color: theme.primary }]}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {trendingLoading ? (
              <View style={s.loaderRow}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[s.loaderText, { color: theme.subtext }]}>Loading live news...</Text>
              </View>
            ) : trending.length > 0 ? (
              trending.slice(0, 10).map(article => (
                <TrendingRow
                  key={article.id}
                  article={article}
                  theme={theme}
                  onPress={() => router.push({ pathname: '/article', params: { data: JSON.stringify(article) } })}
                />
              ))
            ) : (
              <Text style={[s.emptyNote, { color: theme.subtext }]}>
                Could not load trending news.
              </Text>
            )}
          </View>
        </ScrollView>
      ) : (
        <>
          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[s.loadingText, { color: theme.subtext }]}>Searching...</Text>
            </View>
          ) : error ? (
            <View style={s.center}>
              <Text style={s.errorEmoji}>⚠️</Text>
              <Text style={[s.errorText, { color: theme.subtext }]}>{error}</Text>
              <TouchableOpacity style={[s.retryBtn, { backgroundColor: theme.primary }]} onPress={() => doSearch(searchTerm)}>
                <Text style={s.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={articles}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <NewsCard article={item} />}
              contentContainerStyle={s.list}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={listHeader}
              ListEmptyComponent={
                <View style={s.emptyState}>
                  <Text style={s.emptyEmoji}>🔍</Text>
                  <Text style={[s.emptyTitle, { color: theme.text }]}>No results found</Text>
                  <Text style={[s.emptyNote, { color: theme.subtext }]}>
                    Try different keywords or remove filters
                  </Text>
                </View>
              }
              ListFooterComponent={
                articles.length > 0 ? (
                  <View style={s.footer}>
                    {loadingMore ? (
                      <ActivityIndicator color={theme.primary} />
                    ) : hasMore ? (
                      <TouchableOpacity
                        style={[s.loadMoreBtn, { borderColor: theme.primary }]}
                        onPress={loadMore}
                      >
                        <Text style={[s.loadMoreText, { color: theme.primary }]}>Load more</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={[s.endText, { color: theme.subtext }]}>You're all caught up</Text>
                    )}
                  </View>
                ) : null
              }
            />
          )}
        </>
      )}
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      paddingTop: 52, paddingHorizontal: 16, paddingBottom: 8,
      borderBottomWidth: 1, borderBottomColor: theme.border,
      backgroundColor: theme.background,
    },
    title: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 12 },
    searchBox: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.card, borderRadius: 14,
      borderWidth: 1, borderColor: theme.border,
      paddingHorizontal: 12, marginBottom: 12,
    },
    searchIcon: { fontSize: 16, marginRight: 8 },
    input: { flex: 1, fontSize: 15, paddingVertical: 13 },
    clearBtn: { padding: 6 },
    clearText: { fontSize: 14 },
    categories: { paddingVertical: 4, paddingRight: 16 },
    catChip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      borderWidth: 1, marginRight: 8,
    },
    catChipText: { fontSize: 13, fontWeight: '500' },

    browseContent: { paddingBottom: 40 },
    section: { paddingHorizontal: 16, marginTop: 22 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.subtext, textTransform: 'uppercase', letterSpacing: 0.8 },
    actionLink: { fontSize: 13, fontWeight: '600' },

    recentRow: {
      flexDirection: 'row', alignItems: 'center',
      borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1,
    },
    recentIcon: { fontSize: 14, marginRight: 10 },
    recentText: { flex: 1, fontSize: 14 },
    recentRemove: { fontSize: 12, paddingLeft: 8 },

    // X Trends
    xGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    xChip: {
      flexDirection: 'row', alignItems: 'center',
      borderRadius: 10, borderWidth: 1,
      paddingHorizontal: 10, paddingVertical: 8,
      maxWidth: '48%', minWidth: '45%',
    },
    xRank: { fontSize: 11, fontWeight: '700', marginRight: 6, minWidth: 16 },
    xTextWrap: { flex: 1 },
    xTag: { fontSize: 13, fontWeight: '600' },
    xCount: { fontSize: 10, marginTop: 1 },
    xUnavail: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderRadius: 12, padding: 16, borderWidth: 1,
    },
    xUnavailEmoji: { fontSize: 22, fontWeight: '900' },
    xUnavailText: { fontSize: 13 },

    loaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    loaderText: { fontSize: 13 },

    filterRow: { borderBottomWidth: 1, borderBottomColor: theme.border },
    filterScroll: { paddingHorizontal: 16, paddingVertical: 10 },
    filterChip: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, marginRight: 6,
    },
    filterChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    filterChipText: { fontSize: 12, color: theme.subtext, fontWeight: '500' },
    filterChipTextActive: { color: '#fff', fontWeight: '700' },
    filterDivider: { width: 1, backgroundColor: theme.border, marginHorizontal: 4 },

    resultCount: {
      fontSize: 12, color: theme.subtext,
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },

    list: { padding: 16, paddingBottom: 20 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    loadingText: { marginTop: 12, fontSize: 14 },
    errorEmoji: { fontSize: 36, marginBottom: 12 },
    errorText: { textAlign: 'center', fontSize: 14, lineHeight: 22 },
    retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
    retryText: { color: '#fff', fontWeight: '600' },
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyEmoji: { fontSize: 40, marginBottom: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
    emptyNote: { fontSize: 13, textAlign: 'center' },
    footer: { paddingVertical: 20, alignItems: 'center' },
    loadMoreBtn: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 10 },
    loadMoreText: { fontSize: 14, fontWeight: '600' },
    endText: { fontSize: 13 },
  });
}

const tr = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  liveDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#e74c3c',
    marginTop: 5, marginRight: 8, flexShrink: 0,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 4 },
  meta: { fontSize: 11 },
  arrow: { fontSize: 18, marginLeft: 8 },
});
