import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Switch } from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import NewsCard from '../../components/NewsCard';
import SkeletonCard from '../../components/SkeletonCard';
import { fetchTopNews } from '../../services/newsApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SORT_OPTIONS = [
  { key: 'smart',  label: '✨ Smart' },
  { key: 'latest', label: '🕐 Latest' },
  { key: 'score',  label: '⭐ Top Rated' },
  { key: 'live',   label: '🔴 Live' },
];

export default function HomeScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [country, setCountry] = useState('');
  const [viewMode, setViewMode] = useState('country'); // 'world' | 'country'
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('smart');

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('user_country').then(c => {
        const name = c || 'United States of America';
        setCountry(prev => {
          if (prev !== name) loadNews(name, viewMode);
          return name;
        });
      });
    }, [viewMode])
  );

  async function loadNews(countryName, mode, isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const target = (mode || viewMode) === 'world' ? 'world' : (countryName || country);
      const data = await fetchTopNews(target, isRefresh);
      setArticles(data);
    } catch (e) {
      setError(`Could not load news.\n${e.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function switchMode(mode) {
    setViewMode(mode);
    loadNews(country, mode);
  }

  const sorted = useMemo(() => {
    if (sortBy === 'live') {
      return [...articles]
        .filter(a => a.isLive)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }
    if (sortBy === 'score') {
      return [...articles].sort((a, b) => (b.accuracy?.score || 0) - (a.accuracy?.score || 0));
    }
    if (sortBy === 'smart') {
      return [...articles].sort((a, b) => {
        const scoreA = (a.accuracy?.score || 60) * 0.35 + Math.max(0, 100 - (Date.now() - new Date(a.publishedAt)) / 3600000 * 3.33) * 0.65;
        const scoreB = (b.accuracy?.score || 60) * 0.35 + Math.max(0, 100 - (Date.now() - new Date(b.publishedAt)) / 3600000 * 3.33) * 0.65;
        return scoreB - scoreA;
      });
    }
    return [...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [articles, sortBy]);

  const insets = useSafeAreaInsets();
  const s = makeStyles(theme, insets);

  // Short display name for the country chip (max 12 chars)
  const shortCountry = country.length > 14 ? country.split(' ').slice(-1)[0] : country;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.title}>🌍 Top Stories</Text>
          <Text style={s.sub} numberOfLines={1}>
            {viewMode === 'world' ? 'Worldwide' : country}
          </Text>
        </View>
        <View style={s.toggleRow}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/bookmarks')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.bookmarkBtn}>🔖</Text>
          </TouchableOpacity>
          <Text style={s.toggleLabel}>{isDark ? '🌙' : '☀️'}</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#ccc', true: theme.primary }}
            thumbColor="#fff"
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
        </View>
      </View>

      {/* World / Country toggle */}
      <View style={s.modeBar}>
        <TouchableOpacity
          style={[s.modeChip, viewMode === 'world' && s.modeChipActive]}
          onPress={() => switchMode('world')}
        >
          <Text style={[s.modeChipText, viewMode === 'world' && s.modeChipTextActive]}>
            🌍 World
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeChip, viewMode === 'country' && s.modeChipActive]}
          onPress={() => switchMode('country')}
        >
          <Text style={[s.modeChipText, viewMode === 'country' && s.modeChipTextActive]} numberOfLines={1}>
            📍 {shortCountry}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort bar */}
      {!loading && !error && (
        <View style={s.sortBar}>
          <Text style={s.sortLabel}>Sort:</Text>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[s.sortChip, sortBy === opt.key && s.sortChipActive]}
              onPress={() => setSortBy(opt.key)}
            >
              <Text style={[s.sortChipText, sortBy === opt.key && s.sortChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={s.list}>
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorEmoji}>⚠️</Text>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => loadNews(country, viewMode)}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <NewsCard article={item} showLiveBadge={sortBy === 'live'} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNews(country, viewMode, true)}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <Text style={s.emptyText}>
              {sortBy === 'live' ? 'No live news right now. Check back soon.' : 'No articles found.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

function makeStyles(theme, insets = { top: 0 }) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: theme.border,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    },
    headerLeft: { flex: 1, marginRight: 12 },
    title: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    sub: { fontSize: 12, color: theme.subtext, marginTop: 2 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    toggleLabel: { fontSize: 18 },
    bookmarkBtn: { fontSize: 20 },

    modeBar: {
      flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
      gap: 8, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    modeChip: {
      flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10,
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
    },
    modeChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    modeChipText: { fontSize: 13, fontWeight: '600', color: theme.subtext },
    modeChipTextActive: { color: '#fff' },

    sortBar: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    sortLabel: { color: theme.subtext, fontSize: 12, marginRight: 4 },
    sortChip: {
      paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
    },
    sortChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    sortChipText: { color: theme.subtext, fontSize: 12, fontWeight: '500' },
    sortChipTextActive: { color: '#fff', fontWeight: '700' },
    list: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    loadingText: { color: theme.subtext, marginTop: 12, fontSize: 14 },
    errorEmoji: { fontSize: 40, marginBottom: 12 },
    errorText: { color: theme.subtext, textAlign: 'center', fontSize: 14, lineHeight: 22 },
    retryBtn: { marginTop: 16, backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
    retryText: { color: '#fff', fontWeight: '600' },
    emptyText: { color: theme.subtext, textAlign: 'center', marginTop: 40 },
  });
}
