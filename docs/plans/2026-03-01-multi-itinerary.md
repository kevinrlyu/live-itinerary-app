# Multi-Itinerary Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a slide-in drawer to the itinerary app that lets the user switch between multiple saved trips, import new ones, re-import the current one, and delete old ones.

**Architecture:** Storage is refactored from a single `saved_trip` key to per-trip keys (`trip_<id>`) plus a `trip_list` metadata index and `active_trip_id`. A new `TripHeader` bar sits above the day tabs and shows a ≡ button that opens a `TripDrawer` modal sliding in from the right.

**Tech Stack:** Expo/React Native, TypeScript, AsyncStorage, React Native Animated + Modal

---

### Task 1: Update types

**Files:**
- Modify: `src/types.ts`
- Modify: `src/__tests__/types.test.ts`

**Step 1: Update types.ts**

Replace the contents of `src/types.ts` with:

```typescript
export interface Activity {
  id: string;
  time: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  completed: boolean;
}

export interface Day {
  date: string;
  label: string;
  theme: string;
  activities: Activity[];
}

export interface Trip {
  id: string;         // NEW — unique identifier
  docUrl: string;     // NEW — original Google Doc URL for re-import
  title: string;
  days: Day[];
}

export interface TripMeta {
  id: string;
  title: string;
  dateRange: string;  // e.g. "Dec 10–13"
  docUrl: string;
}
```

**Step 2: Update the types test to include the new fields**

Replace `src/__tests__/types.test.ts` with:

```typescript
import { Activity, Day, Trip, TripMeta } from '../types';

describe('Types', () => {
  it('Activity allows null time and location', () => {
    const activity: Activity = {
      id: '1',
      time: null,
      title: 'Explore Ueno Park',
      location: null,
      notes: null,
      completed: false,
    };
    expect(activity.completed).toBe(false);
  });

  it('Trip contains id, docUrl, and days', () => {
    const trip: Trip = {
      id: 'abc123',
      docUrl: 'https://docs.google.com/document/d/abc/edit',
      title: 'Tokyo Trip',
      days: [
        {
          date: '2025-12-10',
          label: 'Wed, Dec 10',
          theme: 'Pre-Arrival',
          activities: [],
        },
      ],
    };
    expect(trip.id).toBe('abc123');
    expect(trip.days).toHaveLength(1);
  });

  it('TripMeta contains id, title, dateRange, docUrl', () => {
    const meta: TripMeta = {
      id: 'abc123',
      title: 'Tokyo Trip',
      dateRange: 'Dec 10–13',
      docUrl: 'https://docs.google.com/document/d/abc/edit',
    };
    expect(meta.dateRange).toBe('Dec 10–13');
  });
});
```

**Step 3: Run the test**

```bash
cd /Users/kevinyu/Development/live-itinerary-app
npx jest src/__tests__/types.test.ts --no-coverage 2>&1 | tail -8
```

Expected: 3 tests PASS

**Step 4: Commit**

```bash
git add src/types.ts src/__tests__/types.test.ts
git commit -m "feat: add id, docUrl to Trip and new TripMeta type"
```

---

### Task 2: Refactor storage layer

**Files:**
- Modify: `src/utils/storage.ts`
- Modify: `src/__tests__/storage.test.ts`

**Step 1: Write new failing tests**

Replace `src/__tests__/storage.test.ts` with:

```typescript
import {
  saveTripFull, loadTripFull, deleteTrip,
  loadTripList, saveTripList,
  loadActiveTripId, saveActiveTripId,
} from '../utils/storage';
import { Trip, TripMeta } from '../types';

let store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
  },
}));

const mockTrip: Trip = {
  id: 'trip-1',
  docUrl: 'https://docs.google.com/document/d/abc/edit',
  title: 'Tokyo Trip',
  days: [],
};

const mockMeta: TripMeta = {
  id: 'trip-1',
  title: 'Tokyo Trip',
  dateRange: 'Dec 10–13',
  docUrl: 'https://docs.google.com/document/d/abc/edit',
};

beforeEach(() => { store = {}; });

describe('storage', () => {
  it('saves and loads a full trip by id', async () => {
    await saveTripFull(mockTrip);
    const loaded = await loadTripFull('trip-1');
    expect(loaded?.title).toBe('Tokyo Trip');
    expect(loaded?.id).toBe('trip-1');
  });

  it('returns null when trip id not found', async () => {
    const loaded = await loadTripFull('nonexistent');
    expect(loaded).toBeNull();
  });

  it('deletes a trip by id', async () => {
    await saveTripFull(mockTrip);
    await deleteTrip('trip-1');
    const loaded = await loadTripFull('trip-1');
    expect(loaded).toBeNull();
  });

  it('saves and loads trip list', async () => {
    await saveTripList([mockMeta]);
    const list = await loadTripList();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('Tokyo Trip');
  });

  it('saves and loads active trip id', async () => {
    await saveActiveTripId('trip-1');
    const id = await loadActiveTripId();
    expect(id).toBe('trip-1');
  });
});
```

