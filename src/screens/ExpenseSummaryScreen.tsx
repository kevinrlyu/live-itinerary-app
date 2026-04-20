import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Pressable, Modal, Dimensions,
  StyleSheet, Share, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trip, Activity } from '../types';

const CURRENCIES = ['CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'JPY', 'KRW', 'TWD', 'USD'];

const CURRENCY_FLAGS: Record<string, string> = {
  CAD: '\u{1F1E8}\u{1F1E6}', CHF: '\u{1F1E8}\u{1F1ED}', CNY: '\u{1F1E8}\u{1F1F3}',
  EUR: '\u{1F1EA}\u{1F1FA}', GBP: '\u{1F1EC}\u{1F1E7}', JPY: '\u{1F1EF}\u{1F1F5}',
  KRW: '\u{1F1F0}\u{1F1F7}', TWD: '\u{1F1F9}\u{1F1FC}', USD: '\u{1F1FA}\u{1F1F8}',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
  KRW: '₩', TWD: 'NT$', THB: '฿', CAD: 'C$', AUD: 'A$',
};

function formatAmount(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  const noDecimal = ['JPY', 'KRW', 'TWD', 'CNY'].includes(currency);
  const formatted = noDecimal
    ? Math.round(amount).toLocaleString()
    : amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sym}${formatted}`;
}

function categoryOf(activity: Activity): string {
  if (activity.category === 'hotel') return 'Hotels';
  if (activity.category === 'meal') return 'Meals';
  return 'Other';
}

interface Props {
  trip: Trip;
  onClose?: () => void;
  defaultCurrency?: string;
  onSetCurrency?: (currency: string) => void;
}

const PICKER_ITEM_H = 36;
const PICKER_VISIBLE_ITEMS = 3;
const PICKER_H = PICKER_ITEM_H * PICKER_VISIBLE_ITEMS;

function CurrencyRollerPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [scrollY, setScrollY] = useState(0);
  const lastTickIdx = useRef(-1);
  const buttonRef = useRef<View>(null);
  const [pickerPos, setPickerPos] = useState<{ top: number; right: number } | null>(null);

  const openPicker = () => {
    buttonRef.current?.measureInWindow((x, y, w, h) => {
      // Position picker so its center slot aligns with the button center
      const buttonMidY = y + h / 2;
      const screenWidth = Dimensions.get('window').width;
      setPickerPos({
        top: buttonMidY - PICKER_H / 2,
        right: screenWidth - (x + w),
      });
      setOpen(true);
    });
  };

  useEffect(() => {
    if (open) {
      const idx = CURRENCIES.indexOf(value);
      lastTickIdx.current = idx;
      if (idx >= 0) {
        const y = idx * PICKER_ITEM_H;
        setScrollY(y);
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y, animated: false });
        }, 0);
      }
    }
  }, [open]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / PICKER_ITEM_H);
    const clamped = Math.max(0, Math.min(idx, CURRENCIES.length - 1));
    if (CURRENCIES[clamped] !== value) {
      onChange(CURRENCIES[clamped]);
    }
  };

  // Derive per-item opacity from scroll position
  const centeredIdx = Math.round(scrollY / PICKER_ITEM_H);
  const getItemOpacity = (idx: number) => {
    const dist = Math.abs(idx - centeredIdx);
    if (dist === 0) return 1;
    if (dist === 1) return 0.35;
    return 0.15;
  };

  return (
    <View style={styles.currencyRow}>
      <Text style={styles.currencyLabel}>Default Currency</Text>
      <View ref={buttonRef} collapsable={false}>
        <TouchableOpacity
          style={styles.currencyValue}
          onPress={() => open ? setOpen(false) : openPicker()}
        >
          <Text style={styles.currencyValueText}>{value}</Text>
          <Text style={styles.currencyChevron}>{open ? '▴' : '▾'}</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <Pressable style={pickerStyles.backdrop} onPress={() => setOpen(false)} />
        {pickerPos && (
          <View style={[pickerStyles.container, { top: pickerPos.top, right: pickerPos.right }]}>
            <ScrollView
              ref={scrollRef}
              style={pickerStyles.scroll}
              showsVerticalScrollIndicator={false}
              snapToInterval={PICKER_ITEM_H}
              decelerationRate="fast"
              onScroll={(e) => {
                const y = e.nativeEvent.contentOffset.y;
                setScrollY(y);
                const idx = Math.round(y / PICKER_ITEM_H);
                if (idx !== lastTickIdx.current && idx >= 0 && idx < CURRENCIES.length) {
                  lastTickIdx.current = idx;
                  Haptics.selectionAsync();
                }
              }}
              scrollEventThrottle={16}
              onMomentumScrollEnd={handleScrollEnd}
              onScrollEndDrag={(e) => {
                const v = e.nativeEvent.velocity?.y ?? 0;
                if (Math.abs(v) < 0.1) handleScrollEnd(e);
              }}
              contentContainerStyle={{
                paddingVertical: PICKER_ITEM_H,
              }}
            >
              {CURRENCIES.map((cur, i) => (
                <TouchableOpacity
                  key={cur}
                  style={pickerStyles.item}
                  activeOpacity={0.7}
                  onPress={() => {
                    onChange(cur);
                    setOpen(false);
                  }}
                >
                  <Text style={[
                    pickerStyles.itemText,
                    i === centeredIdx && pickerStyles.itemTextSelected,
                    { opacity: getItemOpacity(i) },
                  ]}>{CURRENCY_FLAGS[cur] || ''} {cur}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

export default function ExpenseSummaryScreen({ trip, onClose, defaultCurrency, onSetCurrency }: Props) {
  const insets = useSafeAreaInsets();
  // Collect all activities with expenses
  const allExpenses: { activity: Activity; dayLabel: string; dayDate: string }[] = [];
  for (const day of trip.days) {
    for (const a of day.activities) {
      if (a.expense) {
        allExpenses.push({ activity: a, dayLabel: day.label, dayDate: day.date });
      }
    }
  }

  // Grand totals per currency
  const grandTotals: Record<string, number> = {};
  for (const { activity } of allExpenses) {
    const e = activity.expense!;
    grandTotals[e.currency] = (grandTotals[e.currency] || 0) + e.amount;
  }

  // Category totals per currency
  const categoryTotals: Record<string, Record<string, number>> = {};
  for (const { activity } of allExpenses) {
    const cat = categoryOf(activity);
    const e = activity.expense!;
    if (!categoryTotals[cat]) categoryTotals[cat] = {};
    categoryTotals[cat][e.currency] = (categoryTotals[cat][e.currency] || 0) + e.amount;
  }

  // Day breakdown
  const dayGroups: { dayDate: string; dayLabel: string; items: { activity: Activity }[] }[] = [];
  const dayMap = new Map<string, typeof dayGroups[0]>();
  for (const entry of allExpenses) {
    let group = dayMap.get(entry.dayDate);
    if (!group) {
      group = { dayDate: entry.dayDate, dayLabel: entry.dayLabel, items: [] };
      dayMap.set(entry.dayDate, group);
      dayGroups.push(group);
    }
    group.items.push({ activity: entry.activity });
  }

  const exportCSV = async () => {
    const header = 'Date,Activity,Category,Amount,Currency';
    const rows = allExpenses.map(({ activity, dayDate }) => {
      const e = activity.expense!;
      const title = activity.title.replace(/"/g, '""');
      return `${dayDate},"${title}",${categoryOf(activity)},${e.amount},${e.currency}`;
    });
    const csv = [header, ...rows].join('\n');

    try {
      await Share.share({
        message: csv,
        title: `${trip.title} Expenses`,
      });
    } catch {}
  };

  return (
    <View style={styles.container}>
      {onClose && (
        <>
          <View style={[styles.safeTop, { height: insets.top }]} />
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>Trip Expenses</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Grand totals */}
        <View style={styles.totalsCard}>
          <Text style={styles.totalsLabel}>Total</Text>
          {Object.keys(grandTotals).length === 0 ? (
            <Text style={styles.emptyText}>No expenses yet</Text>
          ) : (
            Object.entries(grandTotals).map(([cur, amt]) => (
              <Text key={cur} style={styles.totalAmount}>{formatAmount(amt, cur)}</Text>
            ))
          )}
        </View>

        {/* Category breakdown */}
        {Object.keys(categoryTotals).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Category</Text>
            {Object.entries(categoryTotals).map(([cat, currencies]) => (
              <View key={cat} style={styles.categoryRow}>
                <Text style={styles.categoryName}>{cat}</Text>
                <View style={styles.categoryAmounts}>
                  {Object.entries(currencies).map(([cur, amt]) => (
                    <Text key={cur} style={styles.categoryAmount}>{formatAmount(amt, cur)}</Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Day-by-day breakdown */}
        {dayGroups.map((group) => {
          const dayTotals: Record<string, number> = {};
          for (const { activity } of group.items) {
            const e = activity.expense!;
            dayTotals[e.currency] = (dayTotals[e.currency] || 0) + e.amount;
          }
          return (
            <View key={group.dayDate} style={styles.section}>
              <View style={styles.dayHeader}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{group.dayLabel || group.dayDate}</Text>
                <View style={styles.dayTotals}>
                  {Object.entries(dayTotals).map(([cur, amt]) => (
                    <Text key={cur} style={styles.dayTotalText}>{formatAmount(amt, cur)}</Text>
                  ))}
                </View>
              </View>
              {group.items.map(({ activity }) => (
                <View key={activity.id} style={styles.expenseRow}>
                  <Text style={styles.expenseName} numberOfLines={1}>{activity.title}</Text>
                  <Text style={styles.expenseAmount}>
                    {formatAmount(activity.expense!.amount, activity.expense!.currency)}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}

        {onSetCurrency && defaultCurrency && (
          <CurrencyRollerPicker value={defaultCurrency} onChange={onSetCurrency} />
        )}

        {allExpenses.length > 0 && (
          <TouchableOpacity style={styles.exportButton} onPress={exportCSV}>
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeTop: {
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    paddingLeft: 12,
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  totalsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  totalsLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptyText: {
    fontSize: 15,
    color: '#aaa',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  categoryName: {
    fontSize: 14,
    color: '#555',
  },
  categoryAmounts: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  dayTotals: {
    alignItems: 'flex-end',
  },
  dayTotalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  expenseName: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    marginRight: 12,
  },
  expenseAmount: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
    zIndex: 10,
  },
  currencyLabel: {
    fontSize: 14,
    color: '#555',
  },
  currencyValue: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  currencyValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  currencyChevron: {
    fontSize: 11,
    color: '#888',
    marginLeft: 4,
  },
  exportButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

// The button is PICKER_ITEM_H-ish tall (paddingVertical 6 + text ~18 ≈ 30).

const pickerStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    position: 'absolute',
    width: 100,
    height: PICKER_H,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  item: {
    height: PICKER_ITEM_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 14,
    color: '#333',
  },
  itemTextSelected: {
    color: '#007AFF',
    fontWeight: '700',
  },
});
