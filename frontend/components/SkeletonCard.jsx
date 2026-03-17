import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

function Bone({ style }) {
  const { theme } = useTheme();
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[{ backgroundColor: theme.border, borderRadius: 6 }, style, { opacity: anim }]}
    />
  );
}

export default function SkeletonCard() {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Image placeholder */}
      <Bone style={styles.image} />
      <View style={styles.body}>
        {/* Source + time row */}
        <View style={styles.topRow}>
          <Bone style={styles.source} />
          <Bone style={styles.time} />
        </View>
        {/* Title lines */}
        <Bone style={styles.titleLine1} />
        <Bone style={styles.titleLine2} />
        <Bone style={styles.titleLine3} />
        {/* Accuracy badge */}
        <Bone style={styles.badge} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, marginBottom: 14, borderWidth: 1, overflow: 'hidden',
  },
  image: { width: '100%', height: 190, borderRadius: 0 },
  body: { padding: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  source: { width: 80, height: 10 },
  time: { width: 50, height: 10 },
  titleLine1: { width: '100%', height: 13, marginBottom: 7 },
  titleLine2: { width: '85%', height: 13, marginBottom: 7 },
  titleLine3: { width: '60%', height: 13, marginBottom: 14 },
  badge: { width: 110, height: 22, borderRadius: 20 },
});
