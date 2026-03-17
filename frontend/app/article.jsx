import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, Linking, Platform, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { toggleBookmark, isBookmarked } from '../services/bookmarks';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ArticleDetail() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data } = useLocalSearchParams();
  const [bookmarked, setBookmarked] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  let article = null;
  try { article = data ? JSON.parse(data) : null; } catch {}

  useEffect(() => {
    if (!article?.id) return;
    isBookmarked(article.id).then(setBookmarked);
  }, [article?.id]);

  const s = makeStyles(theme);

  if (!article) {
    return (
      <View style={[s.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.subtext, fontSize: 16 }}>Article not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.primary, fontSize: 15 }}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const accuracyColor = article.accuracy?.color || '#888';
  const showImage = article.imageUrl && !imgFailed;
  const bodyText = article.body || article.description || '';

  async function handleBookmark() {
    const next = await toggleBookmark(article);
    setBookmarked(next);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `${article.title}\n\nRead more: ${article.url}`,
        title: article.title,
      });
    } catch {}
  }

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={s.headerBtn}
        >
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={s.headerRight}>
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={s.headerBtn}
          >
            <Text style={s.headerBtnText}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBookmark}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={s.headerBtn}
          >
            <Text style={[s.bookmarkIcon, bookmarked && s.bookmarkActive]}>🔖</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {showImage ? (
          <Image
            source={{ uri: article.imageUrl }}
            style={s.heroImage}
            resizeMode="cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <View style={[s.imgPlaceholder, { backgroundColor: theme.card }]}>
            <Text style={s.placeholderEmoji}>📰</Text>
          </View>
        )}

        <View style={s.content}>
          {/* Source · time row */}
          <View style={s.metaRow}>
            <Text style={[s.source, { color: theme.primary }]}>{article.source}</Text>
            {article.isLive && (
              <View style={s.liveBadge}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>LIVE</Text>
              </View>
            )}
            <Text style={[s.time, { color: theme.subtext }]}>{timeAgo(article.publishedAt)}</Text>
          </View>

          {/* Title */}
          <Text style={[s.title, { color: theme.text }]}>{article.title}</Text>

          {/* Accuracy badge */}
          <View style={s.accuracyRow}>
            <View style={[s.accuracyDot, { backgroundColor: accuracyColor }]} />
            <Text style={[s.accuracyLabel, { color: accuracyColor }]}>
              {article.accuracy?.label} · {article.accuracy?.score}% reliability
            </Text>
          </View>

          <View style={[s.divider, { backgroundColor: theme.border }]} />

          {/* Body */}
          {!!bodyText ? (
            <Text style={[s.body, { color: theme.text }]}>{bodyText}</Text>
          ) : (
            <Text style={[s.noBody, { color: theme.subtext }]}>
              Full article available via the link below.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* ── Fixed footer — open in browser ── */}
      <View style={[s.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[s.browserBtn, { backgroundColor: theme.primary }]}
          onPress={() => article.url && Linking.openURL(article.url)}
          activeOpacity={0.85}
        >
          <Text style={s.browserBtnText}>Open full article in browser  →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 56 : 42,
      paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: theme.border,
      backgroundColor: theme.background,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    headerBtn: { padding: 8 },
    backIcon: { fontSize: 22, color: theme.text, fontWeight: '600' },
    headerBtnText: { fontSize: 20, color: theme.text },
    bookmarkIcon: { fontSize: 20, opacity: 0.3 },
    bookmarkActive: { opacity: 1 },

    scroll: { paddingBottom: 110 },
    heroImage: { width: '100%', height: 240 },
    imgPlaceholder: {
      width: '100%', height: 160,
      alignItems: 'center', justifyContent: 'center',
    },
    placeholderEmoji: { fontSize: 44 },

    content: { padding: 20 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
    source: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    liveBadge: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#e74c3c', borderRadius: 4,
      paddingHorizontal: 6, paddingVertical: 2,
    },
    liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff', marginRight: 3 },
    liveText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    time: { fontSize: 12 },

    title: { fontSize: 22, fontWeight: '800', lineHeight: 30, marginBottom: 16 },

    accuracyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
    accuracyDot: { width: 7, height: 7, borderRadius: 4 },
    accuracyLabel: { fontSize: 12, fontWeight: '700' },

    divider: { height: 1, marginBottom: 18 },
    body: { fontSize: 16, lineHeight: 28 },
    noBody: { fontSize: 14, fontStyle: 'italic', lineHeight: 22 },

    footer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      padding: 16,
      paddingBottom: Platform.OS === 'ios' ? 34 : 16,
      borderTopWidth: 1,
    },
    browserBtn: {
      borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    },
    browserBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
