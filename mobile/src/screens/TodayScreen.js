import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFirestoreSync } from '../hooks/useFirestoreSync';
import { ProgressRing } from '../components/ProgressRing';
import { StatCard } from '../components/StatCard';
import { GlassCard } from '../components/GlassCard';
import { formatDuration, minutesToTime, getEstimatedExit, timeToMinutes } from '../utils/time';
import { COLORS, SPACING, FONT_SIZE } from '../constants/theme';

function IconClock(props) { return <Ionicons name="time-outline" {...props} />; }
function IconCoffee(props) { return <Ionicons name="cafe-outline" {...props} />; }
function IconLogin(props) { return <Ionicons name="log-in-outline" {...props} />; }
function IconLogout(props) { return <Ionicons name="log-out-outline" {...props} />; }

export function TodayScreen() {
  const { logs, settings, loading } = useFirestoreSync();
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayLog = useMemo(() => logs.find((l) => l.date === today || l.id === today), [logs, today]);

  const shiftDurationMinutes = (settings.shiftDuration || 9) * 60;
  const use24Hour = settings.use24Hour || false;

  const effectiveWork = todayLog?.effectiveWorkTime || 0;
  const totalOut = todayLog?.totalOutTime || 0;
  const firstIn = todayLog?.firstInTime || null;
  const lastOut = todayLog?.lastOutTime || null;
  const activeLeave = todayLog?.activeLeave || null;
  const isOvertime = effectiveWork > shiftDurationMinutes;

  const progress = shiftDurationMinutes > 0
    ? Math.min(100, Math.round((effectiveWork / shiftDurationMinutes) * 100))
    : 0;

  const estimatedExit = firstIn
    ? getEstimatedExit(firstIn, shiftDurationMinutes, totalOut, use24Hour)
    : '--:--';

  const progressColor = isOvertime ? COLORS.overtime : progress >= 100 ? COLORS.success : COLORS.indigo;

  const onRefresh = () => {
    setRefreshing(true);
    // Firestore listeners auto-refresh; just show indicator briefly
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.indigo} />}
    >
      {/* Progress Ring */}
      <View style={styles.ringContainer}>
        <ProgressRing
          progress={progress}
          size={180}
          strokeWidth={12}
          color={progressColor}
          label={`${progress}%`}
          sublabel={isOvertime ? 'OVERTIME' : 'COMPLETED'}
        />
      </View>

      {/* Active Work & Est. Exit */}
      <GlassCard>
        <View style={styles.primaryStats}>
          <View style={styles.primaryStat}>
            <Text style={styles.primaryValue}>{formatDuration(effectiveWork)}</Text>
            <Text style={styles.primaryLabel}>ACTIVE WORK</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.primaryStat}>
            <Text style={styles.primaryValue}>{estimatedExit}</Text>
            <Text style={styles.primaryLabel}>EST. EXIT</Text>
          </View>
        </View>
      </GlassCard>

      {/* Leave Badge */}
      {activeLeave && (
        <View style={styles.leaveBadge}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.leave} />
          <Text style={styles.leaveText}>
            {activeLeave.type || 'Leave'} — {activeLeave.half || 'Full Day'}
          </Text>
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <StatCard label="Break" value={formatDuration(totalOut)} icon={IconCoffee} color={COLORS.breakTime} />
        <StatCard label="First In" value={firstIn ? minutesToTime(timeToMinutes(firstIn), use24Hour) : '--:--'} icon={IconLogin} color={COLORS.success} />
        <StatCard label="Last Out" value={lastOut ? minutesToTime(timeToMinutes(lastOut), use24Hour) : '--:--'} icon={IconLogout} color={COLORS.error} />
      </View>

      {/* Empty state */}
      {!todayLog && !loading && (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No shift data for today</Text>
          <Text style={styles.emptyHint}>Log your shift on the web app to see it here</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  ringContainer: {
    alignItems: 'center',
    marginVertical: SPACING.xxl,
  },
  primaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  primaryValue: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xxl,
    fontWeight: '900',
  },
  primaryLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  leaveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.leave + '20',
    borderRadius: 999,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  leaveText: {
    color: COLORS.leave,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 48,
    gap: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
  },
  emptyHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
  },
});
