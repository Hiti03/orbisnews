import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';

const INTERESTS = [
  { id: 'geopolitics',   label: 'Geopolitics',        emoji: '🌐' },
  { id: 'technology',    label: 'Technology',          emoji: '💻' },
  { id: 'ai',            label: 'Artificial Intel.',   emoji: '🤖' },
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
  const [selected, setSelected] = useState([]);

  function toggle(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  async function handleDone() {
    if (selected.length < 5) return;
    await AsyncStorage.setItem('user_interests', JSON.stringify(selected));
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/(tabs)');
  }

  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>What interests you?</Text>
        <Text style={s.subtitle}>Pick at least 5. You can change this later.</Text>
      </View>

      <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
        {INTERESTS.map(item => {
          const active = selected.includes(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[s.card, active && s.cardSelected]}
              onPress={() => toggle(item.id)}
            >
              <Text style={s.emoji}>{item.emoji}</Text>
              <Text style={[s.cardLabel, active && s.cardLabelSelected]}>{item.label}</Text>
              {active && <Text style={s.check}>✓</Text>}
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
            : `Let's Go! (${selected.length} selected)`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background, paddingHorizontal: 20, paddingTop: 60 },
    header: { marginBottom: 24 },
    title: { fontSize: 26, fontWeight: 'bold', color: theme.text },
    subtitle: { fontSize: 14, color: theme.subtext, marginTop: 6 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 20 },
    card: {
      width: '46%', backgroundColor: theme.card, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: theme.border, alignItems: 'flex-start', position: 'relative',
    },
    cardSelected: { borderColor: theme.primary, backgroundColor: theme.background },
    emoji: { fontSize: 28, marginBottom: 8 },
    cardLabel: { fontSize: 13, color: theme.text, fontWeight: '500' },
    cardLabelSelected: { color: theme.primary, fontWeight: '600' },
    check: { position: 'absolute', top: 10, right: 12, color: theme.primary, fontWeight: 'bold', fontSize: 16 },
    button: {
      backgroundColor: theme.primary, borderRadius: 14, padding: 16,
      alignItems: 'center', marginBottom: 30, marginTop: 8,
    },
    buttonDisabled: { backgroundColor: theme.border },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