**Step 2: Run to verify failure**

```bash
cd /Users/kevinyu/Development/live-itinerary-app
npx jest src/__tests__/storage.test.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — functions not found

**Step 3: Replace storage.ts**

Replace `src/utils/storage.ts` with:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip, TripMeta } from '../types';

const TRIP_LIST_KEY = 'trip_list';
const ACTIVE_TRIP_KEY = 'active_trip_id';
const tripKey = (id: string) => `trip_${id}`;

export async function saveTripFull(trip: Trip): Promise<void> {
  await AsyncStorage.setItem(tripKey(trip.id), JSON.stringify(trip));
}

export async function loadTripFull(id: string): Promise<Trip | null> {
  const json = await AsyncStorage.getItem(tripKey(id));
  return json ? (JSON.parse(json) as Trip) : null;
}

export async function deleteTrip(id: string): Promise<void> {
  await AsyncStorage.removeItem(tripKey(id));
}

export async function loadTripList(): Promise<TripMeta[]> {
  const json = await AsyncStorage.getItem(TRIP_LIST_KEY);
  return json ? (JSON.parse(json) as TripMeta[]) : [];
}

export async function saveTripList(list: TripMeta[]): Promise<void> {
  await AsyncStorage.setItem(TRIP_LIST_KEY, JSON.stringify(list));
}

export async function loadActiveTripId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_TRIP_KEY);
}

export async function saveActiveTripId(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TRIP_KEY, id);
}
```

**Step 4: Run tests**

```bash
cd /Users/kevinyu/Development/live-itinerary-app
npx jest src/__tests__/storage.test.ts --no-coverage 2>&1 | tail -8
```

Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add src/utils/storage.ts src/__tests__/storage.test.ts
git commit -m "feat: refactor storage to support multiple trips"
```

---

### Task 3: Update parser to assign id and docUrl

**Files:**
- Modify: `src/utils/parser.ts`
- Modify: `src/__tests__/parser.test.ts`

**Step 1: Update the parser mock and test**

Replace `src/__tests__/parser.test.ts` with:

```typescript
import { parseItineraryText } from '../utils/parser';

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: 'Tokyo Trip',
              days: [
                {
                  date: '2025-12-10',
                  label: 'Wed, Dec 10',
                  theme: 'Pre-Arrival',
                  activities: [
                    {
                      id: '1',
                      time: '19:25',
                      title: 'Arrive at Tokyo Haneda',
                      location: 'Tokyo Haneda Airport',
                      notes: 'Flight arrives 7:25pm',
                      completed: false,
                    },
                  ],
                },
              ],
            }),
          },
        ],
      }),
    },
  })),
}));

describe('parseItineraryText', () => {
  it('returns a Trip with id and docUrl set', async () => {
    const docUrl = 'https://docs.google.com/document/d/abc/edit';
    const trip = await parseItineraryText('some itinerary text', docUrl);
    expect(trip.title).toBe('Tokyo Trip');
    expect(trip.id).toBeTruthy();
    expect(trip.docUrl).toBe(docUrl);
    expect(trip.days[0].activities[0].time).toBe('19:25');
  });
});
```

**Step 2: Run to verify failure**

```bash
cd /Users/kevinyu/Development/live-itinerary-app
npx jest src/__tests__/parser.test.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL (signature mismatch)

**Step 3: Update parser.ts**

Replace the `parseItineraryText` function signature and return in `src/utils/parser.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { Trip } from '../types';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT = `You are a travel itinerary parser. Given raw text from a travel itinerary document, extract all information and return it as a JSON object matching this exact structure:

