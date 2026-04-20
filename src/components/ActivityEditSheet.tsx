import React, { useRef, useMemo, useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  ScrollView, Alert, StyleSheet, Keyboard, PanResponder, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Activity } from '../types';

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

function PillToggle<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { label: string; value: T; color?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={pillStyles.row}>
      <Text style={pillStyles.label}>{label}</Text>
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

const PILL_MIN_W = 68;

const pillStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#888', marginRight: 4 },
  pill: {
    minWidth: PILL_MIN_W, alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#f0f0f0',
  },
  pillText: { fontSize: 13, fontWeight: '600', color: '#666' },
  pillTextActive: { color: '#fff' },
});

const HOUR_ITEMS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MIN_ITEMS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const PERIOD_ITEMS = ['AM', 'PM'];
const SLOT_H = 32;
const PICKER_H = SLOT_H * 3;

function wrap(idx: number, count: number) {
  return ((idx % count) + count) % count;
}

function DragColumn({ items, selectedIndex, onSelect, cyclic }: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  cyclic?: boolean;
}) {
  const count = items.length;
  const offsetY = useRef(new Animated.Value(0)).current;
  const baseIdxRef = useRef(selectedIndex);
  const [displayIdx, setDisplayIdx] = useState(selectedIndex);
  const displayIdxRef = useRef(selectedIndex);

  useEffect(() => {
    baseIdxRef.current = selectedIndex;
    displayIdxRef.current = selectedIndex;
    setDisplayIdx(selectedIndex);
  }, [selectedIndex]);

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      baseIdxRef.current = displayIdxRef.current;
    },
    onPanResponderMove: (_, g) => {
      if (cyclic) {
        const rawIdx = baseIdxRef.current + (-g.dy / SLOT_H);
        const snappedIdx = wrap(Math.round(rawIdx), count);
        // Compute remainder relative to snapped position for smooth sub-slot offset
        const snappedRaw = baseIdxRef.current + (wrap(snappedIdx - baseIdxRef.current + Math.floor(count / 2), count) - Math.floor(count / 2));
        const remainder = -(rawIdx - snappedRaw) * SLOT_H;
        offsetY.setValue(remainder);
        if (snappedIdx !== displayIdxRef.current) {
          displayIdxRef.current = snappedIdx;
          setDisplayIdx(snappedIdx);
          Haptics.selectionAsync();
        }
      } else {
        // For non-cyclic (e.g. AM/PM): clamp drag and rubber-band at edges
        const rawIdx = baseIdxRef.current + (-g.dy / SLOT_H);
        const clampedIdx = Math.max(-0.4, Math.min(count - 1 + 0.4, rawIdx));
        const snappedIdx = Math.max(0, Math.min(count - 1, Math.round(clampedIdx)));
        const remainder = -(clampedIdx - snappedIdx) * SLOT_H;
        offsetY.setValue(remainder);
        if (snappedIdx !== displayIdxRef.current) {
          displayIdxRef.current = snappedIdx;
          setDisplayIdx(snappedIdx);
          Haptics.selectionAsync();
        }
      }
    },
    onPanResponderRelease: () => {
      onSelectRef.current(displayIdxRef.current);
      Animated.spring(offsetY, { toValue: 0, tension: 120, friction: 14, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => {
      offsetY.setValue(0);
    },
  }), [count, cyclic, offsetY]);

  const getItem = (offset: number) => {
    if (cyclic) return items[wrap(displayIdx + offset, count)];
    const idx = displayIdx + offset;
    return idx >= 0 && idx < count ? items[idx] : '';
  };

  return (
    <View style={pickerStyles.colWrapper} {...panResponder.panHandlers}>
      <View style={pickerStyles.highlight} pointerEvents="none" />
      <Animated.View style={[pickerStyles.slotsContainer, { transform: [{ translateY: offsetY }] }]}>
        {[-2, -1, 0, 1, 2].map((offset) => (
          <View key={offset} style={pickerStyles.slot}>
            <Text style={[pickerStyles.slotText, offset === 0 && pickerStyles.slotTextActive]}>
              {getItem(offset)}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function ScrollTimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = value.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  const initH = parsed ? parseInt(parsed[1], 10) : 12;
  const initM = parsed ? parseInt(parsed[2], 10) : 0;
  const initP = parsed ? (parsed[3].toUpperCase() === 'PM' ? 1 : 0) : 0;

  const [hourIdx, setHourIdx] = useState(HOUR_ITEMS.indexOf(String(initH)) >= 0 ? HOUR_ITEMS.indexOf(String(initH)) : 11);
  const [minIdx, setMinIdx] = useState(() => {
    const rounded = Math.round(initM / 5) * 5;
    const idx = MIN_ITEMS.indexOf(String(rounded).padStart(2, '0'));
    return idx >= 0 ? idx : 0;
  });
  const [periodIdx, setPeriodIdx] = useState(initP);

  useEffect(() => {
    const h = HOUR_ITEMS[hourIdx];
    const m = MIN_ITEMS[minIdx];
    const p = PERIOD_ITEMS[periodIdx].toLowerCase();
    onChange(`${h}:${m}${p}`);
  }, [hourIdx, minIdx, periodIdx]);

  return (
    <View style={pickerStyles.container}>
      <View style={pickerStyles.columns}>
        <DragColumn items={HOUR_ITEMS} selectedIndex={hourIdx} onSelect={setHourIdx} cyclic />
        <Text style={pickerStyles.colon}>:</Text>
        <DragColumn items={MIN_ITEMS} selectedIndex={minIdx} onSelect={setMinIdx} cyclic />
        <DragColumn items={PERIOD_ITEMS} selectedIndex={periodIdx} onSelect={setPeriodIdx} />
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: { marginTop: 2, marginBottom: -2, alignItems: 'center' },
  columns: { flexDirection: 'row', alignItems: 'center' },
  colWrapper: { height: PICKER_H, width: 44, position: 'relative', overflow: 'hidden' },
  highlight: {
    position: 'absolute', top: SLOT_H, left: 2, right: 2,
    height: SLOT_H, borderRadius: 6, backgroundColor: '#e8f0fe',
    zIndex: -1,
  },
  slotsContainer: { height: SLOT_H * 5, marginTop: -SLOT_H },
  slot: { height: SLOT_H, alignItems: 'center', justifyContent: 'center' },
  slotText: { fontSize: 15, color: '#888' },
  slotTextActive: { color: '#1a1a1a', fontWeight: '700' },
  colon: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginHorizontal: 1 },
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
  const scrollRef = React.useRef<ScrollView>(null);
  const fieldRefs = React.useRef<Record<string, View | null>>({});
  const scrollOffsetRef = React.useRef(0);

  const keyboardVisibleRef = React.useRef(false);
  const keyboardTopRef = React.useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardVisibleRef.current = true;
      keyboardTopRef.current = e.endCoordinates.screenY;
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      keyboardVisibleRef.current = false;
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const scrollToField = (fieldName: string) => {
    const doScroll = (kbTop: number) => {
      // Delay to let layout settle after picker collapse
      setTimeout(() => {
        const fieldView = fieldRefs.current[fieldName];
        if (!fieldView || !scrollRef.current) return;
        fieldView.measureInWindow((_x: number, y: number, _w: number, h: number) => {
          if (!kbTop) return;
          const fieldBottom = y + h + 12;
          if (fieldBottom > kbTop) {
            scrollRef.current?.scrollTo({
              y: scrollOffsetRef.current + (fieldBottom - kbTop),
              animated: true,
            });
          }
        });
      }, 50);
    };

    if (keyboardVisibleRef.current) {
      // Keyboard already up — measure after brief layout settle
      doScroll(keyboardTopRef.current);
    } else {
      // Keyboard appearing (e.g. from time picker) — wait for it, then measure after layout settles
      const listener = Keyboard.addListener('keyboardDidShow', (e) => {
        listener.remove();
        keyboardTopRef.current = e.endCoordinates.screenY;
        // Extra delay: picker collapse + keyboard inset padding both need to settle
        setTimeout(() => doScroll(e.endCoordinates.screenY), 100);
      });
    }
  };

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
      <View style={styles.sheetWrapper}>
        <Pressable style={styles.sheet} onPress={Keyboard.dismiss}>
          <View style={styles.headerRow}>
            <Text style={styles.heading}>{isNew ? 'New Activity' : 'Edit Activity'}</Text>
            {!isNew && onDelete && (
              <Pressable onPress={handleDelete}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scrollBody}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardHeight || 16 }]}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={activeTimeField === null}
            onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
          >
            <PillToggle
              label="Type"
              options={[
                { label: 'Place', value: 'activity' },
                { label: 'Transit', value: 'transport' },
              ]}
              value={actType}
              onChange={handleTypeChange}
            />

            {actType === 'activity' && (
              <PillToggle
                label="Category"
                options={[
                  { label: 'Default', value: 'none', color: ACCENT_COLORS.none },
                  { label: 'Stay', value: 'hotel', color: ACCENT_COLORS.hotel },
                  { label: 'Food', value: 'meal', color: ACCENT_COLORS.meal },
                ]}
                value={category}
                onChange={setCategory}
              />
            )}

            {actType === 'activity' && parentOptions.length > 0 && (
              <View style={styles.parentRow}>
                <Text style={styles.parentLabel}>Parent Activity</Text>
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
              </View>
            )}

            {/* Time fields with inline pickers */}
            <View style={styles.timeRow}>
              <View style={styles.timeCol}>
                <Pressable
                  style={[styles.timeInput, activeTimeField === 'start' && styles.timeInputActive]}
                  onPress={() => { Keyboard.dismiss(); setActiveTimeField(activeTimeField === 'start' ? null : 'start'); }}
                >
                  <Text style={[styles.timeDisplayText, !startTime && styles.placeholder]}>
                    {startTime || 'Start Time'}
                  </Text>
                  {!!startTime && (
                    <TouchableOpacity
                      style={styles.timeClear}
                      onPress={() => { setStartTime(''); setActiveTimeField(null); }}
                      hitSlop={8}
                    >
                      <Text style={styles.timeClearText}>×</Text>
                    </TouchableOpacity>
                  )}
                </Pressable>
                {activeTimeField === 'start' && (
                  <ScrollTimePicker value={startTime} onChange={setStartTime} />
                )}
              </View>
              <View style={styles.timeCol}>
                <Pressable
                  style={[styles.timeInput, activeTimeField === 'end' && styles.timeInputActive]}
                  onPress={() => { Keyboard.dismiss(); setActiveTimeField(activeTimeField === 'end' ? null : 'end'); }}
                >
                  <Text style={[styles.timeDisplayText, !endTime && styles.placeholder]}>
                    {endTime || 'End Time'}
                  </Text>
                  {!!endTime && (
                    <TouchableOpacity
                      style={styles.timeClear}
                      onPress={() => { setEndTime(''); setActiveTimeField(null); }}
                      hitSlop={8}
                    >
                      <Text style={styles.timeClearText}>×</Text>
                    </TouchableOpacity>
                  )}
                </Pressable>
                {activeTimeField === 'end' && (
                  <ScrollTimePicker value={endTime} onChange={setEndTime} />
                )}
              </View>
            </View>

            <View ref={(r) => { fieldRefs.current['title'] = r; }}>
              <TextInput
                style={[styles.input, styles.fieldSpacing]}
                value={title}
                onChangeText={setTitle}
                placeholder="Title"
                placeholderTextColor="#bbb"
                onFocus={() => { setActiveTimeField(null); scrollToField('title'); }}
              />
            </View>

            <View ref={(r) => { fieldRefs.current['description'] = r; }}>
              <TextInput
                style={[styles.input, styles.multiline, styles.fieldSpacing]}
                value={description}
                onChangeText={setDescription}
                placeholder="Description"
                placeholderTextColor="#bbb"
                multiline
                onFocus={() => { setActiveTimeField(null); scrollToField('description'); }}
              />
            </View>

            <View ref={(r) => { fieldRefs.current['hours'] = r; }}>
              <TextInput
                style={[styles.input, styles.fieldSpacing]}
                value={hours}
                onChangeText={setHours}
                placeholder="Opening Hours"
                placeholderTextColor="#bbb"
                onFocus={() => { setActiveTimeField(null); scrollToField('hours'); }}
              />
            </View>

            <View ref={(r) => { fieldRefs.current['notes'] = r; }}>
              <TextInput
                style={[styles.input, styles.multiline, styles.fieldSpacing]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional Notes"
                placeholderTextColor="#bbb"
                multiline
                onFocus={() => { setActiveTimeField(null); scrollToField('notes'); }}
              />
            </View>

            <View ref={(r) => { fieldRefs.current['location'] = r; }}>
              <TextInput
                style={[styles.input, styles.fieldSpacing]}
                value={location}
                onChangeText={setLocation}
                placeholder="Location / Address"
                placeholderTextColor="#bbb"
                onFocus={() => { setActiveTimeField(null); scrollToField('location'); }}
              />
            </View>

          </ScrollView>

          <View style={{ flexGrow: 1 }} />
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </View>
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
    flex: 1,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
    marginTop: 8,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
    flex: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 16,
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
    height: 44,
    justifyContent: 'center',
    textAlignVertical: 'center',
    fontSize: 14,
    color: '#1a1a1a',
  },
  multiline: {
    height: undefined,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  fieldSpacing: {
    marginTop: 8,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeCol: {
    flex: 1,
  },
  timeInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  timeClear: {
    position: 'absolute',
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeClearText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
    marginTop: 1,
  },
  timeInputActive: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  timeDisplayText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  placeholder: {
    color: '#bbb',
    fontWeight: '400',
  },
  parentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  parentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginRight: 12,
  },
  parentScroll: {
    flex: 1,
  },
  parentChip: {
    minWidth: PILL_MIN_W,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
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
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
