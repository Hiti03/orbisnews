import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useRouter, useFocusEffect } from 'expo-router';
import NewsCard from '../../components/NewsCard';
import SkeletonCard from '../../components/SkeletonCard';
import { fetchPersonalizedFeed } from '../../services/newsApi';

const INTEREST_META = {
  geopolitics:    { label: 'Geopolitics',        emoji: '🌐' },
  technology:     { label: 'Technology',          emoji: '💻' },
  stocks:         { label: 'Stocks & Finance',    emoji: '📈' },
  infrastructure: { label: 'Infrastructure',      emoji: '🏗️' },
  science:        { label: 'Science',             emoji: '🔬' },
  health:         { label: 'Health',              emoji: '🏥' },
  sports:         { label: 'Sports',              emoji: '⚽' },
  entertainment:  { label: 'Entertainment',       emoji: '🎬' },
  environment:    { label: 'Environment',         emoji: '🌱' },
  military:       { label: 'Military & Defence',  emoji: '🛡️' },
  energy:         { label: 'Energy',              emoji: '⚡' },
  space:          { label: 'Space',               emoji: '🚀' },
};

const INTEREST_KEYWORDS = {
  geopolitics:    ['geopolit', 'diplomacy', 'foreign policy', 'international relations', 'sanctions', 'treaty', 'un ', 'nato', 'bilateral', 'summit', 'embassy'],
  technology:     ['tech', 'ai ', 'artificial intelligence', 'software', 'startup', 'app', 'cyber', 'digital', 'internet', 'data', 'cloud', 'robot', 'automation', 'chip', 'semiconductor'],
  stocks:         ['stock', 'market', 'finance', 'economy', 'economic', 'invest', 'trading', 'gdp', 'inflation', 'bank', 'fund', 'revenue', 'profit', 'shares', 'nasdaq', 'sensex', 'nifty', 'dow'],
  infrastructure: ['infrastructure', 'construction', 'highway', 'railway', 'airport', 'bridge', 'urban', 'road', 'port', 'metro', 'transit', 'housing'],
  science:        ['science', 'research', 'discovery', 'study', 'experiment', 'scientist', 'biology', 'physics', 'chemistry', 'genetics', 'dna', 'lab'],
  health:         ['health', 'medic', 'disease', 'pandemic', 'hospital', 'vaccine', 'virus', 'cancer', 'drug', 'patient', 'doctor', 'treatment', 'surgery', 'mental health', 'who '],
  sports:         ['sport', 'cricket', 'football', 'soccer', 'tennis', 'basketball', 'match', 'tournament', 'championship', 'olympic', 'athlete', 'player', 'league', 'ipl', 'fifa', 'formula 1', 'f1'],
  entertainment:  ['entertainment', 'movie', 'film', 'music', 'celebrity', 'actor', 'singer', 'album', 'box office', 'oscar', 'grammy', 'netflix', 'streaming', 'tv show', 'series'],
  environment:    ['environment', 'climate', 'sustainability', 'renewable', 'carbon', 'emission', 'pollution', 'wildfire', 'flood', 'drought', 'deforest', 'green energy', 'solar', 'wind energy'],
  military:       ['military', 'defence', 'defense', 'army', 'navy', 'air force', 'war', 'conflict', 'weapon', 'missile', 'troops', 'soldier', 'attack', 'invasion', 'airstrike'],
  energy:         ['energy', 'oil', 'gas', 'coal', 'petroleum', 'opec', 'electricity', 'nuclear power', 'solar', 'wind power', 'fuel', 'power plant', 'barrel'],
  space:          ['space', 'nasa', 'spacex', 'rocket', 'satellite', 'asteroid', 'mars', 'moon', 'orbit', 'launch', 'isro', 'astronaut', 'telescope', 'galaxy'],
};

const SORT_OPTIONS = [
  { key: 'smart',  label: '✨ Smart' },
  { key: 'latest', label: '🕐 Latest' },
  { key: 'score',  label: '⭐ Top Rated' },
];

