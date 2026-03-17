import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { theme } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 62,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.subtext,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🌍</Text> }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Search', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔍</Text> }}
      />
      <Tabs.Screen
        name="quickbites"
        options={{ title: 'Quick Bites', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚡</Text> }}
      />
      <Tabs.Screen
        name="feed"
        options={{ title: 'My Feed', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📰</Text> }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text> }}
      />
    </Tabs>
  );
}