{
  "title": "string (trip name or destination)",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "label": "short readable label like 'Wed, Dec 10'",
      "theme": "short description of the day like 'Tokyo' or 'Pre-Arrival'",
      "activities": [
        {
          "id": "unique string like '1', '2', etc.",
          "time": "HH:MM in 24-hour format, or null if no time specified",
          "title": "activity name",
          "location": "place name or address, or null",
          "notes": "any extra detail, or null",
          "completed": false
        }
      ]
    }
  ]
}

Rules:
- Include ALL activities, restaurants, hotels, transport, and notable stops
- Convert times to 24-hour HH:MM format
- IMPORTANT: Determine the correct year by looking for it in the document title or body. If not explicitly stated, use the day-of-week hints in the document (e.g. "December 10 (Wednesday)") to identify the correct year — find the year where those dates match those days of the week.
- Return ONLY the JSON object, no other text`;

function generateId(): string {
  return `trip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function parseItineraryText(text: string, docUrl: string): Promise<Trip> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Parse this travel itinerary into JSON:\n\n${text}`,
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response from AI');

  try {
    const cleaned = content.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return { ...parsed, id: generateId(), docUrl } as Trip;
  } catch {
    throw new Error(`AI returned invalid data: ${content.text.slice(0, 300)}`);
  }
}
```

**Step 4: Run tests**

```bash
cd /Users/kevinyu/Development/live-itinerary-app
npx jest src/__tests__/parser.test.ts --no-coverage 2>&1 | tail -8
```

Expected: 1 test PASS

**Step 5: Commit**

```bash
git add src/utils/parser.ts src/__tests__/parser.test.ts
git commit -m "feat: parser now accepts docUrl and assigns id to Trip"
```

---

### Task 4: Update ImportScreen to use new storage and pass docUrl

**Files:**
- Modify: `src/screens/ImportScreen.tsx`

No new test — verified manually. Update the import logic to use the new storage functions and pass docUrl to the parser.

**Step 1: Replace ImportScreen.tsx**

```typescript
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { fetchDocText } from '../utils/googleDocs';
import { parseItineraryText } from '../utils/parser';
import { saveTripFull, saveTripList, loadTripList, saveActiveTripId } from '../utils/storage';
import { Trip, TripMeta } from '../types';

interface Props {
  onImport: (trip: Trip) => void;
  onCancel?: () => void;
}

function buildDateRange(trip: Trip): string {
  if (trip.days.length === 0) return '';
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;
  const fmt = (d: string) => {
    const dt = new Date(`${d}T12:00:00`);
    return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]} ${dt.getDate()}`;
  };
  return first === last ? fmt(first) : `${fmt(first)}–${fmt(last)}`;
}

export default function ImportScreen({ onImport, onCancel }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!url.trim()) {
      Alert.alert('Paste your Google Doc link first.');
      return;
    }
    setLoading(true);
    try {
      const text = await fetchDocText(url.trim());
      const trip = await parseItineraryText(text, url.trim());
      await saveTripFull(trip);
      const meta: TripMeta = {
        id: trip.id,
        title: trip.title,
        dateRange: buildDateRange(trip),
        docUrl: url.trim(),
      };
      const list = await loadTripList();
      await saveTripList([...list, meta]);
      await saveActiveTripId(trip.id);
      onImport(trip);
    } catch (err: any) {
      Alert.alert('Import Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Travel Itinerary</Text>
      <Text style={styles.subtitle}>Paste a Google Doc link to get started</Text>
      <TextInput
        style={styles.input}
        placeholder="https://docs.google.com/document/d/..."
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      <TouchableOpacity style={styles.button} onPress={handleImport} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Import Itinerary</Text>
        )}
      </TouchableOpacity>
      {onCancel && (
        <TouchableOpacity onPress={onCancel} disabled={loading}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.hint}>
        Make sure your Google Doc is shared with "Anyone with the link can view"
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#f5f5f5',
    justifyContent: 'center', padding: 24,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    fontSize: 14, borderWidth: 1, borderColor: '#ddd', marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF', borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancel: { color: '#007AFF', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  hint: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8 },
});
```

**Step 2: Run all tests**

```bash
cd /Users/kevinyu/Development/live-itinerary-app
npx jest --no-coverage 2>&1 | tail -8
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/screens/ImportScreen.tsx
git commit -m "feat: update ImportScreen to save multiple trips with metadata"
```

---

### Task 5: TripHeader component

**Files:**
- Create: `src/components/TripHeader.tsx`

No unit test — simple presentational component, verified visually.

**Step 1: Create TripHeader.tsx**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  title: string;
  onOpenDrawer: () => void;
}

export default function TripHeader({ title, onOpenDrawer }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <TouchableOpacity onPress={onOpenDrawer} style={styles.menuButton} testID="menu-button">
        <Text style={styles.menuIcon}>≡</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  menuButton: {
    padding: 4,
  },
  menuIcon: {
    fontSize: 22,
    color: '#007AFF',
  },
});
```

