import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { theme } from '../src/theme';
import { GlassCard, GlassButton, MetricCard, SectionHeader, formatINR } from '../src/components/ui';
import apiClient from '../src/services/solar-api-client';
import { lastRequestParams } from './form';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Tab = 'shadows' | 'energy' | 'panels' | 'report';

export default function PremiumScreen() {
  const webViewRef = useRef<WebView>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<Tab>('shadows');
  const [loading, setLoading] = useState(false);

  // Shadow State
  const [sunHour, setSunHour] = useState(12);
  const [sunMonth, setSunMonth] = useState(6);
  const [shadowsEnabled, setShadowsEnabled] = useState(false);
  const [buildings3D, setBuildings3D] = useState(false);
  const [shadowResult, setShadowResult] = useState<any>(null);

  // Energy State
  const [energyRadius, setEnergyRadius] = useState(200);
  const [energyResult, setEnergyResult] = useState<any>(null);

  // Panels State
  const [panelCount, setPanelCount] = useState(10);
  const [panelTilt, setPanelTilt] = useState(15);
  const [panelAzimuth, setPanelAzimuth] = useState(180);
  const [panelResult, setPanelResult] = useState<any>(null);

  // Report State
  const [reportInfo, setReportInfo] = useState<any>(null);

  const lat = lastRequestParams?.latitude || 20.5937;
  const lng = lastRequestParams?.longitude || 78.9629;
  const roofArea = lastRequestParams?.roofAreaSqm || 100;

  const sendCmd = (action: string, params: any = {}) => {
    webViewRef.current?.postMessage(JSON.stringify({ action, ...params }));
  };

  // ── Shadow Tab Actions ──────────────────────────
  const toggleShadows = () => {
    const next = !shadowsEnabled;
    setShadowsEnabled(next);
    sendCmd('enableShadows', { enable: next });
  };

  const toggle3D = () => {
    if (!buildings3D) sendCmd('load3DBuildings');
    setBuildings3D(!buildings3D);
  };

  const updateSunTime = (hour: number) => {
    setSunHour(hour);
    sendCmd('setSunTime', { hour, month: sunMonth, day: 15 });
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      mainScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const analyzeShadow = async () => {
    setLoading(true);
    try {
      const result = await apiClient.analyzeShadows({
        latitude: lat, longitude: lng, roofAreaSqm: roofArea,
        buildingHeightMeters: 3, analysisMonth: sunMonth, analysisHour: sunHour,
      });
      setShadowResult(result);
      scrollToBottom();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  // ── Energy Tab Actions ──────────────────────────
  const analyzeEnergy = async () => {
    setLoading(true);
    try {
      const result = await apiClient.analyzeBuildingEnergy({
        latitude: lat, longitude: lng, radiusMeters: energyRadius,
      });
      setEnergyResult(result);
      if (result.neighborBuildings) {
        sendCmd('showFootprints', {
          buildings: [result.targetBuilding, ...result.neighborBuildings],
          shadowImpacts: result.neighborShadowImpacts,
        });
      }
      scrollToBottom();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  // ── Panels Tab Actions ──────────────────────────
  const placePanels = () => {
    sendCmd('placePanels', {
      lat, lng, count: panelCount, w: 1.72, h: 1.13,
      tilt: panelTilt, azimuth: panelAzimuth, spacing: 0.3, height: 3,
    });
  };

  const analyzeArray = async () => {
    setLoading(true);
    try {
      const panels = Array.from({ length: panelCount }, (_, i) => ({
        panelId: `panel_${i}`, tiltDegrees: panelTilt, azimuthDegrees: panelAzimuth,
        widthMeters: 1.72, heightMeters: 1.13, efficiencyPercent: 21,
      }));
      const result = await apiClient.analyzePanelArray({ latitude: lat, longitude: lng, panels });
      setPanelResult(result);
      // Color panels by shadow
      result.perPanelResults?.forEach((p: any) => {
        sendCmd('colorPanel', { panelId: p.panelId, fraction: p.avgShadowFraction });
      });
      scrollToBottom();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  // ── Report Tab Actions ──────────────────────────
  const generateReport = async () => {
    setLoading(true);
    try {
      const result = await apiClient.generateReport({
        latitude: lat, longitude: lng, roofAreaSqm: roofArea,
        tiltDegrees: panelTilt, orientationAzimuth: panelAzimuth,
        panelType: lastRequestParams?.panelType || 'Monocrystalline',
        monthlyBillRupees: lastRequestParams?.monthlyBillRupees || 2000,
        numberOfPanels: panelCount,
      });
      setReportInfo(result);
      scrollToBottom();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'shadows', label: 'Shadows', icon: 'sunny' },
    { key: 'energy', label: 'Energy', icon: 'flash' },
    { key: 'panels', label: 'Panels', icon: 'grid' },
    { key: 'report', label: 'Report', icon: 'document-text' },
  ];

  return (
    <ScrollView 
      ref={mainScrollRef} 
      style={styles.container} 
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Map (background) */}
      {Platform.OS !== 'web' ? (
        <WebView
          ref={webViewRef}
          source={require('../assets/cesium-map.html')}
          style={styles.mapView}
          javaScriptEnabled domStorageEnabled
          onMessage={(e) => { /* handle messages */ }}
          originWhitelist={['*']}
        />
      ) : (
        <iframe
          ref={(el: any) => { if (el) { (webViewRef as any).current = el; } }}
          src="http://localhost:5029/cesium-map.html"
          style={{
            width: '100%',
            height: SCREEN_H * 0.65,
            border: 'none',
          } as any}
        />
      )}

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons name={t.icon as any} size={16}
              color={activeTab === t.key ? theme.colors.accentOrange : theme.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Panel Content */}
      <View style={styles.panelContent}>

        {/* ── SHADOWS TAB ──────────────── */}
        {activeTab === 'shadows' && (
          <>
            <View style={styles.toolRow}>
              <TouchableOpacity style={[styles.toolBtn, buildings3D && styles.toolActive]} onPress={toggle3D}>
                <Ionicons name="cube" size={16} color={buildings3D ? '#fff' : theme.colors.textMuted} />
                <Text style={styles.toolLabel}>3D</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toolBtn, shadowsEnabled && styles.toolActive]} onPress={toggleShadows}>
                <Ionicons name="sunny" size={16} color={shadowsEnabled ? '#fff' : theme.colors.textMuted} />
                <Text style={styles.toolLabel}>Shadows</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sliderRow}>
              <Text style={styles.miniLabel}>Time: {sunHour}:00 IST</Text>
              <Slider style={{ flex: 1 }} minimumValue={5} maximumValue={19} step={0.25}
                value={sunHour} onValueChange={updateSunTime}
                minimumTrackTintColor={theme.colors.accentOrange}
                maximumTrackTintColor={theme.colors.bgGlass}
                thumbTintColor={theme.colors.accentOrange} />
            </View>

            <View style={styles.sliderRow}>
              <Text style={styles.miniLabel}>Month: {sunMonth}</Text>
              <Slider style={{ flex: 1 }} minimumValue={1} maximumValue={12} step={1}
                value={sunMonth} onValueChange={(v) => { setSunMonth(v); sendCmd('setSunTime', { hour: sunHour, month: v }); }}
                minimumTrackTintColor={theme.colors.accentTeal}
                maximumTrackTintColor={theme.colors.bgGlass}
                thumbTintColor={theme.colors.accentTeal} />
            </View>

            <GlassButton title="Analyze Shadows" onPress={analyzeShadow} loading={loading} icon="analytics" />

            {shadowResult && (
              <GlassCard style={{ marginTop: 12 }}>
                <Text style={styles.resultTitle}>Shadow Analysis</Text>
                <Text style={styles.resultText}>☀️ Elevation: {shadowResult.sunElevation}°</Text>
                <Text style={styles.resultText}>🧭 Azimuth: {shadowResult.sunAzimuth}°</Text>
                <Text style={styles.resultText}>🌑 Shaded: {shadowResult.shadedAreaPercent}%</Text>
                <Text style={styles.resultText}>📊 Confidence: {shadowResult.accuracy?.confidenceScore}%</Text>
                <Text style={[styles.resultText, { marginTop: 8 }]}>{shadowResult.analysisSummary}</Text>
              </GlassCard>
            )}
          </>
        )}

        {/* ── ENERGY TAB ──────────────── */}
        {activeTab === 'energy' && (
          <>
            <View style={styles.sliderRow}>
              <Text style={styles.miniLabel}>Search Radius: {energyRadius}m</Text>
              <Slider style={{ flex: 1 }} minimumValue={100} maximumValue={500} step={50}
                value={energyRadius} onValueChange={setEnergyRadius}
                minimumTrackTintColor={theme.colors.accentTeal}
                maximumTrackTintColor={theme.colors.bgGlass}
                thumbTintColor={theme.colors.accentTeal} />
            </View>

            <GlassButton title="Analyze Building Energy" onPress={analyzeEnergy} loading={loading} icon="flash" />

            {energyResult && (
              <>
                <View style={styles.miniMetrics}>
                  <MetricCard icon="flash" label="With Shadow" value={`${energyResult.annualEnergyWithShadowKwh} kWh`} color={theme.colors.accentOrange} />
                  <MetricCard icon="flash-off" label="Without Shadow" value={`${energyResult.annualEnergyWithoutShadowKwh} kWh`} color={theme.colors.accentTeal} />
                  <MetricCard icon="trending-down" label="Shadow Loss" value={`${energyResult.shadowLossPercent}%`} color={theme.colors.accentRose} />
                  <MetricCard icon="business" label="Buildings" value={`${energyResult.totalBuildingsAnalyzed}`} color={theme.colors.accentBlue} />
                </View>

                {energyResult.neighborShadowImpacts?.length > 0 && (
                  <GlassCard>
                    <Text style={styles.resultTitle}>Top Shadow Sources</Text>
                    {energyResult.neighborShadowImpacts.slice(0, 5).map((n: any, i: number) => (
                      <View key={i} style={styles.neighborRow}>
                        <Text style={styles.neighborDir}>{n.directionLabel}</Text>
                        <Text style={styles.neighborDist}>{n.distanceMeters}m</Text>
                        <Text style={styles.neighborHeight}>{n.heightMeters}m</Text>
                        <Text style={[styles.neighborImpact, n.shadowContributionPercent > 15 && { color: theme.colors.accentRose }]}>
                          {n.shadowContributionPercent}%
                        </Text>
                      </View>
                    ))}
                  </GlassCard>
                )}
              </>
            )}
          </>
        )}

        {/* ── PANELS TAB ──────────────── */}
        {activeTab === 'panels' && (
          <>
            <View style={styles.sliderRow}>
              <Text style={styles.miniLabel}>Panels: {panelCount}</Text>
              <Slider style={{ flex: 1 }} minimumValue={1} maximumValue={50} step={1}
                value={panelCount} onValueChange={setPanelCount}
                minimumTrackTintColor={theme.colors.accentOrange}
                maximumTrackTintColor={theme.colors.bgGlass}
                thumbTintColor={theme.colors.accentOrange} />
            </View>

            <View style={styles.sliderRow}>
              <Text style={styles.miniLabel}>Tilt: {panelTilt}°</Text>
              <Slider style={{ flex: 1 }} minimumValue={0} maximumValue={60} step={1}
                value={panelTilt} onValueChange={setPanelTilt}
                minimumTrackTintColor={theme.colors.accentTeal}
                maximumTrackTintColor={theme.colors.bgGlass}
                thumbTintColor={theme.colors.accentTeal} />
            </View>

            <View style={styles.btnRow}>
              <GlassButton title="Place Panels" onPress={placePanels} icon="grid" variant="secondary" />
              <GlassButton title="Analyze" onPress={analyzeArray} loading={loading} icon="analytics" />
            </View>

            <TouchableOpacity style={styles.clearBtn} onPress={() => sendCmd('clearPanels')}>
              <Text style={styles.clearText}>🗑️ Clear Panels</Text>
            </TouchableOpacity>

            {panelResult && (
              <GlassCard style={{ marginTop: 12 }}>
                <Text style={styles.resultTitle}>Panel Array Results</Text>
                <View style={styles.miniMetrics}>
                  <MetricCard icon="flash" label="Capacity" value={`${panelResult.totalCapacityKw} kW`} color={theme.colors.accentOrange} />
                  <MetricCard icon="sunny" label="Annual Gen" value={`${panelResult.totalAnnualGenerationKwh} kWh`} color={theme.colors.accentTeal} />
                </View>
                <Text style={styles.resultText}>Shadow Loss: {panelResult.averageShadowLossPercent}%</Text>
                <Text style={styles.resultText}>Payback: {panelResult.paybackYears} years</Text>
              </GlassCard>
            )}
          </>
        )}

        {/* ── REPORT TAB ──────────────── */}
        {activeTab === 'report' && (
          <>
            <GlassCard style={{ alignItems: 'center', borderColor: theme.colors.accentOrange + '30' }}>
              <Ionicons name="document-text" size={48} color={theme.colors.accentOrange} />
              <Text style={styles.reportTitle}>Full Analysis Report</Text>
              <Text style={styles.reportDesc}>
                Complete analysis with shadow study, panel placement, building energy, and financial breakdown — absolutely free.
              </Text>
              <GlassButton title="Generate PDF Report — Free" onPress={generateReport} loading={loading} icon="download" />
            </GlassCard>

            {reportInfo && (
              <GlassCard style={{ marginTop: 12 }}>
                <View style={styles.reportInfo}>
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.accentGreen} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.resultTitle}>Report Ready!</Text>
                    <Text style={styles.resultText}>ID: {reportInfo.reportId?.substring(0, 8)}</Text>
                    <Text style={styles.resultText}>Status: {reportInfo.status}</Text>
                    <Text style={styles.resultText}>Confidence: {reportInfo.accuracy?.confidenceScore}%</Text>
                  </View>
                </View>
                <GlassButton title="Download PDF" onPress={() => Alert.alert('Download', `Report ${reportInfo.reportId?.substring(0, 8)} ready at:\n${reportInfo.downloadUrl}`)} icon="download" variant="secondary" />
              </GlassCard>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  mapView: { height: SCREEN_H * 0.65, width: '100%' },
  tabBar: {
    flexDirection: 'row', backgroundColor: theme.colors.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 12,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: theme.colors.accentOrange },
  tabText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: theme.colors.accentOrange },
  panel: { flex: 1 },
  panelContent: { padding: 16 },

  toolRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toolBtn: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border,
  },
  toolActive: { backgroundColor: theme.colors.accentOrange + '30', borderColor: theme.colors.accentOrange },
  toolLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },

  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  miniLabel: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600', width: 120 },

  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  clearBtn: { alignSelf: 'center', paddingVertical: 8 },
  clearText: { color: theme.colors.textMuted, fontSize: 12 },

  resultTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  resultText: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 },

  miniMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },

  neighborRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  neighborDir: { flex: 1, color: theme.colors.accentTeal, fontSize: 12, fontWeight: '600' },
  neighborDist: { flex: 1, color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center' },
  neighborHeight: { flex: 1, color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center' },
  neighborImpact: { flex: 1, color: theme.colors.accentOrange, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  reportTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 16 },
  reportDesc: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginVertical: 16, lineHeight: 20 },
  reportInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
});
