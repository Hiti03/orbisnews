import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';

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

export default function Welcome() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();
  const [selectedCountry, setSelectedCountry] = useState(null);

  async function handleContinue() {
    if (!selectedCountry) return;
    await AsyncStorage.setItem('user_country', selectedCountry);
    router.push('/onboarding/interests');
  }

  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Text style={s.logo}>🌍 OrbisNews</Text>
          <Text style={s.tagline}>Your world. Your news.</Text>
        </View>

        <View style={s.toggleRow}>
          <Text style={s.label}>🌙 Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#ccc', true: theme.primary }}
            thumbColor="#fff"
          />
        </View>

        <Text style={s.sectionTitle}>Where are you from?</Text>

        <View style={s.countryList}>
          {COUNTRIES.map(country => (
            <TouchableOpacity
              key={country}
              style={[s.countryRow, selectedCountry === country && s.countryRowSelected]}
              onPress={() => setSelectedCountry(country)}
            >
              <Text style={[s.countryName, selectedCountry === country && s.countryNameSelected]}>
                {country}
              </Text>
              {selectedCountry === country && (
                <Text style={s.countryCheck}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[s.button, !selectedCountry && s.buttonDisabled]}
          onPress={handleContinue}
          disabled={!selectedCountry}
        >
          <Text style={s.buttonText}>
            {selectedCountry ? `Continue as ${selectedCountry} →` : 'Select your country'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 28 },
    logo: { fontSize: 32, fontWeight: 'bold', color: theme.text },
    tagline: { fontSize: 14, color: theme.subtext, marginTop: 4, textAlign: 'center', alignSelf: 'stretch' },
    toggleRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: theme.card, borderRadius: 12, padding: 14,
      marginBottom: 24, borderWidth: 1, borderColor: theme.border,
    },
    label: { color: theme.text, fontSize: 15, fontWeight: '500' },
    sectionTitle: { color: theme.text, fontSize: 18, fontWeight: '600', marginBottom: 14 },
    countryList: { marginBottom: 24, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
    countryRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 16,
      backgroundColor: theme.card,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    countryRowSelected: { backgroundColor: theme.primary + '18' },
    countryName: { fontSize: 15, color: theme.text, flex: 1 },
    countryNameSelected: { color: theme.primary, fontWeight: '600' },
    countryCheck: { color: theme.primary, fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
    button: {
      backgroundColor: theme.primary, borderRadius: 14, padding: 16,
      alignItems: 'center', marginTop: 4,
    },
    buttonDisabled: { backgroundColor: theme.border },
    buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
