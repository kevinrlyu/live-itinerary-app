import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>New Itinerary</Text>

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

      <Text style={styles.label}>Currency</Text>
      <View style={{ zIndex: 10 }}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 24,
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
  },
  dateHint: {
    fontSize: 13,
    color: '#bbb',
    marginBottom: 4,
  },
  currencyButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  currencyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
  },
  currencyChevron: {
    fontSize: 11,
    color: '#888',
    marginLeft: 6,
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 100,
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
