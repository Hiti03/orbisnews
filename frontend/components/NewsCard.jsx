import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { toggleBookmark, isBookmarked } from '../services/bookmarks';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function AccuracyBadge({ accuracy }) {
  const color = accuracy?.color || '#888';
  return (
    <View style={[badge.wrap, { borderColor: color }]}>
      <View style={[badge.dot, { backgroundColor: color }]} />
      <Text style={[badge.text, { color }]}>
        Source credibility: {accuracy?.label || 'Unknown'} ({accuracy?.score}%)
      </Text>
    </View>
  );
}

function LiveBadge() {
  return (
    <View style={live.wrap}>
      <View style={live.dot} />
      <Text style={live.text}>LIVE</Text>
    </View>
  );
}

// bookmarkedOverride: pass true to force-show as bookmarked (e.g. from Bookmarks screen)
// onBookmarkChange: called after toggle (optional)
export default function NewsCard({ article, showLiveBadge = false, bookmarkedOverride, onBookmarkChange }) {
  const { theme } = useTheme();
  const router = useRouter();
  const [imgFailed, setImgFailed] = useState(false);
  const [saved, setSaved] = useState(bookmarkedOverride ?? false);

  useEffect(() => {
    if (bookmarkedOverride !== undefined) { setSaved(bookmarkedOverride); return; }
    isBookmarked(article.id).then(setSaved);
  }, [article.id, bookmarkedOverride]);

  const showImage = article.imageUrl && !imgFailed;

  function openDetail() {
    router.push({ pathname: '/article', params: { data: JSON.stringify(article) } });
  }

  async function handleBookmark() {
    const next = await toggleBookmark(article);
    setSaved(next);
    onBookmarkChange?.(next);
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={openDetail}
      activeOpacity={0.85}
    >
      {showImage ? (
        <Image
          source={{ uri: article.imageUrl }}
          style={styles.image}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <View style={[styles.imgPlaceholder, { backgroundColor: theme.border }]}>
          <Text style={styles.placeholderEmoji}>📰</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.sourceRow}>
            {showLiveBadge && article.isLive && <LiveBadge />}
            <Text style={[styles.source, { color: theme.primary }]} numberOfLines={1}>
              {article.source}
            </Text>
          </View>
          <View style={styles.topRight}>
            <Text style={[styles.time, { color: theme.subtext }]}>
              {timeAgo(article.publishedAt)}
            </Text>
            <TouchableOpacity
              onPress={handleBookmark}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.bookmarkIcon, saved && styles.bookmarkActive]}>🔖</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text }]} numberOfLines={3}>
          {article.title}
        </Text>

        {!!article.description && (
          <Text style={[styles.desc, { color: theme.subtext }]} numberOfLines={2}>
            {article.description}
          </Text>
        )}

        <AccuracyBadge accuracy={article.accuracy} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, marginBottom: 14, borderWidth: 1, overflow: 'hidden' },
  image: { width: '100%', height: 190, resizeMode: 'cover' },
  imgPlaceholder: {
    width: '100%', height: 90,
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderEmoji: { fontSize: 32 },
  body: { padding: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  source: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', flexShrink: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { fontSize: 11 },
  bookmarkIcon: { fontSize: 14, opacity: 0.25 },
  bookmarkActive: { opacity: 1 },
  title: { fontSize: 15, fontWeight: '600', lineHeight: 22, marginBottom: 6 },
  desc: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
});

const badge = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  text: { fontSize: 11, fontWeight: '600' },
});

const live = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#e74c3c', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff', marginRight: 3 },
  text: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
});
