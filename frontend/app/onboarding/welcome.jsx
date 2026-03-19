import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
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

  async function selectCountry(country) {
    await AsyncStorage.setItem('user_country', country);
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
        <Text style={s.hint}>Tap a country to continue</Text>

        <View style={s.countryList}>
          {COUNTRIES.map(country => (
            <TouchableOpacity
              key={country}
              style={s.countryRow}
              onPress={() => selectCountry(country)}
              activeOpacity={0.7}
            >
              <Text style={[s.countryName, { color: theme.text }]}>{country}</Text>
              <Text style={[s.arrow, { color: theme.subtext }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
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
    sectionTitle: { color: theme.text, fontSize: 18, fontWeight: '600', marginBottom: 4 },
    hint: { color: theme.subtext, fontSize: 13, marginBottom: 14 },
    countryList: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
    countryRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 16,
      backgroundColor: theme.card,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    countryName: { fontSize: 15, flex: 1 },
    arrow: { fontSize: 20, marginLeft: 8 },
  });
}
