import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/theme';
import { GlassCard, SectionHeader, GlassButton, formatINR } from '../src/components/ui';
import apiClient, { PanelComparisonData } from '../src/services/solar-api-client';
import { lastRequestParams } from './form';

export default function CompareScreen() {
  const [data, setData] = useState<PanelComparisonData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const lat = lastRequestParams?.latitude || 20.5937;
  const lng = lastRequestParams?.longitude || 78.9629;
  const roofArea = lastRequestParams?.roofAreaSqm || 100;

  const loadComparison = async () => {
    setLoading(true);
    try {
      const result = await apiClient.comparePanels(roofArea, lat, lng);
      setData(result);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadComparison(); }, []);

  const PANEL_ICONS: Record<string, { icon: string; color: string }> = {
    Monocrystalline: { icon: '⚡', color: theme.colors.accentOrange },
    Polycrystalline: { icon: '🔷', color: theme.colors.accentBlue },
    ThinFilm: { icon: '📄', color: theme.colors.accentTeal },
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accentOrange} />
        <Text style={styles.loadingText}>Comparing panel types...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Panel Comparison</Text>
        <Text style={styles.pageSubtitle}>
          Compare solar panel types for your roof ({roofArea.toFixed(0)} m²)
        </Text>

        {!data ? (
          <GlassCard style={{ alignItems: 'center' }}>
            <Ionicons name="swap-horizontal" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>Tap below to compare panel types</Text>
            <GlassButton title="Compare Panels" onPress={loadComparison} icon="analytics" />
          </GlassCard>
        ) : (
          <>
            {/* Panel Type Tabs */}
            <View style={styles.panelTabs}>
              {data.map((panel, i) => {
                const pi = PANEL_ICONS[panel.panelTypeName] || { icon: '🔲', color: theme.colors.textMuted };
                return (
                  <TouchableOpacity
                    key={panel.panelTypeName}
                    style={[styles.panelTab, selectedIdx === i && { borderColor: pi.color, backgroundColor: pi.color + '15' }]}
                    onPress={() => setSelectedIdx(i)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.panelTabIcon}>{pi.icon}</Text>
                    <Text style={[styles.panelTabLabel, selectedIdx === i && { color: pi.color }]}>
                      {panel.panelTypeName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Comparison Table */}
            <SectionHeader title="Specifications" icon="information-circle" />
            <GlassCard>
              {data.map((panel, i) => {
                const pi = PANEL_ICONS[panel.panelTypeName] || { icon: '🔲', color: theme.colors.textMuted };
                return (
                  <View key={panel.panelTypeName} style={[
                    styles.specRow,
                    selectedIdx === i && { backgroundColor: pi.color + '08' },
                  ]}>
                    <View style={styles.specHeader}>
                      <Text style={{ fontSize: 18 }}>{pi.icon}</Text>
                      <Text style={[styles.specName, { color: pi.color }]}>{panel.panelTypeName}</Text>
                    </View>
                    <View style={styles.specGrid}>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>Efficiency</Text>
                        <Text style={styles.specValue}>{panel.efficiencyPercent}%</Text>
                      </View>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>Cost/kW</Text>
                        <Text style={styles.specValue}>{formatINR(panel.costPerKw)}</Text>
                      </View>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>Area/kW</Text>
                        <Text style={styles.specValue}>{panel.areaPerKw} m²</Text>
                      </View>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>Warranty</Text>
                        <Text style={styles.specValue}>{panel.warrantyYears} yr</Text>
                      </View>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>Degradation</Text>
                        <Text style={styles.specValue}>{panel.degradationPerYear}%/yr</Text>
                      </View>
                      <View style={styles.specItem}>
                        <Text style={styles.specLabel}>Temp. Coef</Text>
                        <Text style={styles.specValue}>{panel.temperatureCoefficient}%/°C</Text>
                      </View>
                    </View>
                    <View style={styles.bestForBadge}>
                      <Ionicons name="star" size={14} color={pi.color} />
                      <Text style={[styles.bestForText, { color: pi.color }]}>{panel.bestFor}</Text>
                    </View>
                  </View>
                );
              })}
            </GlassCard>

            {/* Selected Panel Solar Calc */}
            {data[selectedIdx]?.solarCalculation && (
              <>
                <SectionHeader title="Projected Performance" icon="trending-up" />
                <GlassCard>
                  {(() => {
                    const sc = data[selectedIdx].solarCalculation!;
                    const pi = PANEL_ICONS[data[selectedIdx].panelTypeName];
                    return (
                      <>
                        <View style={styles.perfRow}>
                          <Text style={styles.perfLabel}>System Capacity</Text>
                          <Text style={[styles.perfValue, { color: pi.color }]}>{sc.systemCapacityKw} kW</Text>
                        </View>
                        <View style={styles.perfRow}>
                          <Text style={styles.perfLabel}>Annual Generation</Text>
                          <Text style={[styles.perfValue, { color: pi.color }]}>{sc.annualGenerationKwh.toLocaleString('en-IN')} kWh</Text>
                        </View>
                        <View style={styles.perfRow}>
                          <Text style={styles.perfLabel}>Number of Panels</Text>
                          <Text style={styles.perfValue}>{sc.numberOfPanels}</Text>
                        </View>
                        <View style={styles.perfRow}>
                          <Text style={styles.perfLabel}>Net Cost (after subsidy)</Text>
                          <Text style={[styles.perfValue, { color: theme.colors.accentGreen }]}>
                            {formatINR(sc.financial.netCostRupees)}
                          </Text>
                        </View>
                        <View style={styles.perfRow}>
                          <Text style={styles.perfLabel}>Payback Period</Text>
                          <Text style={styles.perfValue}>{sc.financial.paybackYears} years</Text>
                        </View>
                        <View style={styles.perfRow}>
                          <Text style={styles.perfLabel}>25-Year Savings</Text>
                          <Text style={[styles.perfValue, { color: theme.colors.accentGreen }]}>
                            {formatINR(sc.financial.twentyFiveYearSavingsRupees)}
                          </Text>
                        </View>
                        <View style={styles.perfRow}>
                          <Text style={styles.perfLabel}>ROI</Text>
                          <Text style={[styles.perfValue, { color: theme.colors.accentOrange }]}>{sc.financial.roiPercent}%</Text>
                        </View>
                        <View style={styles.perfRow}>
                          <Text style={styles.perfLabel}>CO₂ Saved</Text>
                          <Text style={[styles.perfValue, { color: theme.colors.accentGreen }]}>{sc.co2SavedTonnes} t/yr</Text>
                        </View>
                      </>
                    );
                  })()}
                </GlassCard>
              </>
            )}

            {/* Generation Comparison Chart */}
            {data.every(d => d.solarCalculation) && (
              <>
                <SectionHeader title="Annual Generation Comparison" icon="bar-chart" />
                <GlassCard>
                  {data.map((panel) => {
                    const sc = panel.solarCalculation!;
                    const maxGen = Math.max(...data.map(d => d.solarCalculation?.annualGenerationKwh || 0));
                    const pi = PANEL_ICONS[panel.panelTypeName] || { icon: '🔲', color: '#fff' };
                    const pct = maxGen > 0 ? (sc.annualGenerationKwh / maxGen) * 100 : 0;
                    return (
                      <View key={panel.panelTypeName} style={styles.compBar}>
                        <Text style={styles.compLabel}>{pi.icon} {panel.panelTypeName}</Text>
                        <View style={styles.compBarTrack}>
                          <View style={[styles.compBarFill, { width: `${pct}%`, backgroundColor: pi.color }]} />
                        </View>
                        <Text style={[styles.compValue, { color: pi.color }]}>
                          {(sc.annualGenerationKwh / 1000).toFixed(1)} MWh
                        </Text>
                      </View>
                    );
                  })}
                </GlassCard>
              </>
            )}

            <GlassButton title="Refresh Comparison" onPress={loadComparison} loading={loading} variant="secondary" icon="refresh" />
          </>
        )}

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

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bgPrimary, gap: 16 },
  loadingText: { fontSize: 14, color: theme.colors.textSecondary },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, marginVertical: 16 },

  panelTabs: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  panelTab: {
    flex: 1, alignItems: 'center', padding: 16, borderRadius: 14,
    borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.bgCard,
  },
  panelTabIcon: { fontSize: 24, marginBottom: 6 },
  panelTabLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },

  specRow: { padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  specHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  specName: { fontSize: 16, fontWeight: '700' },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specItem: {
    width: '30%', backgroundColor: theme.colors.bgCard, padding: 10, borderRadius: 8,
    alignItems: 'center',
  },
  specLabel: { fontSize: 10, color: theme.colors.textMuted, marginBottom: 2 },
  specValue: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  bestForBadge: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
  bestForText: { fontSize: 12, fontWeight: '600' },

  perfRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  perfLabel: { fontSize: 13, color: theme.colors.textSecondary },
  perfValue: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },

  compBar: { marginBottom: 16 },
  compLabel: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 6 },
  compBarTrack: { height: 12, backgroundColor: theme.colors.bgCard, borderRadius: 6, overflow: 'hidden' },
  compBarFill: { height: '100%', borderRadius: 6 },
  compValue: { fontSize: 13, fontWeight: '700', marginTop: 4, textAlign: 'right' },
});
