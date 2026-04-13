import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trip } from '../types';
import { createBlankTrip } from '../utils/tripBuilder';
import DateRangePicker from '../components/DateRangePicker';

const CURRENCIES = ['CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'JPY', 'KRW', 'TWD', 'USD'];

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

interface Props {
  defaultCurrency: string;
  onCreateTrip: (trip: Trip) => void;
  onCancel: () => void;
}

export default function CreateTripScreen({ defaultCurrency, onCreateTrip, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const canCreate = title.trim().length > 0 && startDate && endDate;

  const handleCreate = () => {
    if (!canCreate) return;
    const trip = createBlankTrip(title.trim(), startDate!, endDate!, currency);
    onCreateTrip(trip);
  };

  const handleDateSelect = (start: string, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <View style={styles.container}>
    <View style={{ height: insets.top + 7, backgroundColor: '#fff' }} />
    <View style={styles.header}>
      <Text style={styles.headerTitle}>New Itinerary</Text>
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Japan Spring 2026"
        placeholderTextColor="#bbb"
        autoFocus
      />

      <Text style={styles.label}>Dates</Text>
      {startDate && (
        <Text style={styles.dateDisplay}>
          {formatDate(startDate)}{endDate ? ` – ${formatDate(endDate)}` : ' – select end date'}
        </Text>
      )}
      {!startDate && (
        <Text style={styles.dateHint}>Tap a start date, then an end date</Text>
      )}
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onSelect={handleDateSelect}
      />

      <View style={styles.currencyRow}>
        <Text style={styles.currencyLabel}>Default Currency</Text>
        <View>
          <TouchableOpacity
            style={styles.currencyButton}
            onPress={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
          >
            <Text style={styles.currencyButtonText}>{currency}</Text>
            <Text style={styles.currencyChevron}>▾</Text>
          </TouchableOpacity>
          {showCurrencyDropdown && (
            <View style={styles.dropdown}>
              {CURRENCIES.map((cur) => (
                <TouchableOpacity
                  key={cur}
                  style={[styles.dropdownOption, cur === currency && styles.dropdownOptionSelected]}
                  onPress={() => { setCurrency(cur); setShowCurrencyDropdown(false); }}
                >
                  <Text style={[styles.dropdownOptionText, cur === currency && styles.dropdownOptionTextSelected]}>{cur}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleCreate}
          style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
          disabled={!canCreate}
        >
          <Text style={styles.createText}>Create</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 17,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  dateDisplay: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
    height: 20,
  },
  dateHint: {
    fontSize: 14,
    color: '#bbb',
    marginBottom: 4,
    height: 20,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 0,
    marginTop: 16,
    zIndex: 10,
  },
  currencyLabel: {
    fontSize: 14,
    color: '#555',
  },
  currencyButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  currencyChevron: {
    fontSize: 11,
    color: '#888',
    marginLeft: 4,
  },
  dropdown: {
    position: 'absolute',
    top: 36,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 85,
    zIndex: 20,
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 32,
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  createBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  createBtnDisabled: {
    opacity: 0.4,
  },
  createText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
