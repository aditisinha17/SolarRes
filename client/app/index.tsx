import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
  StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bgPrimary} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero Section */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.badge}>
            <Ionicons name="sunny" size={14} color={theme.colors.accentOrange} />
            <Text style={styles.badgeText}>PM Surya Ghar — Muft Bijli Yojana</Text>
          </View>

          <Text style={styles.heroTitle}>
            Know Your Roof's{'\n'}
            <Text style={styles.heroAccent}>Solar Power</Text> Potential
          </Text>

          <Text style={styles.heroSub}>
            Draw your rooftop on a 3D globe, configure solar panels, and get detailed
            generation estimates with financial analysis — all in Indian Rupees.
          </Text>

          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.ctaPrimary} onPress={() => router.push('/map')} activeOpacity={0.8}>
              <Ionicons name="flash" size={18} color="#fff" />
              <Text style={styles.ctaPrimaryText}>Start Estimating — Free</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ctaSecondary} onPress={() => router.push('/compare')} activeOpacity={0.8}>
              <Ionicons name="swap-horizontal" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.ctaSecondaryText}>Compare Panels</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Data Sources */}
        <View style={styles.sourcesRow}>
          {[
            { name: 'Open-Meteo', icon: 'cloud', desc: 'Solar Irradiance' },
            { name: 'OSM', icon: 'globe', desc: 'Building Data' },
            { name: 'PM Surya Ghar', icon: 'flag', desc: 'Subsidy Scheme' },
          ].map((s, i) => (
            <View key={i} style={styles.sourceCard}>
              <Ionicons name={s.icon as any} size={20} color={theme.colors.accentTeal} />
              <Text style={styles.sourceName}>{s.name}</Text>
              <Text style={styles.sourceDesc}>{s.desc}</Text>
            </View>
          ))}
        </View>

        {/* How It Works */}
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.stepsContainer}>
          {[
            { step: '01', title: 'Draw Roof', desc: 'Mark your rooftop on the 3D globe', icon: 'create', color: theme.colors.accentOrange },
            { step: '02', title: 'Configure', desc: 'Set panel type, tilt & orientation', icon: 'settings', color: theme.colors.accentTeal },
            { step: '03', title: 'Get Results', desc: 'Detailed generation & savings report', icon: 'analytics', color: theme.colors.accentGreen },
          ].map((s, i) => (
            <View key={i} style={styles.stepCard}>
              <View style={[styles.stepNumber, { backgroundColor: s.color + '20' }]}>
                <Ionicons name={s.icon as any} size={22} color={s.color} />
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
              {i < 2 && <View style={styles.stepConnector} />}
            </View>
          ))}
        </View>

        {/* All Features — Free */}
        <Text style={styles.sectionTitle}>Everything Included — Free</Text>
        <View style={styles.tiersRow}>
          <View style={[styles.tierCard, { flex: 1 }]}>
            <View style={[styles.tierBadge, { backgroundColor: theme.colors.accentGreen + '20' }]}>
              <Text style={[styles.tierBadgeText, { color: theme.colors.accentGreen }]}>100% FREE</Text>
            </View>
            <Text style={styles.tierTitle}>Full Solar Analysis</Text>
            {[
              'Roof area drawing on 3D globe',
              'Solar generation estimate',
              'Financial analysis & ROI',
              'PM Surya Ghar subsidy calculation',
              'Shadow analysis',
              'Panel placement optimization',
              'Building energy analysis',
              'PDF report download',
              'Panel type comparison',
            ].map((f, i) => (
              <View key={i} style={styles.tierFeature}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.accentGreen} />
                <Text style={styles.tierFeatureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  scroll: { padding: 20 },

  hero: { marginTop: 20, marginBottom: 32 },
  badge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentOrange + '15', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, marginBottom: 16, gap: 6,
  },
  badgeText: { color: theme.colors.accentOrange, fontSize: 12, fontWeight: '600' },

  heroTitle: { fontSize: 32, fontWeight: '800', color: theme.colors.textPrimary, lineHeight: 40, marginBottom: 16 },
  heroAccent: { color: theme.colors.accentOrange },
  heroSub: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 22, marginBottom: 28 },

  ctaRow: { gap: 12 },
  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.accentOrange, paddingVertical: 16, borderRadius: 14,
    ...theme.shadows.glow,
  },
  ctaPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ctaSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.bgGlass, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  ctaSecondaryText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600' },

  sourcesRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  sourceCard: {
    flex: 1, backgroundColor: theme.colors.bgCard, borderRadius: 12,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border,
  },
  sourceName: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 8 },
  sourceDesc: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },

  sectionTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 16 },

  stepsContainer: { marginBottom: 32 },
  stepCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.bgCard, borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  stepNumber: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  stepText: { flex: 1 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  stepDesc: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  stepConnector: {},

  tiersRow: { flexDirection: 'row', gap: 12 },
  tierCard: {
    flex: 1, backgroundColor: theme.colors.bgCard, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  tierPremium: { borderColor: theme.colors.accentOrange + '40' },
  tierBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  tierBadgeText: { fontSize: 11, fontWeight: '800' },
  tierTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  tierFeature: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tierFeatureText: { color: theme.colors.textSecondary, fontSize: 12 },
});
