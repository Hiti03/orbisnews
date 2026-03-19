import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Modal, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';

const COUNTRIES = [
  'Argentina', 'Australia', 'Bangladesh', 'Brazil', 'Canada', 'China',
  'Czech Republic', 'Egypt', 'Ethiopia', 'France', 'Germany', 'Ghana',
  'Greece', 'India', 'Indonesia', 'Iran', 'Iraq', 'Israel', 'Italy',
  'Japan', 'Kenya', 'Malaysia', 'Mexico', 'Morocco', 'Netherlands',
  'New Zealand', 'Nigeria', 'Pakistan', 'Philippines', 'Poland', 'Portugal',
  'Romania', 'Russia', 'Saudi Arabia', 'Singapore', 'South Africa',
  'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Thailand',
  'Turkey', 'UAE', 'Ukraine', 'United Kingdom', 'United States of America',
];

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

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const [country, setCountry] = useState('');
  const [interests, setInterests] = useState([]);
  const [detectedCity, setDetectedCity] = useState(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [tempInterests, setTempInterests] = useState([]);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    const [c, i, city] = await Promise.all([
      AsyncStorage.getItem('user_country'),
      AsyncStorage.getItem('user_interests'),
      AsyncStorage.getItem('user_city'),
    ]);
    if (c) setCountry(c);
    if (i) setInterests(JSON.parse(i));
    if (city) setDetectedCity(city);
  }

  async function refreshLocation() {
    try {
      await AsyncStorage.removeItem('user_city');
      setDetectedCity(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to detect your city.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const city = geo[0]?.city || geo[0]?.subregion || null;
      if (city) {
        await AsyncStorage.setItem('user_city', city);
        setDetectedCity(city);
        Alert.alert('Location updated', `Your local news is now set to ${city}.`);
      } else {
        Alert.alert('Could not detect city', 'Try again or check your GPS settings.');
      }
    } catch {
      Alert.alert('Error', 'Could not get location. Please try again.');
    }
  }

  async function saveCountry(c) {
    setCountry(c);
    await AsyncStorage.setItem('user_country', c);
    setShowCountryModal(false);
  }

  function openInterestModal() {
    setTempInterests([...interests]);
    setShowInterestModal(true);
  }

  function toggleInterest(id) {
    setTempInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  async function saveInterests() {
    if (tempInterests.length < 5) return;
    setInterests(tempInterests);
    await AsyncStorage.setItem('user_interests', JSON.stringify(tempInterests));
    setShowInterestModal(false);
  }

  async function resetOnboarding() {
    Alert.alert(
      'Reset App',
      'This will clear all your preferences and restart onboarding.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset', style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              'onboarding_complete', 'user_country', 'user_interests', 'dark_mode',
            ]);
            router.replace('/onboarding/welcome');
          },
        },
      ]
    );
  }

  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>⚙️ Settings</Text>

        {/* ── Appearance ── */}
        <Text style={s.section}>Appearance</Text>
        <View style={s.row}>
          <View style={s.rowLeft}>
            <Text style={s.rowEmoji}>{isDark ? '🌙' : '☀️'}</Text>
            <Text style={s.rowTitle}>Dark Mode</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#ccc', true: theme.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* ── Profile ── */}
        <Text style={s.section}>Your Profile</Text>

        <TouchableOpacity style={s.row} onPress={() => setShowCountryModal(true)}>
          <View style={s.rowLeft}>
            <Text style={s.rowEmoji}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>Country</Text>
              <Text style={s.rowSub} numberOfLines={1}>{country || 'Not set'}</Text>
            </View>
          </View>
          <Text style={[s.rowArrow, { color: theme.primary }]}>Change ›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.row} onPress={openInterestModal}>
          <View style={s.rowLeft}>
            <Text style={s.rowEmoji}>🎯</Text>
            <View>
              <Text style={s.rowTitle}>Interests</Text>
              <Text style={s.rowSub}>
                {interests.length > 0
                  ? interests.slice(0, 3).join(', ') + (interests.length > 3 ? ` +${interests.length - 3}` : '')
                  : 'Not set'}
              </Text>
            </View>
          </View>
          <Text style={[s.rowArrow, { color: theme.primary }]}>Edit ›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.row} onPress={refreshLocation}>
          <View style={s.rowLeft}>
            <Text style={s.rowEmoji}>📡</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>Local News Location</Text>
              <Text style={s.rowSub} numberOfLines={1}>{detectedCity || 'Not detected yet'}</Text>
            </View>
          </View>
          <Text style={[s.rowArrow, { color: theme.primary }]}>Refresh ›</Text>
        </TouchableOpacity>

        {/* ── App ── */}
        <Text style={s.section}>App</Text>
        <TouchableOpacity style={[s.row, s.dangerRow]} onPress={resetOnboarding}>
          <View style={s.rowLeft}>
            <Text style={s.rowEmoji}>🔄</Text>
            <Text style={[s.rowTitle, { color: '#e74c3c' }]}>Reset & Restart Onboarding</Text>
          </View>
        </TouchableOpacity>

        <Text style={s.version}>OrbisNews v1.0.0</Text>
      </ScrollView>

      {/* ── Country Modal ── */}
      <Modal visible={showCountryModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Text style={[s.modalClose, { color: theme.primary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalList}>
              {COUNTRIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.modalItem, c === country && s.modalItemActive]}
                  onPress={() => saveCountry(c)}
                >
                  <Text style={[s.modalItemText, c === country && s.modalItemTextActive]}>{c}</Text>
                  {c === country && <Text style={{ color: theme.primary }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Interests Modal ── */}
      <Modal visible={showInterestModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Interests</Text>
              <TouchableOpacity onPress={() => setShowInterestModal(false)}>
                <Text style={[s.modalClose, { color: theme.primary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.interestGrid}>
              {INTERESTS.map(item => {
                const active = tempInterests.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.interestChip, active && s.interestChipActive]}
                    onPress={() => toggleInterest(item.id)}
                  >
                    <Text style={s.interestEmoji}>{item.emoji}</Text>
                    <Text style={[s.interestLabel, active && s.interestLabelActive]}>{item.label}</Text>
                    {active && <Text style={s.interestCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[s.saveBtn, tempInterests.length < 5 && s.saveBtnDisabled]}
              onPress={saveInterests}
              disabled={tempInterests.length < 5}
            >
              <Text style={s.saveBtnText}>
                {tempInterests.length < 5
                  ? `Pick ${5 - tempInterests.length} more`
                  : `Save (${tempInterests.length} selected)`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scroll: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 60 },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 24 },
    section: {
      fontSize: 11, fontWeight: '700', color: theme.subtext,
      textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 24,
    },
    row: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: theme.card, borderRadius: 14, padding: 16,
      marginBottom: 8, borderWidth: 1, borderColor: theme.border,
    },
    dangerRow: { borderColor: '#e74c3c44' },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    rowEmoji: { fontSize: 20 },
    rowTitle: { fontSize: 15, fontWeight: '500', color: theme.text },
    rowSub: { fontSize: 12, color: theme.subtext, marginTop: 2 },
    rowArrow: { fontSize: 14, fontWeight: '600' },
    version: { color: theme.subtext, fontSize: 12, textAlign: 'center', marginTop: 32 },
    modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    modalBox: {
      backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      maxHeight: '80%', paddingBottom: 30,
    },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
    modalClose: { fontSize: 18, fontWeight: '700', padding: 4 },
    modalList: { padding: 12 },
    modalItem: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 12,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    modalItemActive: { backgroundColor: theme.primary + '15' },
    modalItemText: { fontSize: 15, color: theme.text, flex: 1 },
    modalItemTextActive: { color: theme.primary, fontWeight: '600' },
    interestGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
    interestChip: {
      flexShrink: 0,
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
      backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border,
    },
    interestChipActive: { borderColor: theme.primary, backgroundColor: theme.primary + '20' },
    interestEmoji: { fontSize: 16 },
    interestLabel: { fontSize: 13, color: theme.text },
    interestLabelActive: { color: theme.primary, fontWeight: '600' },
    interestCheck: { color: theme.primary, fontWeight: 'bold', marginLeft: 2 },
    saveBtn: {
      backgroundColor: theme.primary, margin: 16, borderRadius: 14,
      padding: 15, alignItems: 'center',
    },
    saveBtnDisabled: { backgroundColor: theme.border },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
}
