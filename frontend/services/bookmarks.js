import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'orbis_bookmarks';

export async function getBookmarks() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function toggleBookmark(article) {
  try {
    const existing = await getBookmarks();
    const already = existing.some(a => a.id === article.id);
    if (already) {
      await AsyncStorage.setItem(KEY, JSON.stringify(existing.filter(a => a.id !== article.id)));
      return false;
    } else {
      await AsyncStorage.setItem(KEY, JSON.stringify([article, ...existing]));
      return true;
    }
  } catch { return false; }
}

export async function isBookmarked(articleId) {
  try {
    const existing = await getBookmarks();
    return existing.some(a => a.id === articleId);
  } catch { return false; }
}
