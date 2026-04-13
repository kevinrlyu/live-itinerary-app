import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_HEADERS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

interface Props {
  startDate: string | null;
  endDate: string | null;
  onSelect: (start: string, end: string | null) => void;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isSameOrAfter(a: string, b: string): boolean {
  return a >= b;
}

function isBetween(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export default function DateRangePicker({ startDate, endDate, onSelect }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrev = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNext = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDayPress = (day: number) => {
    const dateStr = toDateStr(viewYear, viewMonth, day);
    if (!startDate || endDate) {
      // First tap or reset: set start date
      onSelect(dateStr, null);
    } else {
      // Second tap: set end date (ensure order)
      if (isSameOrAfter(dateStr, startDate)) {
        onSelect(startDate, dateStr);
      } else {
        onSelect(dateStr, startDate);
      }
    }
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to always have 6 rows (42 cells) so grid height doesn't shift
  while (cells.length < 42) cells.push(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrev} style={styles.arrow}>
          <Text style={styles.arrowText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={handleNext} style={styles.arrow}>
          <Text style={styles.arrowText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dayHeaders}>
        {DAY_HEADERS.map((d) => (
          <Text key={d} style={styles.dayHeaderText}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (day === null) {
            return <View key={`e${idx}`} style={styles.cell} />;
          }
          const dateStr = toDateStr(viewYear, viewMonth, day);
          const isStart = startDate === dateStr;
          const isEnd = endDate === dateStr;
          const isInRange = startDate && endDate && isBetween(dateStr, startDate, endDate);
          const isSelected = isStart || isEnd;

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.cell,
                isInRange && !isSelected && styles.cellInRange,
                isSelected && styles.cellSelected,
              ]}
              onPress={() => handleDayPress(day)}
              activeOpacity={0.6}
            >
              <Text style={[
                styles.cellText,
                isSelected && styles.cellTextSelected,
              ]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  arrow: {
    padding: 8,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellInRange: {
    backgroundColor: '#D6EAFF',
  },
  cellSelected: {
    backgroundColor: '#007AFF',
  },
  cellText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  cellTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
});
