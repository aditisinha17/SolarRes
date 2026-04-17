import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import { theme } from '../src/theme';
import { GlassButton, GlassCard } from '../src/components/ui';
import apiClient from '../src/services/solar-api-client';

// Store calculation result globally for results screen
export let lastCalculationResult: any = null;
export let lastRequestParams: any = null;

const PANEL_TYPES = [
  { key: 'Monocrystalline', label: 'Mono', icon: '⚡', desc: '21% efficiency', color: theme.colors.accentOrange },
  { key: 'Polycrystalline', label: 'Poly', icon: '🔷', desc: '17% efficiency', color: theme.colors.accentBlue },
  { key: 'ThinFilm', label: 'Thin Film', icon: '📄', desc: '13% efficiency', color: theme.colors.accentTeal },
];

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export default function FormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ area?: string; lat?: string; lng?: string }>();

  const [panelType, setPanelType] = useState('Monocrystalline');
  const [tilt, setTilt] = useState(15);
  const [azimuth, setAzimuth] = useState(180);
  const [obstruction, setObstruction] = useState(10);
  const [monthlyBill, setMonthlyBill] = useState(2000);
  const [tariff, setTariff] = useState(8);
  const [loading, setLoading] = useState(false);

  const roofArea = parseFloat(params.area || '100');
  const lat = parseFloat(params.lat || '20.5937');
  const lng = parseFloat(params.lng || '78.9629');

  const compassLabel = COMPASS[Math.round(azimuth / 45) % 8];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const request = {
        latitude: lat,
        longitude: lng,
        roofAreaSqm: roofArea,
        tiltDegrees: tilt,
        orientationAzimuth: azimuth,
        panelType,
        monthlyBillRupees: monthlyBill,
        obstructionPercent: obstruction,
        tariffPerKwh: tariff,
      };
      const result = await apiClient.calculate(request);
      lastCalculationResult = result;
      lastRequestParams = request;
      router.push('/results');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to calculate. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Configure Solar System</Text>
        <Text style={styles.pageSubtitle}>
          📐 Roof Area: {roofArea.toFixed(0)} m² • 📍 {lat.toFixed(4)}°, {lng.toFixed(4)}°
        </Text>

        {/* Panel Type Selector */}
        <GlassCard>
          <Text style={styles.label}>Panel Type</Text>
          <View style={styles.panelRow}>
            {PANEL_TYPES.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.panelOption,
                  panelType === p.key && { borderColor: p.color, backgroundColor: p.color + '15' },
                ]}
                onPress={() => setPanelType(p.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.panelIcon}>{p.icon}</Text>
                <Text style={[styles.panelLabel, panelType === p.key && { color: p.color }]}>{p.label}</Text>
                <Text style={styles.panelDesc}>{p.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* Tilt Angle */}
        <GlassCard>
          <View style={styles.sliderHeader}>
            <Text style={styles.label}>Tilt Angle</Text>
            <Text style={styles.sliderValue}>{tilt}°</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0} maximumValue={60} step={1} value={tilt}
              onValueChange={setTilt}
              minimumTrackTintColor={theme.colors.accentOrange}
              maximumTrackTintColor={theme.colors.bgGlass}
              thumbTintColor={theme.colors.accentOrange}
            />
          </View>
          <Text style={styles.sliderHint}>Optimal for India: 10-25° (latitude dependent)</Text>
        </GlassCard>

        {/* Azimuth */}
        <GlassCard>
          <View style={styles.sliderHeader}>
            <Text style={styles.label}>Orientation (Azimuth)</Text>
            <Text style={styles.sliderValue}>{azimuth}° {compassLabel}</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0} maximumValue={360} step={5} value={azimuth}
              onValueChange={setAzimuth}
              minimumTrackTintColor={theme.colors.accentTeal}
              maximumTrackTintColor={theme.colors.bgGlass}
              thumbTintColor={theme.colors.accentTeal}
            />
          </View>
          <Text style={styles.sliderHint}>180° (South) is optimal for Northern Hemisphere</Text>
        </GlassCard>

        {/* Obstruction */}
        <GlassCard>
          <View style={styles.sliderHeader}>
            <Text style={styles.label}>Roof Obstruction</Text>
            <Text style={styles.sliderValue}>{obstruction}%</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0} maximumValue={50} step={5} value={obstruction}
              onValueChange={setObstruction}
              minimumTrackTintColor={theme.colors.accentRose}
              maximumTrackTintColor={theme.colors.bgGlass}
              thumbTintColor={theme.colors.accentRose}
            />
          </View>
          <Text style={styles.sliderHint}>Water tanks, vents, staircase structures</Text>
        </GlassCard>

        {/* Monthly Bill */}
        <GlassCard>
          <View style={styles.sliderHeader}>
            <Text style={styles.label}>Monthly Electricity Bill</Text>
            <Text style={styles.sliderValue}>₹{monthlyBill.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={500} maximumValue={50000} step={500} value={monthlyBill}
              onValueChange={setMonthlyBill}
              minimumTrackTintColor={theme.colors.accentGreen}
              maximumTrackTintColor={theme.colors.bgGlass}
              thumbTintColor={theme.colors.accentGreen}
            />
          </View>
        </GlassCard>

        {/* Tariff */}
        <GlassCard>
          <View style={styles.sliderHeader}>
            <Text style={styles.label}>Electricity Tariff</Text>
            <Text style={styles.sliderValue}>₹{tariff}/kWh</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={3} maximumValue={18} step={0.5} value={tariff}
              onValueChange={setTariff}
              minimumTrackTintColor={theme.colors.accentPurple}
              maximumTrackTintColor={theme.colors.bgGlass}
              thumbTintColor={theme.colors.accentPurple}
            />
          </View>
        </GlassCard>

        {/* Submit */}
        <GlassButton
          title="Calculate Solar Potential"
          onPress={handleSubmit}
          icon="flash"
          loading={loading}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  scroll: { padding: 20 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: theme.colors.textPrimary, marginTop: 16 },
  pageSubtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4, marginBottom: 24 },

  label: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  panelRow: { flexDirection: 'row', gap: 10 },
  panelOption: {
    flex: 1, alignItems: 'center', padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgCard,
  },
  panelIcon: { fontSize: 24, marginBottom: 6 },
  panelLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  panelDesc: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },

  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderValue: { fontSize: 18, fontWeight: '700', color: theme.colors.accentOrange },
  sliderContainer: { marginTop: 4 },
  slider: { width: '100%', height: 40 },
  sliderHint: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
});
