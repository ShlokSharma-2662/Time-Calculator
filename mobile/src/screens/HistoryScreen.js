import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFirestoreSync } from '../hooks/useFirestoreSync';
import { GlassCard } from '../components/GlassCard';
import { formatDuration, minutesToTime, timeToMinutes } from '../utils/time';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE } from '../constants/theme';

export function HistoryScreen() {
  const { logs, settings, loading } = useFirestoreSync();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const use24Hour = settings.use24Hour || false;
  const shiftMins = (settings.shiftDuration || 9) * 60;

  // Weekly trend data (last 7 entries)
  const weekData = useMemo(() => {
    return logs.slice(0, 7).reverse().map((l) => ({
      date: l.date,
      hours: ((l.effectiveWorkTime || 0) / 60).toFixed(1),
      pct: shiftMins > 0 ? Math.round(((l.effectiveWorkTime || 0) / shiftMins) * 100) : 0,
    }));
  }, [logs, shiftMins]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const renderItem = ({ item, index }) => {
    const workMins = item.effectiveWorkTime || 0;
    const pct = shiftMins > 0 ? Math.min(100, Math.round((workMins / shiftMins) * 100)) : 0;
    const isOvertime = workMins > shiftMins;
    const barColor = isOvertime ? COLORS.overtime : pct >= 100 ? COLORS.success : COLORS.indigo;

    return (
      <TouchableOpacity
        style={[styles.row, index % 2 === 0 && styles.rowAlt]}
        onPress={() => setSelectedLog(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rowLeft}>
          <Text style={styles.rowDate}>{formatDisplayDate(item.date)}</Text>
          <Text style={styles.rowSub}>
            {item.firstInTime || '--:--'} → {item.lastOutTime || '--:--'}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.rowHours, { color: barColor }]}>{formatDuration(workMins)}</Text>
          {/* Mini bar */}
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Mini weekly chart */}
      {weekData.length > 0 && (
        <GlassCard title="Last 7 Days" style={styles.chartCard}>
          <View style={styles.chartRow}>
            {weekData.map((d) => (
              <View key={d.date} style={styles.chartBar}>
                <View style={styles.chartBarTrack}>
                  <View style={[styles.chartBarFill, { height: `${Math.min(d.pct, 100)}%` }]} />
                </View>
                <Text style={styles.chartLabel}>{d.date?.slice(8)}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      )}

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id || item.date}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.indigo} />
        }
        contentContainerStyle={logs.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No attendance history</Text>
            </View>
          )
        }
      />

      {/* Detail Modal */}
      <Modal visible={!!selectedLog} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{formatDisplayDate(selectedLog?.date)}</Text>
              <TouchableOpacity onPress={() => setSelectedLog(null)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <DetailRow label="Work Time" value={formatDuration(selectedLog?.effectiveWorkTime || 0)} />
              <DetailRow label="Break Time" value={formatDuration(selectedLog?.totalOutTime || 0)} />
              <DetailRow label="First In" value={selectedLog?.firstInTime ? minutesToTime(timeToMinutes(selectedLog.firstInTime), use24Hour) : '--:--'} />
              <DetailRow label="Last Out" value={selectedLog?.lastOutTime ? minutesToTime(timeToMinutes(selectedLog.lastOutTime), use24Hour) : '--:--'} />
              {selectedLog?.activeLeave && (
                <DetailRow label="Leave" value={`${selectedLog.activeLeave.type || 'Leave'} (${selectedLog.activeLeave.half || 'Full'})`} />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  chartCard: { margin: SPACING.lg, marginBottom: 0 },
  chartRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 80 },
  chartBar: { alignItems: 'center', flex: 1 },
  chartBarTrack: { width: 12, height: 60, backgroundColor: COLORS.surfaceLight, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  chartBarFill: { width: '100%', backgroundColor: COLORS.indigo, borderRadius: 6 },
  chartLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 4 },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.sm, marginBottom: 2 },
  rowAlt: { backgroundColor: COLORS.surface + '60' },
  rowLeft: { flex: 1 },
  rowDate: { color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: '600' },
  rowSub: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', width: 90 },
  rowHours: { fontSize: FONT_SIZE.md, fontWeight: '800' },
  barTrack: { width: 60, height: 4, backgroundColor: COLORS.surfaceLight, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', gap: SPACING.sm },
  emptyText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.base },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, maxHeight: '60%', padding: SPACING.xxl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.lg, fontWeight: '800' },
  modalBody: {},
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },
  detailValue: { color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: '700' },
});