**Step 2: Commit**

```bash
git add src/components/TripHeader.tsx
git commit -m "feat: add TripHeader component with menu button"
```

---

### Task 6: TripDrawer component

**Files:**
- Create: `src/components/TripDrawer.tsx`

**Step 1: Create TripDrawer.tsx**

```typescript
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated,
  FlatList, StyleSheet, Dimensions, Alert,
} from 'react-native';
import { TripMeta } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

interface Props {
  visible: boolean;
  trips: TripMeta[];
  activeTripId: string;
  onClose: () => void;
  onSelectTrip: (id: string) => void;
  onImportNew: () => void;
  onReimportCurrent: () => void;
  onDeleteTrip: (id: string) => void;
  reimporting: boolean;
}

export default function TripDrawer({
  visible, trips, activeTripId, onClose,
  onSelectTrip, onImportNew, onReimportCurrent, onDeleteTrip, reimporting,
}: Props) {
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const confirmDelete = (trip: TripMeta) => {
    Alert.alert(
      'Delete Itinerary',
      `Remove "${trip.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteTrip(trip.id) },
      ]
    );
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <Text style={styles.drawerTitle}>My Itineraries</Text>

        <TouchableOpacity
          style={[styles.actionButton, reimporting && styles.actionButtonDisabled]}
          onPress={onReimportCurrent}
          disabled={reimporting}
        >
          <Text style={styles.actionButtonText}>
            {reimporting ? 'Re-importing…' : '↻  Re-import Current'}
          </Text>
        </TouchableOpacity>

        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          style={styles.list}
          renderItem={({ item }) => (
            <View style={styles.tripRow}>
              <TouchableOpacity
                style={styles.tripInfo}
                onPress={() => onSelectTrip(item.id)}
              >
                <Text style={styles.tripTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.tripDate}>{item.dateRange}</Text>
              </TouchableOpacity>
              <View style={styles.tripActions}>
                {item.id === activeTripId && <Text style={styles.checkmark}>✓</Text>}
                <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteButton}>
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        <TouchableOpacity style={styles.importButton} onPress={onImportNew}>
          <Text style={styles.importButtonText}>+ Import New Itinerary</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#333' },
  list: { flex: 1 },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tripInfo: { flex: 1 },
  tripTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  tripDate: { fontSize: 12, color: '#888', marginTop: 2 },
  tripActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkmark: { fontSize: 16, color: '#007AFF', fontWeight: '700' },
  deleteButton: { padding: 4 },
  deleteText: { fontSize: 14, color: '#FF3B30' },
  importButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  importButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
```

**Step 2: Commit**

```bash
git add src/components/TripDrawer.tsx
git commit -m "feat: add TripDrawer slide-in component"
```

---

### Task 7: Rewire App.tsx

**Files:**
- Modify: `App.tsx`

**Step 1: Replace App.tsx**

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Trip, TripMeta } from './src/types';
import {
  loadTripFull, saveTripFull,
  loadTripList, saveTripList,
  loadActiveTripId, saveActiveTripId,
  deleteTrip as deleteTripFromStorage,
} from './src/utils/storage';
import { fetchDocText } from './src/utils/googleDocs';
import { parseItineraryText } from './src/utils/parser';
import ImportScreen from './src/screens/ImportScreen';
import DayScreen from './src/screens/DayScreen';
import TripHeader from './src/components/TripHeader';
import TripDrawer from './src/components/TripDrawer';

const Tab = createMaterialTopTabNavigator();

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDayLabel(dateStr: string): { dayOfWeek: string; monthDay: string } {
  const d = new Date(`${dateStr}T12:00:00`);
  return {
    dayOfWeek: DAY_NAMES[d.getDay()],
    monthDay: `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`,
  };
}

function getTodayTabName(trip: Trip): string {
  const today = new Date().toISOString().split('T')[0];
  const day = trip.days.find((d) => d.date === today) ?? trip.days[0];
  return day?.date ?? '';
}

function buildDateRange(trip: Trip): string {
  if (trip.days.length === 0) return '';
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;
  const fmt = (d: string) => {
    const dt = new Date(`${d}T12:00:00`);
    return `${MONTH_NAMES[dt.getMonth()]} ${dt.getDate()}`;
  };
  return first === last ? fmt(first) : `${fmt(first)}–${fmt(last)}`;
}

export default function App() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripList, setTripList] = useState<TripMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [reimporting, setReimporting] = useState(false);

  useEffect(() => {
    (async () => {
      const [list, activeId] = await Promise.all([loadTripList(), loadActiveTripId()]);
      setTripList(list);
      if (activeId) {
        const active = await loadTripFull(activeId);
        if (active) setTrip(active);
      }
      setLoaded(true);
    })();
  }, []);

  const handleImport = useCallback(async (newTrip: Trip) => {
    setTrip(newTrip);
    const list = await loadTripList();
    setTripList(list);
    setShowImport(false);
    setDrawerOpen(false);
  }, []);

  const handleToggle = useCallback((activityId: string) => {
    if (!trip) return;
    const updated: Trip = {
      ...trip,
      days: trip.days.map((day) => ({
        ...day,
        activities: day.activities.map((a) =>
          a.id === activityId ? { ...a, completed: !a.completed } : a
        ),
      })),
    };
    setTrip(updated);
    saveTripFull(updated);
  }, [trip]);

  const handleSelectTrip = useCallback(async (id: string) => {
    const selected = await loadTripFull(id);
    if (selected) {
      setTrip(selected);
      await saveActiveTripId(id);
    }
    setDrawerOpen(false);
  }, []);

  const handleDeleteTrip = useCallback(async (id: string) => {
    await deleteTripFromStorage(id);
    const newList = tripList.filter((t) => t.id !== id);
    await saveTripList(newList);
    setTripList(newList);
    if (trip?.id === id) {
      if (newList.length > 0) {
        const next = await loadTripFull(newList[0].id);
        setTrip(next);
        await saveActiveTripId(newList[0].id);
      } else {
        setTrip(null);
      }
    }
    setDrawerOpen(false);
  }, [trip, tripList]);

  const handleReimport = useCallback(async () => {
    if (!trip?.docUrl) return;
    setReimporting(true);
    try {
      const text = await fetchDocText(trip.docUrl);
      const updated = await parseItineraryText(text, trip.docUrl);
      const refreshed: Trip = { ...updated, id: trip.id };
      await saveTripFull(refreshed);
      const newMeta: TripMeta = {
        id: trip.id,
        title: refreshed.title,
        dateRange: buildDateRange(refreshed),
        docUrl: trip.docUrl,
      };
      const newList = tripList.map((t) => t.id === trip.id ? newMeta : t);
      await saveTripList(newList);
      setTripList(newList);
      setTrip(refreshed);
      setDrawerOpen(false);
    } catch (err: any) {
      alert(`Re-import failed: ${err.message}`);
    } finally {
      setReimporting(false);
    }
  }, [trip, tripList]);

  if (!loaded) return null;

  if (!trip) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <ImportScreen onImport={handleImport} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <TripHeader title={trip.title} onOpenDrawer={() => setDrawerOpen(true)} />
        <NavigationContainer>
          <Tab.Navigator initialRouteName={getTodayTabName(trip)}>
            {trip.days.map((day) => {
              const { dayOfWeek, monthDay } = formatDayLabel(day.date);
              return (
                <Tab.Screen
                  key={day.date}
                  name={day.date}
                  children={() => <DayScreen day={day} onToggle={handleToggle} />}
                  options={{
                    tabBarLabel: ({ color }) => (
                      <React.Fragment>
                        <React.Fragment>
                          {/* dayOfWeek */}
                        </React.Fragment>
                      </React.Fragment>
                    ),
                  }}
                />
              );
            })}
          </Tab.Navigator>
        </NavigationContainer>

        <TripDrawer
          visible={drawerOpen}
          trips={tripList}
          activeTripId={trip.id}
          onClose={() => setDrawerOpen(false)}
          onSelectTrip={handleSelectTrip}
          onImportNew={() => { setDrawerOpen(false); setShowImport(true); }}
          onReimportCurrent={handleReimport}
          onDeleteTrip={handleDeleteTrip}
          reimporting={reimporting}
        />

        <Modal visible={showImport} animationType="slide">
          <SafeAreaView style={styles.container}>
            <ImportScreen
              onImport={handleImport}
              onCancel={() => setShowImport(false)}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabLabel: { alignItems: 'center' },
  tabDayOfWeek: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  tabMonthDay: { fontSize: 11, color: '#555', marginTop: 1 },
});
```

Note: The `tabBarLabel` in this task uses a simplified placeholder. After writing this file, fix the `tabBarLabel` to render two `Text` components exactly as in the current App.tsx (copy the `tabLabel` view pattern from the existing file).

**Step 2: Fix the tabBarLabel**

In the `Tab.Screen` options, replace the placeholder `tabBarLabel` with:

```typescript
options={{
  tabBarLabel: () => (
    <View style={styles.tabLabel}>
      <Text style={styles.tabDayOfWeek}>{dayOfWeek}</Text>
      <Text style={styles.tabMonthDay}>{monthDay}</Text>
    </View>
  ),
}}
```

Also add `View, Text` to the React Native import at the top of App.tsx.

**Step 3: Run TypeScript check**

```bash
cd /Users/kevinyu/Development/live-itinerary-app
npx tsc --noEmit 2>&1 | head -20
```

Fix any errors.

**Step 4: Run all tests**

```bash
cd /Users/kevinyu/Development/live-itinerary-app
npx jest --no-coverage 2>&1 | tail -10
```

All tests should pass.

**Step 5: Commit**

```bash
git add App.tsx src/components/TripHeader.tsx src/components/TripDrawer.tsx
git commit -m "feat: wire up multi-itinerary drawer, header, and import modal"
```

---

### Task 8: Migration — handle existing single-trip storage

Users who already have a trip saved under the old `saved_trip` key won't see it after the storage refactor. Add a one-time migration on startup.

**Files:**
- Modify: `src/utils/storage.ts`

**Step 1: Add migration function to storage.ts**

Add this function at the bottom of `src/utils/storage.ts`:

```typescript
import { Trip, TripMeta } from '../types';

// Months for dateRange formatting
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildDateRange(trip: Trip): string {
  if (trip.days.length === 0) return '';
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;
  const fmt = (d: string) => {
    const dt = new Date(`${d}T12:00:00`);
    return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
  };
  return first === last ? fmt(first) : `${fmt(first)}–${fmt(last)}`;
}

export async function migrateOldStorage(): Promise<void> {
  const alreadyMigrated = await loadActiveTripId();
  if (alreadyMigrated) return;

  const oldJson = await AsyncStorage.getItem('saved_trip');
  if (!oldJson) return;

  const oldTrip = JSON.parse(oldJson) as Partial<Trip>;
  const id = `trip_${Date.now()}`;
  const trip: Trip = {
    id,
    docUrl: '',
    title: oldTrip.title ?? 'My Trip',
    days: oldTrip.days ?? [],
  };

  await saveTripFull(trip);
  const meta: TripMeta = {
    id,
    title: trip.title,
    dateRange: buildDateRange(trip),
    docUrl: '',
  };
  await saveTripList([meta]);
  await saveActiveTripId(id);
  await AsyncStorage.removeItem('saved_trip');
}
```

**Step 2: Call migration in App.tsx on startup**

In the `useEffect` in App.tsx, add `await migrateOldStorage()` as the first line:

```typescript
useEffect(() => {
  (async () => {
    await migrateOldStorage();   // <-- add this line
    const [list, activeId] = await Promise.all([loadTripList(), loadActiveTripId()]);
    ...
  })();
}, []);
```

Also add `migrateOldStorage` to the import from `./src/utils/storage`.

**Step 3: Run all tests**

```bash
cd /Users/kevinyu/Development/live-itinerary-app
npx jest --no-coverage 2>&1 | tail -10
```

All tests should pass.

**Step 4: Commit**

```bash
git add src/utils/storage.ts App.tsx
git commit -m "feat: migrate existing single-trip storage to multi-trip format"
```
