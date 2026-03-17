import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete').then(done => {
      setDestination(done ? '/(tabs)' : '/onboarding/welcome');
    });
  }, []);

  if (!destination) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f8ef7" />
      </View>
    );
  }

  return <Redirect href={destination} />;
}
