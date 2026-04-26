import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Pressable, Modal, Dimensions,
  StyleSheet, Share, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trip, Activity } from '../types';
import { useSettings } from '../contexts/SettingsContext';

const CURRENCY_FLAGS: Record<string, string> = {
  AED: '\u{1F1E6}\u{1F1EA}', AFN: '\u{1F1E6}\u{1F1EB}', ALL: '\u{1F1E6}\u{1F1F1}',
  AMD: '\u{1F1E6}\u{1F1F2}', ANG: '\u{1F1F3}\u{1F1F1}', AOA: '\u{1F1E6}\u{1F1F4}',
  ARS: '\u{1F1E6}\u{1F1F7}', AUD: '\u{1F1E6}\u{1F1FA}', AWG: '\u{1F1E6}\u{1F1FC}',
  AZN: '\u{1F1E6}\u{1F1FF}', BAM: '\u{1F1E7}\u{1F1E6}', BBD: '\u{1F1E7}\u{1F1E7}',
  BDT: '\u{1F1E7}\u{1F1E9}', BGN: '\u{1F1E7}\u{1F1EC}', BHD: '\u{1F1E7}\u{1F1ED}',
  BIF: '\u{1F1E7}\u{1F1EE}', BMD: '\u{1F1E7}\u{1F1F2}', BND: '\u{1F1E7}\u{1F1F3}',
  BOB: '\u{1F1E7}\u{1F1F4}', BRL: '\u{1F1E7}\u{1F1F7}', BSD: '\u{1F1E7}\u{1F1F8}',
  BTN: '\u{1F1E7}\u{1F1F9}', BWP: '\u{1F1E7}\u{1F1FC}', BYN: '\u{1F1E7}\u{1F1FE}',
  BZD: '\u{1F1E7}\u{1F1FF}', CAD: '\u{1F1E8}\u{1F1E6}', CDF: '\u{1F1E8}\u{1F1E9}',
  CHF: '\u{1F1E8}\u{1F1ED}', CLP: '\u{1F1E8}\u{1F1F1}', CNY: '\u{1F1E8}\u{1F1F3}',
  COP: '\u{1F1E8}\u{1F1F4}', CRC: '\u{1F1E8}\u{1F1F7}', CUP: '\u{1F1E8}\u{1F1FA}',
  CVE: '\u{1F1E8}\u{1F1FB}', CZK: '\u{1F1E8}\u{1F1FF}', DJF: '\u{1F1E9}\u{1F1EF}',
  DKK: '\u{1F1E9}\u{1F1F0}', DOP: '\u{1F1E9}\u{1F1F4}', DZD: '\u{1F1E9}\u{1F1FF}',
  EGP: '\u{1F1EA}\u{1F1EC}', ERN: '\u{1F1EA}\u{1F1F7}', ETB: '\u{1F1EA}\u{1F1F9}',
  EUR: '\u{1F1EA}\u{1F1FA}', FJD: '\u{1F1EB}\u{1F1EF}', FKP: '\u{1F1EB}\u{1F1F0}',
  GBP: '\u{1F1EC}\u{1F1E7}', GEL: '\u{1F1EC}\u{1F1EA}', GHS: '\u{1F1EC}\u{1F1ED}',
  GIP: '\u{1F1EC}\u{1F1EE}', GMD: '\u{1F1EC}\u{1F1F2}', GNF: '\u{1F1EC}\u{1F1F3}',
  GTQ: '\u{1F1EC}\u{1F1F9}', GYD: '\u{1F1EC}\u{1F1FE}', HKD: '\u{1F1ED}\u{1F1F0}',
  HNL: '\u{1F1ED}\u{1F1F3}', HRK: '\u{1F1ED}\u{1F1F7}', HTG: '\u{1F1ED}\u{1F1F9}',
  HUF: '\u{1F1ED}\u{1F1FA}', IDR: '\u{1F1EE}\u{1F1E9}', ILS: '\u{1F1EE}\u{1F1F1}',
  INR: '\u{1F1EE}\u{1F1F3}', IQD: '\u{1F1EE}\u{1F1F6}', IRR: '\u{1F1EE}\u{1F1F7}',
  ISK: '\u{1F1EE}\u{1F1F8}', JMD: '\u{1F1EF}\u{1F1F2}', JOD: '\u{1F1EF}\u{1F1F4}',
  JPY: '\u{1F1EF}\u{1F1F5}', KES: '\u{1F1F0}\u{1F1EA}', KGS: '\u{1F1F0}\u{1F1EC}',
  KHR: '\u{1F1F0}\u{1F1ED}', KMF: '\u{1F1F0}\u{1F1F2}', KPW: '\u{1F1F0}\u{1F1F5}',
  KRW: '\u{1F1F0}\u{1F1F7}', KWD: '\u{1F1F0}\u{1F1FC}', KYD: '\u{1F1F0}\u{1F1FE}',
  KZT: '\u{1F1F0}\u{1F1FF}', LAK: '\u{1F1F1}\u{1F1E6}', LBP: '\u{1F1F1}\u{1F1E7}',
  LKR: '\u{1F1F1}\u{1F1F0}', LRD: '\u{1F1F1}\u{1F1F7}', LSL: '\u{1F1F1}\u{1F1F8}',
  LYD: '\u{1F1F1}\u{1F1FE}', MAD: '\u{1F1F2}\u{1F1E6}', MDL: '\u{1F1F2}\u{1F1E9}',
  MGA: '\u{1F1F2}\u{1F1EC}', MKD: '\u{1F1F2}\u{1F1F0}', MMK: '\u{1F1F2}\u{1F1F2}',
  MNT: '\u{1F1F2}\u{1F1F3}', MOP: '\u{1F1F2}\u{1F1F4}', MRU: '\u{1F1F2}\u{1F1F7}',
  MUR: '\u{1F1F2}\u{1F1FA}', MVR: '\u{1F1F2}\u{1F1FB}', MWK: '\u{1F1F2}\u{1F1FC}',
  MXN: '\u{1F1F2}\u{1F1FD}', MYR: '\u{1F1F2}\u{1F1FE}', MZN: '\u{1F1F2}\u{1F1FF}',
  NAD: '\u{1F1F3}\u{1F1E6}', NGN: '\u{1F1F3}\u{1F1EC}', NIO: '\u{1F1F3}\u{1F1EE}',
  NOK: '\u{1F1F3}\u{1F1F4}', NPR: '\u{1F1F3}\u{1F1F5}', NZD: '\u{1F1F3}\u{1F1FF}',
  OMR: '\u{1F1F4}\u{1F1F2}', PAB: '\u{1F1F5}\u{1F1E6}', PEN: '\u{1F1F5}\u{1F1EA}',
  PGK: '\u{1F1F5}\u{1F1EC}', PHP: '\u{1F1F5}\u{1F1ED}', PKR: '\u{1F1F5}\u{1F1F0}',
  PLN: '\u{1F1F5}\u{1F1F1}', PYG: '\u{1F1F5}\u{1F1FE}', QAR: '\u{1F1F6}\u{1F1E6}',
  RON: '\u{1F1F7}\u{1F1F4}', RSD: '\u{1F1F7}\u{1F1F8}', RUB: '\u{1F1F7}\u{1F1FA}',
  RWF: '\u{1F1F7}\u{1F1FC}', SAR: '\u{1F1F8}\u{1F1E6}', SBD: '\u{1F1F8}\u{1F1E7}',
  SCR: '\u{1F1F8}\u{1F1E8}', SDG: '\u{1F1F8}\u{1F1E9}', SEK: '\u{1F1F8}\u{1F1EA}',
  SGD: '\u{1F1F8}\u{1F1EC}', SHP: '\u{1F1F8}\u{1F1ED}', SLE: '\u{1F1F8}\u{1F1F1}',
  SOS: '\u{1F1F8}\u{1F1F4}', SRD: '\u{1F1F8}\u{1F1F7}', SSP: '\u{1F1F8}\u{1F1F8}',
  STN: '\u{1F1F8}\u{1F1F9}', SYP: '\u{1F1F8}\u{1F1FE}', SZL: '\u{1F1F8}\u{1F1FF}',
  THB: '\u{1F1F9}\u{1F1ED}', TJS: '\u{1F1F9}\u{1F1EF}', TMT: '\u{1F1F9}\u{1F1F2}',
  TND: '\u{1F1F9}\u{1F1F3}', TOP: '\u{1F1F9}\u{1F1F4}', TRY: '\u{1F1F9}\u{1F1F7}',
  TTD: '\u{1F1F9}\u{1F1F9}', TWD: '\u{1F1F9}\u{1F1FC}', TZS: '\u{1F1F9}\u{1F1FF}',
  UAH: '\u{1F1FA}\u{1F1E6}', UGX: '\u{1F1FA}\u{1F1EC}', USD: '\u{1F1FA}\u{1F1F8}',
  UYU: '\u{1F1FA}\u{1F1FE}', UZS: '\u{1F1FA}\u{1F1FF}', VES: '\u{1F1FB}\u{1F1EA}',
  VND: '\u{1F1FB}\u{1F1F3}', VUV: '\u{1F1FB}\u{1F1FA}', WST: '\u{1F1FC}\u{1F1F8}',
  XAF: '\u{1F1E8}\u{1F1F2}', XCD: '\u{1F1E6}\u{1F1EC}', XOF: '\u{1F1F8}\u{1F1F3}',
  XPF: '\u{1F1F5}\u{1F1EB}', YER: '\u{1F1FE}\u{1F1EA}', ZAR: '\u{1F1FF}\u{1F1E6}',
  ZMW: '\u{1F1FF}\u{1F1F2}', ZWL: '\u{1F1FF}\u{1F1FC}',
};

