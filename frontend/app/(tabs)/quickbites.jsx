import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Share,
  useWindowDimensions, Platform, RefreshControl,
} from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchQuickBites } from '../../services/newsApi';
import { toggleBookmark, isBookmarked } from '../../services/bookmarks';

const CARD_COLORS = ['#0d1b2a', '#1a0a2e', '#0a1a0d', '#2a0d0a', '#0a1428', '#1a1002'];

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function wordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}

function BiteCard({ article, height, index, total }) {
  const router = useRouter();
  const [imgFailed, setImgFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const hasImg = article.imageUrl && !imgFailed;
  const fallbackColor = CARD_COLORS[index % CARD_COLORS.length];
  const accuracyColor = article.accuracy?.color || '#888';
  const wc = wordCount(article.bite);

  useEffect(() => {
    isBookmarked(article.id).then(setSaved);
  }, [article.id]);

  async function handleShare() {
    try {
      await Share.share({
        message: `${article.title}\n\n${article.bite || ''}\n\nRead more: ${article.url}`,
        title: article.title,
      });
    } catch (_) {}
  }

  async function handleBookmark() {
    const next = await toggleBookmark(article);
    setSaved(next);
  }

  function openDetail() {
    router.push({ pathname: '/article', params: { data: JSON.stringify(article) } });
  }

  return (
    <TouchableOpacity
      style={[styles.card, { height }]}
      onPress={openDetail}
      activeOpacity={0.95}
    >
      {/* Always-visible fallback so there's no blank white flash while image loads */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fallbackColor }]} />

      {/* Full-screen image */}
      {hasImg && (
        <Image
          source={{ uri: article.imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          fadeDuration={Platform.OS === 'android' ? 0 : 300}
          onError={() => setImgFailed(true)}
        />
      )}

      {/* Single full overlay — no gaps, no bright stripe */}
      <View style={styles.overlay} />

      {/* ── TOP ROW ── source · time · counter */}
      <View style={styles.topRow}>
        <View style={styles.sourcePill}>
          <Text style={styles.sourceText} numberOfLines={1}>{article.source}</Text>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.timeText}>{timeAgo(article.publishedAt)}</Text>
          <Text style={styles.counterText}>{index + 1}/{total}</Text>
        </View>
      </View>

      {/* ── BOTTOM CONTENT ── */}
      <View style={styles.content}>
        {/* Live badge */}
        {article.isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        {/* Source credibility */}
        <View style={styles.accuracyRow}>
          <View style={[styles.accuracyDot, { backgroundColor: accuracyColor }]} />
          <Text style={[styles.accuracyLabel, { color: accuracyColor }]}>
            Source credibility: {article.accuracy?.label} ({article.accuracy?.score}%)
          </Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline} numberOfLines={3}>{article.title}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* 60-word Bite summary — Inshorts-style */}
        {!!article.bite && (
          <Text style={styles.bite}>{article.bite}</Text>
        )}

        {/* Footer: word count + actions */}
        <View style={styles.footer}>
          {wc > 0 && (
            <View style={styles.wordCountBadge}>
              <Text style={styles.wordCountText}>{wc} words</Text>
            </View>
          )}
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleBookmark} style={styles.actionBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.actionIcon, saved && styles.actionIconActive]}>🔖</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.actionBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.actionIcon}>↑</Text>
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openDetail} style={styles.readMoreBtn}>
              <Text style={styles.readMoreText}>Read more</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Swipe hint pill */}
      <View style={styles.swipePillWrap} pointerEvents="none">
        <View style={styles.swipePill} />
      </View>
    </TouchableOpacity>
  );
}

export default function QuickBitesScreen() {
  const { height } = useWindowDimensions();
  const [listHeight, setListHeight] = useState(height);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  // Prefetch next 5 images when current index changes
  useEffect(() => {
    if (!articles.length) return;
    for (let i = currentIndex + 1; i <= currentIndex + 5 && i < articles.length; i++) {
      if (articles[i]?.imageUrl) {
        Image.prefetch(articles[i].imageUrl).catch(() => {});
      }
    }
  }, [currentIndex, articles]);

  async function load(isRefresh = false) {
    setError(null);
    try {
      const [si, sc] = await Promise.all([
        AsyncStorage.getItem('user_interests'),
        AsyncStorage.getItem('user_country'),
      ]);
      const interests = si ? JSON.parse(si) : [];
      const country = sc || 'United States of America';

      if (!isRefresh) {
        const cached = await AsyncStorage.getItem('quickbites_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          setArticles(parsed);
          setLoading(false);
          parsed.slice(0, 5).forEach(a => { if (a.imageUrl) Image.prefetch(a.imageUrl).catch(() => {}); });
          fetchQuickBites(interests, country, false).then(fresh => {
            if (fresh.length) {
              setArticles(fresh);
              AsyncStorage.setItem('quickbites_cache', JSON.stringify(fresh)).catch(() => {});
              fresh.slice(0, 5).forEach(a => { if (a.imageUrl) Image.prefetch(a.imageUrl).catch(() => {}); });
            }
          }).catch(() => {});
          return;
        }
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await fetchQuickBites(interests, country, isRefresh);
      setArticles(data);
      AsyncStorage.setItem('quickbites_cache', JSON.stringify(data)).catch(() => {});
      data.slice(0, 5).forEach(a => { if (a.imageUrl) Image.prefetch(a.imageUrl).catch(() => {}); });
    } catch (e) {
      setError('Could not load Quick Bites.\n' + e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f8ef7" />
        <Text style={styles.loadingText}>Loading Quick Bites…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.loadingText}>{error}</Text>
        <TouchableOpacity onPress={() => load()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={articles}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <BiteCard article={item} height={listHeight} index={index} total={articles.length} />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        getItemLayout={(_, index) => ({
          length: listHeight, offset: listHeight * index, index,
        })}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={11}
        onLayout={e => setListHeight(e.nativeEvent.layout.height)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#4f8ef7"
            colors={['#4f8ef7']}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.errorEmoji}>🛋️</Text>
            <Text style={styles.loadingText}>You're ahead of the news cycle.{'\n'}Nothing new since you last checked.{'\n'}Pull down to see if the world caught up.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  card: { width: '100%', overflow: 'hidden' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  topRow: {
    position: 'absolute', top: 52, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  sourcePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, maxWidth: '60%',
  },
  sourceText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  counterText: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },

  content: {
    position: 'absolute', bottom: 40, left: 16, right: 16,
  },

  liveBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#e74c3c', borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', marginRight: 4 },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  accuracyRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  accuracyDot: { width: 6, height: 6, borderRadius: 3 },
  accuracyLabel: { fontSize: 11, fontWeight: '700' },

  headline: {
    color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 28, marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },

  divider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 10,
  },

  bite: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14, lineHeight: 22, marginBottom: 14,
    letterSpacing: 0.1,
  },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  wordCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  wordCountText: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
  actionIconActive: { color: '#fff', opacity: 1 },
  actionText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  readMoreBtn: {
    backgroundColor: '#4f8ef7', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  readMoreText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  swipePillWrap: {
    position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center',
  },
  swipePill: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#0a0a1a' },
  loadingText: { color: 'rgba(255,255,255,0.65)', marginTop: 12, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  errorEmoji: { fontSize: 40, marginBottom: 8 },
  retryBtn: { marginTop: 20, backgroundColor: '#4f8ef7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
