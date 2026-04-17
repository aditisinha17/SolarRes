import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { MetricCard, GlassCard, GlassButton, SectionHeader, formatINR } from '../src/components/ui';
import { lastCalculationResult } from './form';

const { width } = Dimensions.get('window');
const CHART_COLORS = [
  '#FF6B35', '#FF8A5C', '#FFB088', '#4ECDC4', '#45B7AA',
  '#3DA190', '#2ECC71', '#27AE60', '#F59E0B', '#EF5350',
  '#8B5CF6', '#3B82F6',
];

export default function ResultsScreen() {
  const router = useRouter();
  const result = lastCalculationResult;

  if (!result) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={64} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>No Results Yet</Text>
        <Text style={styles.emptyText}>Draw your rooftop and configure parameters first</Text>
        <GlassButton title="Go to Map" onPress={() => router.push('/map')} icon="map" />
      </View>
    );
  }

  const { financial, subsidy, monthlyGeneration, systemCapacityKw, annualGenerationKwh, co2SavedTonnes, numberOfPanels } = result;

  // Simple bar chart data
  const maxGen = Math.max(...monthlyGeneration.map((m: any) => m.generationKwh));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Solar Analysis Results</Text>
        <Text style={styles.pageSubtitle}>Your rooftop's solar potential breakdown</Text>

        {/* Metric Cards */}
        <View style={styles.metricsGrid}>
          <MetricCard icon="flash" label="System Capacity" value={`${systemCapacityKw} kW`} color={theme.colors.accentOrange} />
          <MetricCard icon="sunny" label="Annual Generation" value={`${(annualGenerationKwh / 1000).toFixed(1)} MWh`} color={theme.colors.accentTeal} />
          <MetricCard icon="leaf" label="CO₂ Saved" value={`${co2SavedTonnes} t/yr`} color={theme.colors.accentGreen} />
          <MetricCard icon="grid" label="Panels" value={`${numberOfPanels}`} color={theme.colors.accentBlue} />
          <MetricCard icon="time" label="Payback" value={`${financial.paybackYears} yrs`} color={theme.colors.accentPurple} />
          <MetricCard icon="trending-up" label="ROI" value={`${financial.roiPercent}%`} color={theme.colors.accentOrange} />
        </View>

        {/* Monthly Generation Chart (simple bar visualization) */}
        <SectionHeader title="Monthly Generation" icon="bar-chart" />
        <GlassCard>
          <View style={styles.chart}>
            {monthlyGeneration.map((m: any, i: number) => (
              <View key={m.month} style={styles.barContainer}>
                <Text style={styles.barValue}>{Math.round(m.generationKwh)}</Text>
                <View style={[styles.bar, {
                  height: maxGen > 0 ? (m.generationKwh / maxGen) * 120 : 0,
                  backgroundColor: CHART_COLORS[i],
                }]} />
                <Text style={styles.barLabel}>{m.month}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.chartUnit}>kWh per month</Text>
        </GlassCard>

        {/* Financial Summary */}
        <SectionHeader title="Financial Analysis" icon="cash" />
        <GlassCard>
          {[
            { label: 'Installation Cost', value: formatINR(financial.totalInstallationCostRupees), color: theme.colors.textPrimary },
            { label: 'PM Surya Ghar Subsidy', value: `- ${formatINR(financial.subsidyAmountRupees)}`, color: theme.colors.accentGreen },
            { label: 'Net Cost', value: formatINR(financial.netCostRupees), color: theme.colors.accentOrange },
            { label: 'Annual Savings', value: formatINR(financial.annualSavingsRupees), color: theme.colors.accentTeal },
            { label: 'Payback Period', value: `${financial.paybackYears} years`, color: theme.colors.textPrimary },
            { label: '25-Year Savings', value: formatINR(financial.twentyFiveYearSavingsRupees), color: theme.colors.accentGreen },
            { label: 'Tariff Escalation', value: `${financial.tariffEscalationPercent}%/yr`, color: theme.colors.textMuted },
            { label: 'Panel Degradation', value: `${financial.degradationPercentPerYear}%/yr`, color: theme.colors.textMuted },
            { label: 'Inverter Replacement', value: `₹${financial.inverterReplacementCostRupees.toLocaleString('en-IN')} @ Year ${financial.inverterReplacementYear}`, color: theme.colors.textMuted },
          ].map((row, i) => (
            <View key={i} style={[styles.finRow, i === 2 && styles.finHighlight]}>
              <Text style={styles.finLabel}>{row.label}</Text>
              <Text style={[styles.finValue, { color: row.color }]}>{row.value}</Text>
            </View>
          ))}
        </GlassCard>

        {/* Subsidy Section */}
        <SectionHeader title="Subsidy Details" subtitle="PM Surya Ghar Muft Bijli Yojana" icon="flag" />
        <GlassCard style={{ borderColor: theme.colors.accentGreen + '30' }}>
          <View style={styles.subsidyHeader}>
            <Ionicons name="shield-checkmark" size={24} color={theme.colors.accentGreen} />
            <Text style={styles.subsidyAmount}>{formatINR(subsidy.totalSubsidy)}</Text>
          </View>
          <Text style={styles.subsidyExplanation}>{subsidy.explanation}</Text>
        </GlassCard>

        {/* Monthly Details Table */}
        <SectionHeader title="Monthly Breakdown" icon="calendar" />
        <GlassCard>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 1 }]}>Month</Text>
            <Text style={[styles.tableCell, { flex: 1.2 }]}>GHI</Text>
            <Text style={[styles.tableCell, { flex: 1.2 }]}>Gen (kWh)</Text>
            <Text style={[styles.tableCell, { flex: 1.2 }]}>Savings</Text>
          </View>
          {monthlyGeneration.map((m: any, i: number) => (
            <View key={m.month} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
              <Text style={[styles.tableCellData, { flex: 1 }]}>{m.month}</Text>
              <Text style={[styles.tableCellData, { flex: 1.2 }]}>{m.ghiKwhPerSqmPerDay}</Text>
              <Text style={[styles.tableCellData, { flex: 1.2 }]}>{Math.round(m.generationKwh)}</Text>
              <Text style={[styles.tableCellData, { flex: 1.2, color: theme.colors.accentGreen }]}>₹{m.savingsRupees.toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </GlassCard>

        {/* CTA to Analysis Studio */}
        <GlassCard style={{ borderColor: theme.colors.accentOrange + '30', alignItems: 'center' }}>
          <Ionicons name="analytics" size={32} color={theme.colors.accentOrange} />
          <Text style={styles.premiumTitle}>Go Deeper — Free</Text>
          <Text style={styles.premiumDesc}>
            Explore shadow analysis, 3D panel placement, building energy modeling, and download a full PDF report.
          </Text>
          <GlassButton title="Open Analysis Studio" onPress={() => router.push('/premium')} icon="analytics" />
        </GlassCard>

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

  emptyContainer: {
    flex: 1, backgroundColor: theme.colors.bgPrimary,
    alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 16 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, paddingTop: 20 },
  barContainer: { alignItems: 'center', flex: 1 },
  bar: { width: 18, borderRadius: 4, marginBottom: 6, minHeight: 4 },
  barValue: { fontSize: 8, color: theme.colors.textMuted, marginBottom: 2 },
  barLabel: { fontSize: 9, color: theme.colors.textMuted },
  chartUnit: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center', marginTop: 8 },

  finRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  finHighlight: { backgroundColor: theme.colors.accentOrange + '08', marginHorizontal: -20, paddingHorizontal: 20, borderRadius: 8 },
  finLabel: { fontSize: 13, color: theme.colors.textSecondary },
  finValue: { fontSize: 14, fontWeight: '700' },

  subsidyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  subsidyAmount: { fontSize: 24, fontWeight: '800', color: theme.colors.accentGreen },
  subsidyExplanation: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },

  tableHeader: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
    paddingBottom: 8, marginBottom: 4,
  },
  tableCell: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
  tableRow: { flexDirection: 'row', paddingVertical: 8 },
  tableRowAlt: { backgroundColor: theme.colors.bgCard, marginHorizontal: -20, paddingHorizontal: 20, borderRadius: 4 },
  tableCellData: { fontSize: 12, color: theme.colors.textSecondary },

  premiumTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 12 },
  premiumDesc: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginVertical: 12, lineHeight: 20 },
});
