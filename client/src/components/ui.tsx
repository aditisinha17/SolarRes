import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
}

export function MetricCard({ icon, label, value, subtitle, color = theme.colors.accentOrange }: MetricCardProps) {
  return (
    <View style={[styles.card, { borderColor: color + '20' }]}>
      <View style={[styles.iconBadge, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
    </View>
  );
}

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
}

export function GlassButton({ title, onPress, variant = 'primary', icon, loading, disabled }: GlassButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary ? styles.buttonPrimary : variant === 'secondary' ? styles.buttonSecondary : styles.buttonGhost,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {icon && !loading && <Ionicons name={icon as any} size={18} color="#fff" style={{ marginRight: 8 }} />}
      {loading && <Text style={styles.buttonText}>⏳ </Text>}
      <Text style={[styles.buttonText, !isPrimary && { color: theme.colors.textSecondary }]}>
        {loading ? 'Processing...' : title}
      </Text>
    </TouchableOpacity>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
}

export function SectionHeader({ title, subtitle, icon }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      {icon && <Ionicons name={icon as any} size={22} color={theme.colors.accentOrange} style={{ marginRight: 8 }} />}
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

export function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
}

export function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    width: (width - 56) / 2,
    marginBottom: 12,
  },
  iconBadge: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  cardLabel: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: '700', color: theme.colors.accentOrange },
  cardSubtitle: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },

  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 24, borderRadius: theme.borderRadius.md,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.accentOrange,
    ...theme.shadows.glow,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.bgGlass,
    borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 16, marginTop: 8,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  sectionSubtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },

  glassCard: {
    backgroundColor: theme.colors.bgGlass,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 20, marginBottom: 16,
    ...theme.shadows.card,
  },
});