const CURRENCIES = Object.keys(CURRENCY_FLAGS).sort();

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', AED: 'د.إ',
  ARS: '$', AUD: 'A$', BRL: 'R$', CAD: 'C$', CHF: 'CHF', CLP: '$',
  COP: '$', CRC: '₡', CZK: 'Kč', DKK: 'kr', EGP: 'E£', GEL: '₾',
  HKD: 'HK$', HUF: 'Ft', IDR: 'Rp', ILS: '₪', INR: '₹', ISK: 'kr',
  KRW: '₩', KWD: 'د.ك', MXN: '$', MYR: 'RM', NGN: '₦', NOK: 'kr',
  NZD: 'NZ$', PEN: 'S/', PHP: '₱', PKR: '₨', PLN: 'zł', QAR: 'ر.ق',
  RON: 'lei', RUB: '₽', SAR: 'ر.س', SEK: 'kr', SGD: 'S$', THB: '฿',
  TRY: '₺', TWD: 'NT$', UAH: '₴', VND: '₫', ZAR: 'R',
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
  if (activity.category === 'hotel') return 'Stays';
  if (activity.category === 'meal') return 'Food';
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
  const { colors } = useSettings();
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
      <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>Default Currency</Text>
      <View ref={buttonRef} collapsable={false}>
        <TouchableOpacity
          style={[styles.currencyValue, { backgroundColor: colors.pillBackground }]}
          onPress={() => open ? setOpen(false) : openPicker()}
        >
          <Text style={[styles.currencyValueText, { color: colors.accent }]}>{CURRENCY_FLAGS[value] || ''} {value}</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <Pressable style={pickerStyles.backdrop} onPress={() => setOpen(false)} />
        {pickerPos && (
          <View style={[pickerStyles.container, { top: pickerPos.top, right: pickerPos.right, backgroundColor: colors.pickerBackground }]}>
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
                    { color: colors.textPrimary },
                    i === centeredIdx && { color: colors.accent, fontWeight: '600' },
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
  const { colors } = useSettings();
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {onClose && (
        <>
          <View style={[styles.safeTop, { height: insets.top, backgroundColor: colors.background }]} />
          <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.borderMedium }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>Trip Expenses</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.accent }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Grand totals */}
        <View style={[styles.totalsCard, { backgroundColor: colors.cardBackground, shadowColor: colors.shadow }]}>
          <Text style={[styles.totalsLabel, { color: colors.textSecondary }]}>Total</Text>
          {Object.keys(grandTotals).length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses yet</Text>
          ) : (
            Object.entries(grandTotals).map(([cur, amt]) => (
              <Text key={cur} style={[styles.totalAmount, { color: colors.textPrimary }]}>{formatAmount(amt, cur)}</Text>
            ))
          )}
        </View>

        {/* Category breakdown */}
        {Object.keys(categoryTotals).length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground, shadowColor: colors.shadow }]}>
            {Object.entries(categoryTotals).map(([cat, currencies]) => (
              <View key={cat} style={styles.categoryRow}>
                <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{cat}</Text>
                <View style={styles.categoryAmounts}>
                  {Object.entries(currencies).map(([cur, amt]) => (
                    <Text key={cur} style={[styles.categoryAmount, { color: colors.textPrimary }]}>{formatAmount(amt, cur)}</Text>
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
            <View key={group.dayDate} style={[styles.section, { backgroundColor: colors.cardBackground, shadowColor: colors.shadow }]}>
              <View style={styles.dayHeader}>
                <Text style={[styles.sectionTitle, { marginBottom: 0, color: colors.textPrimary }]}>{group.dayLabel || group.dayDate}</Text>
                <View style={styles.dayTotals}>
                  {Object.entries(dayTotals).map(([cur, amt]) => (
                    <Text key={cur} style={[styles.dayTotalText, { color: colors.accent }]}>{formatAmount(amt, cur)}</Text>
                  ))}
                </View>
              </View>
              {group.items.map(({ activity }) => (
                <View key={activity.id} style={[styles.expenseRow, { borderTopColor: colors.background }]}>
                  <Text style={[styles.expenseName, { color: colors.textSecondary }]} numberOfLines={1}>{activity.title}</Text>
                  <Text style={[styles.expenseAmount, { color: colors.textSecondary }]}>
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
          <TouchableOpacity style={[styles.exportButton, { backgroundColor: colors.accent }]} onPress={exportCSV}>
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
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  emptyText: {
    fontSize: 12,
    color: '#888',
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
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  categoryAmounts: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 12,
    color: '#888',
    flex: 1,
    marginRight: 12,
  },
  expenseAmount: {
    fontSize: 12,
    color: '#888',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 0,
    paddingHorizontal: 4,
    marginBottom: 0,
    zIndex: 10,
  },
  currencyLabel: {
    fontSize: 14,
    color: '#888',
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
    fontWeight: '600',
    color: '#007AFF',
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
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: '#f0f0f0',
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
    fontWeight: '600',
  },
});
