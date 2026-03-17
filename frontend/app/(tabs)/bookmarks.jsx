import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { getBookmarks, toggleBookmark } from '../../services/bookmarks';
import NewsCard from '../../components/NewsCard';

export default function BookmarksScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getBookmarks().then(setBookmarks);
    }, [])
  );

  async function handleRemove(article) {
    await toggleBookmark(article);
    setBookmarks(prev => prev.filter(a => a.id !== article.id));
  }

  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>🔖 Saved</Text>
        <Text style={[s.subtitle, { color: theme.subtext }]}>
          {bookmarks.length} article{bookmarks.length !== 1 ? 's' : ''} saved
        </Text>
      </View>

      <FlatList
        data={bookmarks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <NewsCard
            article={item}
            bookmarkedOverride={true}
            onBookmarkChange={() => handleRemove(item)}
          />
        )}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🔖</Text>
            <Text style={[s.emptyTitle, { color: theme.text }]}>No saved articles</Text>
            <Text style={[s.emptyNote, { color: theme.subtext }]}>
              Tap the bookmark icon on any article to save it here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    title: { fontSize: 22, fontWeight: 'bold', color: theme.text },
    subtitle: { fontSize: 12, marginTop: 3 },
    list: { padding: 16, paddingBottom: 40 },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    emptyNote: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  });
}
