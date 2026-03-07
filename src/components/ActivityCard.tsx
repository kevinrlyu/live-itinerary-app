import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Activity } from '../types';

const ACCENT_COLORS: Record<string, string> = {
  default: '#007AFF',
  hotel: '#E91E63',
  meal: '#E53935',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
  KRW: '₩', TWD: 'NT$', CHF: 'Fr', CAD: 'C$',
};

// Bill/receipt icon drawn with Views
function BillIcon({ size = 16, color = '#666' }: { size?: number; color?: string }) {
  const w = size;
  const h = size * 1.2;
  return (
    <View style={{ width: w, height: h, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: w, height: h, borderRadius: 2, borderWidth: 1.5, borderColor: color,
        paddingTop: h * 0.2, paddingHorizontal: w * 0.15, justifyContent: 'flex-start',
      }}>
        <View style={{ width: '100%', height: 1.5, backgroundColor: color, marginBottom: 2.5 }} />
        <View style={{ width: '70%', height: 1.5, backgroundColor: color, marginBottom: 2.5 }} />
        <View style={{ width: '85%', height: 1.5, backgroundColor: color }} />
      </View>
    </View>
  );
}

// Google Maps-style pin: teardrop shape with a circle inside
function MapPinIcon({ size = 16, color = '#fff', holeColor }: { size?: number; color?: string; holeColor?: string }) {
  return (
    <Svg width={size} height={size * 1.4} viewBox="0 0 24 34">
      <Path
        d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22C24 5.4 18.6 0 12 0z"
        fill={color}
      />
      <Circle cx="12" cy="12" r="5" fill={holeColor || '#00000022'} />
    </Svg>
  );
}

function formatExpense(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  // No decimals for JPY/KRW/TWD
  const noDecimal = ['JPY', 'KRW', 'TWD', 'CNY'].includes(currency);
  const formatted = noDecimal
    ? Math.round(amount).toLocaleString()
    : amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sym}${formatted}`;
}

interface Props {
  activity: Activity;
  isCurrent: boolean;
  onToggle: (id: string) => void;
  isChild?: boolean;
  isGroupHeader?: boolean;
  onOpenExpense?: (activity: Activity) => void;
}

// Convert "HH:MM" (24h) to "h:mmam/pm" (12h)
function to12h(time: string): string {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const suffix = h >= 12 ? 'pm' : 'am';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m}${suffix}`;
}

// Convert any HH:MM (24h) times found in a string to 12h format
function convertTimesIn(text: string): string {
  return text.replace(/\b(\d{1,2}):(\d{2})\b/g, (match, hStr, m) => {
    const h = parseInt(hStr, 10);
    if (h > 23) return match; // not a valid time
    const suffix = h >= 12 ? 'pm' : 'am';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m}${suffix}`;
  });
}

export default function ActivityCard({ activity, isCurrent, onToggle, isChild, isGroupHeader, onOpenExpense }: Props) {
  const openDirections = () => {
    const query = encodeURIComponent(activity.location || activity.title || '');
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const accent = ACCENT_COLORS[activity.category ?? 'default'] ?? ACCENT_COLORS.default;

  const formatTimeRange = () => {
    if (!activity.time) return null;
    if (activity.timeEnd) return `${to12h(activity.time)} – ${to12h(activity.timeEnd)}`;
    return to12h(activity.time);
  };

  // Transport: faint tappable row — entire row opens Google Maps
  if (activity.type === 'transport') {
    const label = activity.time
      ? `${to12h(activity.time)}: ${activity.title}`
      : activity.title;
    return (
      <TouchableOpacity
        style={styles.transportRow}
        onPress={openDirections}
        activeOpacity={0.6}
      >
        <Text style={styles.transportTitle} numberOfLines={2}>{label}</Text>
      </TouchableOpacity>
    );
  }

  const timeLabel = formatTimeRange();

  return (
    <View style={[
      styles.card,
      activity.completed && styles.completedCard,
      isChild && styles.childCard,
      isGroupHeader && styles.groupHeaderCard,
      isCurrent && [styles.currentCard, { borderLeftColor: accent, shadowColor: accent }],
    ]}>
      {timeLabel && <Text style={styles.time}>{timeLabel}</Text>}
      <View style={[styles.row, isGroupHeader && styles.groupHeaderRow]}>
        <TouchableOpacity testID="toggle-button" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(activity.id); }} style={styles.checkbox}>
          <Text style={[styles.checkboxText, { color: accent }]}>
            {activity.completed ? '✓' : '○'}
          </Text>
        </TouchableOpacity>
        <View style={styles.content}>
          <Text style={[styles.title, activity.completed && styles.completedText]}>
            {(activity.title || '').replace(/[\u2018\u2019]/g, "'").replace(/[\u200B\u200C\u200D\uFEFF]/g, '')}
          </Text>
          {activity.description?.trim() ? <Text style={styles.description}>{activity.description.trim()}</Text> : null}
          {activity.hours?.trim() ? <Text style={styles.hours}>Hours: {convertTimesIn(activity.hours.trim())}</Text> : null}
          {activity.notes?.trim() ? <Text style={styles.notes}>{activity.notes.trim()}</Text> : null}
        </View>
      </View>
      <View style={styles.buttonRow}>
        {onOpenExpense && (
          <TouchableOpacity onPress={() => onOpenExpense(activity)} style={[styles.iconButton, { backgroundColor: accent }]}>
            {activity.expense ? (
              <Text style={styles.expenseAmountText}>
                {formatExpense(activity.expense.amount, activity.expense.currency)}
              </Text>
            ) : (
              <BillIcon size={14} color="#fff" />
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={openDirections} style={[styles.iconButton, { backgroundColor: accent }]}>
          <MapPinIcon size={14} color="#fff" holeColor={accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  currentCard: {
    borderLeftWidth: 4,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  completedCard: {
    opacity: 0.5,
  },
  childCard: {
    marginHorizontal: 0,
    marginTop: 2,
    marginBottom: 2,
    padding: 12,
    paddingRight: 16,
    borderRadius: 8,
    shadowOpacity: 0.05,
  },
  groupHeaderCard: {},
  groupHeaderRow: {
    paddingRight: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    marginTop: -2,
  },
  checkboxText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#888',
    marginTop: -4,
    marginBottom: 2,
    marginLeft: 32,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  hours: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  },
  notes: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  // Button row with icon buttons
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  iconButton: {
    paddingHorizontal: 10,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  expenseAmountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  // Transport styles
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 1,
    paddingVertical: 4,
  },
  transportTime: {
    fontSize: 11,
    color: '#bbb',
  },
  transportTitle: {
    flex: 1,
    fontSize: 12,
    color: '#aaa',
  },
});