export default function FeedScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [interests, setInterests] = useState([]);
  const [country, setCountry] = useState('');
  const [sortBy, setSortBy] = useState('smart');
  const [city, setCity] = useState(null);
  const countryVal = country;

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [storedInterests, storedCountry] = await Promise.all([
        AsyncStorage.getItem('user_interests'),
        AsyncStorage.getItem('user_country'),
      ]);
      const parsed = storedInterests ? JSON.parse(storedInterests) : [];
      const c = storedCountry || 'United States of America';
      setInterests(parsed);
      setCountry(c);
      const detectedCity = await AsyncStorage.getItem('user_city');
      setCity(detectedCity);
      const data = await fetchPersonalizedFeed(parsed, c, isRefresh, false, detectedCity);
      setArticles(data);
    } catch (e) {
      setError('Could not load feed.\nMake sure the backend is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const sorted = useMemo(() => {
    let base = articles;
    if (sortBy === 'score') {
      return [...base].sort((a, b) => (b.accuracy?.score || 0) - (a.accuracy?.score || 0));
    }
    if (sortBy === 'smart') {
      return [...base].sort((a, b) => {
        const scoreA = (a.accuracy?.score || 60) * 0.35 + Math.max(0, 100 - (Date.now() - new Date(a.publishedAt)) / 3600000 * 3.33) * 0.65;
        const scoreB = (b.accuracy?.score || 60) * 0.35 + Math.max(0, 100 - (Date.now() - new Date(b.publishedAt)) / 3600000 * 3.33) * 0.65;
        return scoreB - scoreA;
      });
    }
    return [...base].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [articles, sortBy, activeFilter]);

  const s = makeStyles(theme);

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>📰 My Feed</Text>
        </View>
        <View style={[s.list, { padding: 16 }]}>
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>📰 My Feed</Text>
        </View>
        <View style={s.center}>
          <Text style={s.errorEmoji}>⚠️</Text>
          <Text style={[s.errorText, { color: theme.subtext }]}>{error}</Text>
          <TouchableOpacity style={[s.retryBtn, { backgroundColor: theme.primary }]} onPress={() => loadData()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Empty state: no interests set
  if (interests.length === 0) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>📰 My Feed</Text>
        </View>
        <View style={s.center}>
          <Text style={s.emptyEmoji}>🎯</Text>
          <Text style={[s.emptyTitle, { color: theme.text }]}>No interests set</Text>
          <Text style={[s.emptyNote, { color: theme.subtext }]}>
            Set your interests to get a personalised news feed
          </Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: theme.primary, marginTop: 20 }]}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Text style={s.retryText}>Go to Settings →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const listHeader = (
    <View>
      {/* Sort bar */}
      <View style={s.sortBar}>
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
        <Text style={[s.articleCount, { color: theme.subtext }]}>
          {sorted.length} articles
        </Text>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>📰 My Feed</Text>
          <Text style={[s.subtitle, { color: theme.subtext }]}>
            {interests.length} interest{interests.length !== 1 ? 's' : ''} · {city ? `${city}, ` : ''}{country}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.editBtn, { borderColor: theme.border }]}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Text style={[s.editBtnText, { color: theme.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <NewsCard article={item} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyFiltered}>
            <Text style={s.emptyEmoji}>🗞️</Text>
            <Text style={[s.emptyTitle, { color: theme.text }]}>The presses are quiet.</Text>
            <Text style={[s.emptyNote, { color: theme.subtext }]}>
              You've seen it all. Impressive. Pull down to check for new stories.
            </Text>
          </View>
        }
      />}
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: theme.border,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    },
    title: { fontSize: 22, fontWeight: 'bold', color: theme.text },
    subtitle: { fontSize: 12, marginTop: 3 },
    editBtn: {
      borderWidth: 1, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    editBtnText: { fontSize: 13, fontWeight: '600' },

    filterBar: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    filterChip: {
      flexShrink: 0,
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
      marginRight: 8,
    },
    filterChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    filterChipText: { fontSize: 12, color: theme.text, fontWeight: '500' },
    filterChipTextActive: { color: '#fff', fontWeight: '700' },

    sortBar: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: theme.border, gap: 8,
    },
    sortChip: {
      paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
    },
    sortChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    sortChipText: { fontSize: 12, color: theme.subtext, fontWeight: '500' },
    sortChipTextActive: { color: '#fff', fontWeight: '700' },
    articleCount: { fontSize: 11, marginLeft: 'auto' },

    list: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    loadingText: { marginTop: 12, fontSize: 14, color: theme.subtext, textAlign: 'center', alignSelf: 'stretch' },
    errorEmoji: { fontSize: 40, marginBottom: 12 },
    errorText: { textAlign: 'center', fontSize: 14, lineHeight: 22 },
    retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
    retryText: { color: '#fff', fontWeight: '600' },

    emptyEmoji: { fontSize: 44, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    emptyNote: { fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
    emptyFiltered: { alignItems: 'center', paddingTop: 40 },
    emptyLink: { marginTop: 14, fontSize: 14, fontWeight: '600' },
  });
}
