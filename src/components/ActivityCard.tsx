import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Linking, StyleSheet,
  Modal, TextInput, Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Activity } from '../types';

const ACCENT_COLORS: Record<string, string> = {
  default: '#007AFF',
  hotel: '#E91E63',
  meal: '#E53935',
};

const CURRENCIES = ['USD', 'JPY', 'CNY', 'EUR', 'GBP', 'KRW', 'TWD', 'THB', 'CAD', 'AUD'];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
  KRW: '₩', TWD: 'NT$', THB: '฿', CAD: 'C$', AUD: 'A$',
};

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
  defaultCurrency?: string;
  onExpense?: (id: string, expense: { amount: number; currency: string } | null) => void;
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

export default function ActivityCard({ activity, isCurrent, onToggle, isChild, isGroupHeader, defaultCurrency, onExpense }: Props) {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState(defaultCurrency || 'USD');

  const openDirections = () => {
    if (!activity.location) return;
    const query = encodeURIComponent(activity.location);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const accent = ACCENT_COLORS[activity.category ?? 'default'] ?? ACCENT_COLORS.default;

  const formatTimeRange = () => {
    if (!activity.time) return null;
    if (activity.timeEnd) return `${to12h(activity.time)} – ${to12h(activity.timeEnd)}`;
    return to12h(activity.time);
  };

  const openExpenseInput = () => {
    if (activity.expense) {
      setExpenseAmount(String(activity.expense.amount));
      setExpenseCurrency(activity.expense.currency);
    } else {
      setExpenseAmount('');
      setExpenseCurrency(defaultCurrency || 'USD');
    }
    setShowExpenseModal(true);
  };

  const saveExpense = () => {
    const parsed = parseFloat(expenseAmount);
    if (!isNaN(parsed) && parsed > 0 && onExpense) {
      onExpense(activity.id, { amount: parsed, currency: expenseCurrency });
    }
    setShowExpenseModal(false);
  };

  const deleteExpense = () => {
    if (onExpense) onExpense(activity.id, null);
    setShowExpenseModal(false);
  };

  // Transport: faint tappable row — entire row opens Google Maps
  if (activity.type === 'transport') {
    const label = activity.time
      ? `${to12h(activity.time)}: ${activity.title}`
      : activity.title;
    return (
      <TouchableOpacity
        style={styles.transportRow}
        onPress={activity.location ? openDirections : undefined}
        activeOpacity={activity.location ? 0.6 : 1}
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
            {activity.title.replace(/[\u2018\u2019]/g, "'").replace(/[\u200B\u200C\u200D\uFEFF]/g, '')}
          </Text>
          {activity.description?.trim() ? <Text style={styles.description}>{activity.description.trim()}</Text> : null}
          {activity.hours?.trim() ? <Text style={styles.hours}>Hours: {convertTimesIn(activity.hours.trim())}</Text> : null}
          {activity.notes?.trim() ? <Text style={styles.notes}>{activity.notes.trim()}</Text> : null}
        </View>
      </View>
      <View style={styles.buttonRow}>
        {onExpense && (
          <TouchableOpacity onPress={openExpenseInput} style={styles.iconButton}>
            {activity.expense ? (
              <Text style={styles.expenseAmountText}>
                {formatExpense(activity.expense.amount, activity.expense.currency)}
              </Text>
            ) : (
              <Text style={styles.iconButtonText}>💵</Text>
            )}
          </TouchableOpacity>
        )}
        {activity.location && (
          <TouchableOpacity onPress={openDirections} style={[styles.iconButton, { backgroundColor: accent }]}>
            <Text style={styles.iconButtonText}>📍</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showExpenseModal} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowExpenseModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Expense</Text>
            <Text style={styles.modalSubtitle} numberOfLines={1}>{activity.title}</Text>

            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.currencyButton}
                onPress={() => {
                  const idx = CURRENCIES.indexOf(expenseCurrency);
                  setExpenseCurrency(CURRENCIES[(idx + 1) % CURRENCIES.length]);
                }}
              >
                <Text style={styles.currencyButtonText}>{expenseCurrency}</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#ccc"
                keyboardType="decimal-pad"
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              {activity.expense && (
                <TouchableOpacity onPress={deleteExpense} style={styles.deleteButton}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => setShowExpenseModal(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveExpense} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  iconButtonText: {
    fontSize: 16,
  },
  expenseAmountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2e7d32',
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
  // Expense modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  currencyButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
  },
  currencyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    paddingVertical: 6,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
