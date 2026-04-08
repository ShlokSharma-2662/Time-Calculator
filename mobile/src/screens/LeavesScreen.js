import React, { useMemo } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFirestoreSync } from '../hooks/useFirestoreSync';
import { GlassCard } from '../components/GlassCard';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE } from '../constants/theme';

const LEAVE_CATEGORIES = {
  EL: { label: 'Earned Leave', color: COLORS.indigo, icon: 'briefcase-outline' },
  CO: { label: 'Comp Off', color: COLORS.warning, icon: 'swap-horizontal-outline' },
  CF: { label: 'Carry Forward', color: COLORS.violet, icon: 'arrow-forward-outline' },
  SL: { label: 'Sick Leave', color: COLORS.error, icon: 'medkit-outline' },
  CL: { label: 'Casual Leave', color: COLORS.success, icon: 'sunny-outline' },
};

export function LeavesScreen() {
  const { leaves, loading } = useFirestoreSync();
  const [refreshing, setRefreshing] = React.useState(false);

  // Aggregate balances by category
  const balances = useMemo(() => {
    const counts = {};
    for (const leave of leaves) {
      const cat = leave.category || leave.type || 'Other';
      if (!counts[cat]) counts[cat] = { used: 0, count: 0 };
      counts[cat].used += leave.days || 1;
      counts[cat].count += 1;
    }
    return counts;
  }, [leaves]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.indigo} />}
    >
      {/* Balance Cards */}
      <Text style={styles.sectionTitle}>LEAVE BALANCE</Text>
      <View style={styles.balanceGrid}>
        {Object.entries(LEAVE_CATEGORIES).map(([key, meta]) => {
          const data = balances[key];
          return (
            <View key={key} style={styles.balanceCard}>
              <View style={[styles.balanceIcon, { backgroundColor: meta.color + '20' }]}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
              </View>
              <Text style={styles.balanceLabel}>{meta.label}</Text>
              <Text style={[styles.balanceValue, { color: meta.color }]}>
                {data ? data.used : 0}
              </Text>
              <Text style={styles.balanceSub}>days used</Text>
            </View>
          );
        })}
      </View>

      {/* Leave History */}
      <Text style={styles.sectionTitle}>LEAVE HISTORY</Text>
      {leaves.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Ionicons name="airplane-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No leave records found</Text>
        </View>
      ) : (
        leaves.map((leave) => {
          const cat = leave.category || leave.type || 'Other';
          const meta = LEAVE_CATEGORIES[cat] || { label: cat, color: COLORS.textSecondary, icon: 'ellipse-outline' };
          return (
            <View key={leave.id} style={styles.leaveRow}>
              <View style={[styles.leaveIndicator, { backgroundColor: meta.color }]} />
              <View style={styles.leaveInfo}>
                <Text style={styles.leaveType}>{meta.label}</Text>
                <Text style={styles.leaveDate}>{formatLeaveDate(leave)}</Text>
                {leave.remarks ? <Text style={styles.leaveRemarks}>{leave.remarks}</Text> : null}
              </View>
              <Text style={[styles.leaveDays, { color: meta.color }]}>
                {leave.days || 1}d
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function formatLeaveDate(leave) {
  const start = leave.startDate || leave.date || '';
  const end = leave.endDate || leave.date || '';
  if (start === end) return formatDate(start);
  return `${formatDate(start)} — ${formatDate(end)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  balanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
    width: '31%',
    flexGrow: 1,
  },
  balanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  balanceValue: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '900',
    marginTop: 4,
  },
  balanceSub: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  leaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leaveIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: SPACING.md,
  },
  leaveInfo: { flex: 1 },
  leaveType: { color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: '600' },
  leaveDate: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: 2 },
  leaveRemarks: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontStyle: 'italic', marginTop: 2 },
  leaveDays: { fontSize: FONT_SIZE.lg, fontWeight: '800', marginLeft: SPACING.sm },
  emptyState: { alignItems: 'center', marginTop: 48, gap: SPACING.sm },
  emptyText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.base },
});
