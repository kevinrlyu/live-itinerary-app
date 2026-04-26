import React from 'react';
import { View, Text, TouchableOpacity, Pressable, Linking, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Activity } from '../types';
import ReceiptIcon from './icons/ReceiptIcon';
import { useSettings, ThemeColors, MapsProvider } from '../contexts/SettingsContext';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
  KRW: '₩', TWD: 'NT$', CHF: 'Fr', CAD: 'C$',
};

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
  isEditMode?: boolean;
  onLongPress?: (activity: Activity) => void;
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

function formatTime(time: string, format: '12h' | '24h'): string {
  return format === '24h' ? time : to12h(time);
}

// Convert any HH:MM (24h) times found in a string to 12h format
function convertTimesIn(text: string, format: '12h' | '24h'): string {
  if (format === '24h') return text;
  return text.replace(/\b(\d{1,2}):(\d{2})\b/g, (match, hStr, m) => {
    const h = parseInt(hStr, 10);
    if (h > 23) return match; // not a valid time
    const suffix = h >= 12 ? 'pm' : 'am';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m}${suffix}`;
  });
}

function buildMapsUrl(query: string, provider: MapsProvider): string {
  const encoded = encodeURIComponent(query);
  switch (provider) {
    case 'apple':
      // maps: scheme opens Apple Maps app directly; ll=0,0 forces a place search rather than address
      return `maps:?q=${encoded}`;
    case 'amap':
      // iosamap: scheme opens Amap app directly with a POI search
      return `iosamap://poi?sourceApplication=Trotter&keywords=${encoded}&dev=0`;
    case 'google':
    default:
      return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  }
}

function getActivityAccent(category: string | null, colors: ThemeColors): string {
  if (category === 'hotel') return colors.stayAccent;
  if (category === 'meal') return colors.foodAccent;
  return colors.accent;
}

export default function ActivityCard({ activity, isCurrent, onToggle, isChild, isGroupHeader, onOpenExpense, isEditMode, onLongPress }: Props) {
  const { settings, colors } = useSettings();

  const openDirections = async () => {
    const query = activity.location || activity.title || '';
    const url = buildMapsUrl(query, settings.mapsProvider);
    if (settings.mapsProvider === 'amap') {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        // Fall back to Amap web search if app not installed
        Linking.openURL(`https://uri.amap.com/search?keyword=${encodeURIComponent(query)}`);
        return;
      }
    }
    Linking.openURL(url);
  };

  const accent = getActivityAccent(activity.category ?? null, colors);

  const formatTimeRange = () => {
    if (!activity.time) return null;
    if (activity.timeEnd) return `${formatTime(activity.time, settings.timeFormat)} – ${formatTime(activity.timeEnd, settings.timeFormat)}`;
    return formatTime(activity.time, settings.timeFormat);
  };

  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress(activity);
    }
  };

  // Transport: faint tappable row — entire row opens Google Maps
  if (activity.type === 'transport') {
    const label = activity.time
      ? `${formatTime(activity.time, settings.timeFormat)}: ${activity.title}`
      : activity.title;
    return (
      <Pressable
        style={[styles.transportRow, isEditMode && [styles.editModeHighlight, { borderColor: colors.accent + '44' }]]}
        onPress={isEditMode ? undefined : openDirections}
        onLongPress={isEditMode ? handleLongPress : undefined}
        delayLongPress={400}
      >
        <Text style={[styles.transportTitle, { color: colors.textSecondary }]} numberOfLines={2}>{label}</Text>
      </Pressable>
    );
  }

  const timeLabel = formatTimeRange();

  return (
    <Pressable
      onLongPress={isEditMode ? handleLongPress : undefined}
      delayLongPress={400}
    >
      <View style={[
        styles.card,
        { backgroundColor: colors.cardBackground, shadowColor: colors.shadow },
        activity.completed && styles.completedCard,
        isChild && styles.childCard,
        isGroupHeader && styles.groupHeaderCard,
        isCurrent && [styles.currentCard, { borderLeftColor: accent, shadowColor: accent }],
        isEditMode && [styles.editModeHighlight, { borderColor: colors.accent + '44' }],
      ]}>
        {timeLabel && <Text style={[styles.time, { color: colors.textSecondary }]}>{timeLabel}</Text>}
        <View style={[styles.row, isGroupHeader && styles.groupHeaderRow]}>
          <TouchableOpacity testID="toggle-button" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(activity.id); }} style={styles.checkbox}>
            <Text style={[styles.checkboxText, { color: accent }]}>
              {activity.completed ? '✓' : '○'}
            </Text>
          </TouchableOpacity>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.textPrimary }, activity.completed && styles.completedText]}>
              {(activity.title || '').replace(/[\u2018\u2019]/g, "'").replace(/[\u200B\u200C\u200D\uFEFF]/g, '')}
            </Text>
            {activity.description?.trim() ? <Text style={[styles.description, { color: colors.textPrimary }]}>{activity.description.trim()}</Text> : null}
            {activity.hours?.trim() ? <Text style={[styles.hours, { color: colors.textSecondary }]}>Hours: {convertTimesIn(activity.hours.trim(), settings.timeFormat)}</Text> : null}
            {activity.notes?.trim() ? <Text style={[styles.notes, { color: colors.textSecondary }]}>{activity.notes.trim()}</Text> : null}
          </View>
        </View>
        <View style={styles.buttonRow}>
          {onOpenExpense && (
            <TouchableOpacity
              onPress={isEditMode ? undefined : () => onOpenExpense(activity)}
              activeOpacity={isEditMode ? 1 : 0.2}
              style={[styles.iconButton, { backgroundColor: accent }, isEditMode && styles.buttonDisabled]}
            >
              {activity.expense ? (
                <Text style={styles.expenseAmountText}>
                  {formatExpense(activity.expense.amount, activity.expense.currency)}
                </Text>
              ) : (
                <ReceiptIcon size={14} height={20} color="#fff" />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={isEditMode ? undefined : openDirections}
            activeOpacity={isEditMode ? 1 : 0.2}
            style={[styles.iconButton, { backgroundColor: accent }, isEditMode && styles.buttonDisabled]}
          >
            <MapPinIcon size={14} color="#fff" holeColor={accent} />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
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
    fontSize: 12,
    color: '#1a1a1a',
    marginTop: 4,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  hours: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  },
  notes: {
    fontSize: 12,
    color: '#888',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Transport styles
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 4,
    marginVertical: 1,
    paddingVertical: 4,
  },
  transportTitle: {
    flex: 1,
    fontSize: 12,
    color: '#888',
  },
  editModeHighlight: {
    borderWidth: 1,
    borderColor: '#007AFF44',
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
