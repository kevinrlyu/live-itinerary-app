import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

const CURRENCIES = ['CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'JPY', 'KRW', 'TWD', 'USD'];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
  KRW: '₩', TWD: 'NT$', CHF: 'Fr', CAD: 'C$',
};

export interface ExpenseInputTarget {
  activityId: string;
  activityTitle: string;
  existingExpense: { amount: number; currency: string } | null;
  defaultCurrency: string;
}

interface Props {
  target: ExpenseInputTarget;
  onSave: (activityId: string, expense: { amount: number; currency: string } | null) => void;
  onClose: () => void;
}

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

export default function ExpenseInput({ target, onSave, onClose }: Props) {
  const [amount, setAmount] = useState(
    target.existingExpense ? String(target.existingExpense.amount) : ''
  );
  const [currency, setCurrency] = useState(
    target.existingExpense?.currency || target.defaultCurrency || 'USD'
  );
  const [showDropdown, setShowDropdown] = useState(false);

  const handleKey = (key: string) => {
    if (key === '⌫') {
      setAmount((prev) => prev.slice(0, -1));
    } else if (key === '.') {
      if (!amount.includes('.')) setAmount((prev) => prev + '.');
    } else {
      setAmount((prev) => prev + key);
    }
  };

  const handleSave = () => {
    const parsed = parseFloat(amount);
    if (!isNaN(parsed) && parsed > 0) {
      onSave(target.activityId, { amount: parsed, currency });
    }
    onClose();
  };

  const handleDelete = () => {
    onSave(target.activityId, null);
    onClose();
  };

  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  const displayAmount = amount || '0';

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.card}>
        <Text style={styles.title}>Expense</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{target.activityTitle}</Text>

        {/* Amount display */}
        <View style={styles.amountRow}>
          <Pressable
            style={styles.currencyButton}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={styles.currencyButtonText}>{currency}</Text>
            <Text style={styles.currencyChevron}>▾</Text>
          </Pressable>
          <Text style={[styles.amountDisplay, !amount && styles.amountPlaceholder]}>
            {sym}{displayAmount}
          </Text>
        </View>

        {/* Currency dropdown */}
        {showDropdown && (
          <View style={styles.dropdown}>
            {CURRENCIES.map((cur) => (
              <Pressable
                key={cur}
                style={[
                  styles.dropdownOption,
                  cur === currency && styles.dropdownOptionSelected,
                ]}
                onPress={() => { setCurrency(cur); setShowDropdown(false); }}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  cur === currency && styles.dropdownOptionTextSelected,
                ]}>{cur}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Number pad */}
        <View style={styles.pad}>
          {PAD_KEYS.map((key) => (
            <Pressable
              key={key}
              style={({ pressed }) => [styles.padKey, pressed && styles.padKeyPressed]}
              onPress={() => handleKey(key)}
            >
              <Text style={styles.padKeyText}>{key}</Text>
            </Pressable>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {target.existingExpense && (
            <Pressable onPress={handleDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }} />
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currencyButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  currencyChevron: {
    fontSize: 11,
    color: '#888',
    marginLeft: 4,
  },
  amountDisplay: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'right',
  },
  amountPlaceholder: {
    color: '#ccc',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  dropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  dropdownOptionSelected: {
    backgroundColor: '#E8F0FE',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  padKey: {
    width: '33.33%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padKeyPressed: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  padKeyText: {
    fontSize: 22,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
