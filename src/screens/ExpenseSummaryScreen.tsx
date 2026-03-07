import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trip, Activity } from '../types';

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
  onClose: () => void;
}

export default function ExpenseSummaryScreen({ trip, onClose }: Props) {
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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle} numberOfLines={1}>Trip Expenses</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

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
                <Text style={styles.sectionTitle}>{group.dayLabel || group.dayDate}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    paddingLeft: 12,
  },
  closeText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
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
    alignItems: 'center',
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
    alignItems: 'center',
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
    fontWeight: '600',
    color: '#1a1a1a',
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
