import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const INTERESTS = [
  { id: 'geopolitics',   label: 'Geopolitics',        emoji: '🌐' },
  { id: 'technology',    label: 'Technology',          emoji: '💻' },
  { id: 'ai',            label: 'Artificial Intelligence', emoji: '🤖' },
  { id: 'stocks',        label: 'Stocks & Finance',    emoji: '📈' },
  { id: 'crypto',        label: 'Crypto & Web3',       emoji: '💰' },
  { id: 'business',      label: 'Business',            emoji: '💼' },
  { id: 'startups',      label: 'Startups',            emoji: '🚀' },
  { id: 'science',       label: 'Science',             emoji: '🔬' },
  { id: 'space',         label: 'Space',               emoji: '🛸' },
  { id: 'health',        label: 'Health',              emoji: '🏥' },
  { id: 'sports',        label: 'Sports',              emoji: '⚽' },
  { id: 'cricket',       label: 'Cricket',             emoji: '🏏' },
  { id: 'football',      label: 'Football',            emoji: '🏆' },
  { id: 'entertainment', label: 'Entertainment',       emoji: '🎬' },
  { id: 'gaming',        label: 'Gaming',              emoji: '🎮' },
  { id: 'music',         label: 'Music',               emoji: '🎵' },
  { id: 'environment',   label: 'Environment',         emoji: '🌱' },
  { id: 'military',      label: 'Military & Defence',  emoji: '🛡️' },
  { id: 'energy',        label: 'Energy',              emoji: '⚡' },
  { id: 'infrastructure',label: 'Infrastructure',      emoji: '🏗️' },
  { id: 'realestate',    label: 'Real Estate',         emoji: '🏠' },
  { id: 'education',     label: 'Education',           emoji: '🎓' },
  { id: 'law',           label: 'Law & Justice',       emoji: '⚖️' },
  { id: 'travel',        label: 'Travel',              emoji: '✈️' },
  { id: 'food',          label: 'Food & Cuisine',      emoji: '🍜' },
  { id: 'fashion',       label: 'Fashion',             emoji: '👗' },
  { id: 'automotive',    label: 'Automotive',          emoji: '🚗' },
  { id: 'humanrights',   label: 'Human Rights',        emoji: '✊' },
  { id: 'religion',      label: 'Religion & Society',  emoji: '🕌' },
  { id: 'culture',       label: 'Culture & Arts',      emoji: '🎨' },
];

export default function Interests() {
  const router = useRouter();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState([]);

  // 3 columns on wide screens, 2 on narrow
  const cols = width >= 400 ? 3 : 2;
  const gap = 10;
  const cardWidth = (width - 40 - gap * (cols - 1)) / cols;

  function toggle(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  async function handleDone() {
    if (selected.length < 5) return;
    await AsyncStorage.setItem('user_interests', JSON.stringify(selected));
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/(tabs)');
  }

  const insets = useSafeAreaInsets();
  const s = makeStyles(theme, insets);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>What interests you?</Text>
        <Text style={s.subtitle}>Pick at least 5 topics you care about.</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.grid, { gap }]}
        showsVerticalScrollIndicator={false}
      >
        {INTERESTS.map(item => {
          const active = selected.includes(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[s.card, { width: cardWidth }, active && s.cardActive]}
              onPress={() => toggle(item.id)}
              activeOpacity={0.8}
            >
              <Text style={s.emoji}>{item.emoji}</Text>
              <Text style={[s.cardLabel, active && s.cardLabelActive]} numberOfLines={2}>
                {item.label}
              </Text>
              {active && (
                <View style={[s.checkBadge, { backgroundColor: theme.primary }]}>
                  <Text style={s.checkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[s.button, selected.length < 5 && s.buttonDisabled]}
        onPress={handleDone}
        disabled={selected.length < 5}
      >
        <Text style={s.buttonText}>
          {selected.length < 5
            ? `Pick ${5 - selected.length} more`
            : `Let's Go!  (${selected.length} selected)`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme, insets = { top: 0 }) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background, paddingHorizontal: 20, paddingTop: insets.top + 16 },
    header: { marginBottom: 20 },
    title: { fontSize: 26, fontWeight: 'bold', color: theme.text },
    subtitle: { fontSize: 14, color: theme.subtext, marginTop: 6 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 16 },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'flex-start',
      minHeight: 90,
      position: 'relative',
    },
    cardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '12',
    },
    emoji: { fontSize: 26, marginBottom: 8 },
    cardLabel: {
      fontSize: 12,
      color: theme.text,
      fontWeight: '500',
      lineHeight: 17,
      flexShrink: 1,
    },
    cardLabelActive: { color: theme.primary, fontWeight: '700' },
    checkBadge: {
      position: 'absolute', top: 8, right: 8,
      width: 20, height: 20, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    checkText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    button: {
      backgroundColor: theme.primary, borderRadius: 14, padding: 16,
      alignItems: 'center', marginBottom: 30, marginTop: 10,
    },
    buttonDisabled: { backgroundColor: theme.border },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
