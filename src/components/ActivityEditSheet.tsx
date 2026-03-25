import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  ScrollView, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Activity } from '../types';
import TimeKeypad from './TimeKeypad';

const ACCENT_COLORS: Record<string, string> = {
  none: '#007AFF',
  hotel: '#E91E63',
  meal: '#E53935',
};

interface Props {
  activity: Activity;
  dayActivities: Activity[];
  isNew: boolean;
  onSave: (activity: Activity) => void;
  onDelete?: (activityId: string) => void;
  onClose: () => void;
}

type ActivityType = 'activity' | 'transport';
type CategoryValue = 'none' | 'hotel' | 'meal';

function PillToggle<T extends string>({ options, value, onChange }: {
  options: { label: string; value: T; color?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={pillStyles.row}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        const activeColor = opt.color || '#007AFF';
        return (
          <TouchableOpacity
            key={opt.value}
            style={[pillStyles.pill, isActive && { backgroundColor: activeColor }]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[pillStyles.pillText, isActive && pillStyles.pillTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const pillStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#f0f0f0',
  },
  pillText: { fontSize: 13, fontWeight: '600', color: '#666' },
  pillTextActive: { color: '#fff' },
});

// Convert stored 24h "HH:MM" to display "H:MMam/pm", or pass through if already in 12h
function to12hDisplay(time: string): string {
  if (!time) return '';
  // Already has am/pm
  if (/am|pm$/i.test(time)) return time;
  const parts = time.split(':');
  if (parts.length !== 2) return time;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return time;
  const suffix = h >= 12 ? 'pm' : 'am';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m}${suffix}`;
}

// Convert display "H:MMam/pm" to 24h "HH:MM" for storage
function to24h(time: string): string {
  if (!time) return '';
  const match = time.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return time; // pass through if not parseable
  let h = parseInt(match[1], 10);
  const m = match[2];
  const isPm = match[3].toLowerCase() === 'pm';
  if (isPm && h !== 12) h += 12;
  if (!isPm && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
}

export default function ActivityEditSheet({ activity, dayActivities, isNew, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(activity.title);
  const [startTime, setStartTime] = useState(to12hDisplay(activity.time || ''));
  const [endTime, setEndTime] = useState(to12hDisplay(activity.timeEnd || ''));
  const [location, setLocation] = useState(activity.location || '');
  const [description, setDescription] = useState(activity.description || '');
  const [hours, setHours] = useState(activity.hours || '');
  const [notes, setNotes] = useState(activity.notes || '');
  const [actType, setActType] = useState<ActivityType>(activity.type || 'activity');
  const [category, setCategory] = useState<CategoryValue>(activity.category || 'none');
  const [parentId, setParentId] = useState<string | null>(activity.parentId || null);
  const [activeTimeField, setActiveTimeField] = useState<'start' | 'end' | null>(null);

  const parentOptions = dayActivities.filter(
    (a) => a.id !== activity.id && !a.parentId && a.type !== 'transport'
  );

  const handleTypeChange = (newType: ActivityType) => {
    setActType(newType);
    if (newType === 'transport') {
      setCategory('none');
      setParentId(null);
    }
  };

  const handleSave = () => {
    const updated: Activity = {
      ...activity,
      title: title.trim() || 'Untitled',
      time: to24h(startTime.trim()) || null,
      timeEnd: to24h(endTime.trim()) || null,
      location: location.trim() || null,
      description: description.trim() || null,
      hours: hours.trim() || null,
      notes: notes.trim() || null,
      type: actType,
      category: actType === 'transport' ? null : (category === 'none' ? null : category),
      parentId: actType === 'transport' ? null : (parentId || null),
    };
    onSave(updated);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Activity',
      `Remove "${activity.title || 'this activity'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(activity.id) },
      ]
    );
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.heading}>{isNew ? 'New Activity' : 'Edit Activity'}</Text>
            {!isNew && onDelete && (
              <TouchableOpacity onPress={handleDelete}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.scrollBody} keyboardShouldPersistTaps="handled">
            {/* Time fields with custom keypad */}
            <View style={styles.timeRow}>
              <View style={styles.timeCol}>
                <Text style={styles.label}>Start Time</Text>
                <Pressable
                  style={[styles.input, styles.timeInput, activeTimeField === 'start' && styles.timeInputActive]}
                  onPress={() => setActiveTimeField(activeTimeField === 'start' ? null : 'start')}
                >
                  <Text style={[styles.timeDisplayText, !startTime && styles.placeholder]}>
                    {startTime || 'tap to set'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.label}>End Time</Text>
                <Pressable
                  style={[styles.input, styles.timeInput, activeTimeField === 'end' && styles.timeInputActive]}
                  onPress={() => setActiveTimeField(activeTimeField === 'end' ? null : 'end')}
                >
                  <Text style={[styles.timeDisplayText, !endTime && styles.placeholder]}>
                    {endTime || 'tap to set'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {activeTimeField && (
              <TimeKeypad
                value={activeTimeField === 'start' ? startTime : endTime}
                onChange={activeTimeField === 'start' ? setStartTime : setEndTime}
              />
            )}

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Activity title"
              placeholderTextColor="#bbb"
              autoFocus={isNew}
              onFocus={() => setActiveTimeField(null)}
            />

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Location name or address"
              placeholderTextColor="#bbb"
              onFocus={() => setActiveTimeField(null)}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Short description"
              placeholderTextColor="#bbb"
              multiline
              onFocus={() => setActiveTimeField(null)}
            />

            <Text style={styles.label}>Hours</Text>
            <TextInput
              style={styles.input}
              value={hours}
              onChangeText={setHours}
              placeholder="e.g. 9:00–17:00, Closed Mondays"
              placeholderTextColor="#bbb"
              onFocus={() => setActiveTimeField(null)}
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes"
              placeholderTextColor="#bbb"
              multiline
              onFocus={() => setActiveTimeField(null)}
            />

            <Text style={styles.label}>Type</Text>
            <PillToggle
              options={[
                { label: 'Activity', value: 'activity' },
                { label: 'Transport', value: 'transport' },
              ]}
              value={actType}
              onChange={handleTypeChange}
            />

            {actType === 'activity' && (
              <>
                <Text style={styles.label}>Category</Text>
                <PillToggle
                  options={[
                    { label: 'Default', value: 'none', color: ACCENT_COLORS.none },
                    { label: 'Check-In', value: 'hotel', color: ACCENT_COLORS.hotel },
                    { label: 'Eat/Drink', value: 'meal', color: ACCENT_COLORS.meal },
                  ]}
                  value={category}
                  onChange={setCategory}
                />
              </>
            )}

            {actType === 'activity' && parentOptions.length > 0 && (
              <>
                <Text style={styles.label}>Parent Activity</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.parentScroll}>
                  <TouchableOpacity
                    style={[styles.parentChip, !parentId && styles.parentChipActive]}
                    onPress={() => setParentId(null)}
                  >
                    <Text style={[styles.parentChipText, !parentId && styles.parentChipTextActive]}>None</Text>
                  </TouchableOpacity>
                  {parentOptions.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.parentChip, parentId === a.id && styles.parentChipActive]}
                      onPress={() => setParentId(a.id)}
                    >
                      <Text
                        style={[styles.parentChipText, parentId === a.id && styles.parentChipTextActive]}
                        numberOfLines={1}
                      >
                        {a.title || a.id}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  scrollBody: {
    flexGrow: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1a1a1a',
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeCol: {
    flex: 1,
  },
  timeInput: {
    alignItems: 'center',
  },
  timeInputActive: {
    borderWidth: 2,
    borderColor: '#007AFF',
    padding: 10, // compensate for border
  },
  timeDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    color: '#bbb',
    fontWeight: '400',
  },
  parentScroll: {
    marginBottom: 8,
  },
  parentChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  parentChipActive: {
    backgroundColor: '#007AFF',
  },
  parentChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    maxWidth: 120,
  },
  parentChipTextActive: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
