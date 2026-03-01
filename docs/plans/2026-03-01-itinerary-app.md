# Travel Itinerary App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Expo/React Native iPhone app that imports a Google Doc travel itinerary, parses it with Claude AI, and displays a live day-tabbed interface with activity tracking and Google Maps directions.

**Architecture:** The app has two screens — an Import screen (paste Google Doc link → fetch + parse → save) and a main Itinerary screen (tabbed by day, activity cards with live tracking). Claude AI handles all itinerary parsing so no rigid format assumptions are needed. Parsed data is stored in AsyncStorage for offline use.

**Tech Stack:** Expo (React Native), TypeScript, Claude API (Anthropic SDK), AsyncStorage, React Navigation (Material Top Tabs), expo-linking

---

## Prerequisites (do these manually before starting tasks)

1. Make sure Node.js is installed: run `node --version` — should print v18 or higher. If not, download from https://nodejs.org
2. Install Expo CLI globally: `npm install -g expo-cli`
3. Install the **Expo Go** app on your iPhone from the App Store
4. Sign up for an Anthropic API account at https://console.anthropic.com and get an API key

---

### Task 1: Scaffold the Expo project

**Files:**
- Create: `/Users/kevinyu/Development/live-itinerary-app/` (project root, already exists)

**Step 1: Create the Expo app inside the existing directory**

```bash
cd /Users/kevinyu/Development/live-itinerary-app
npx create-expo-app@latest . --template blank-typescript
```

When prompted "The directory is not empty, continue?" — type `y`.

**Step 2: Install dependencies**

```bash
npm install @anthropic-ai/sdk
npm install @react-native-async-storage/async-storage
npm install @react-navigation/native @react-navigation/material-top-tabs
npm install react-native-tab-view react-native-pager-view
npx expo install react-native-screens react-native-safe-area-context
```

**Step 3: Create a .env file for your API key**

Create `/Users/kevinyu/Development/live-itinerary-app/.env` with this content (replace with your actual key):
```
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Step 4: Add .env to .gitignore (to keep your key private)**

Open `.gitignore` (created by Expo) and add this line at the bottom:
```
.env
```

**Step 5: Verify the app runs**

```bash
npx expo start
```

Scan the QR code with your iPhone's camera (or Expo Go app). You should see the default Expo "Hello World" screen. Press Ctrl+C to stop.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold expo project with dependencies"
```

---

### Task 2: Define TypeScript types

**Files:**
- Create: `src/types.ts`
- Create: `src/__tests__/types.test.ts`

**Step 1: Create the src directory and types file**

Create `src/types.ts`:
```typescript
export interface Activity {
  id: string;
  time: string | null;       // "14:30" in 24h format, or null if no time given
  title: string;
  location: string | null;
  notes: string | null;
  completed: boolean;
}

export interface Day {
  date: string;              // "2024-12-10"
  label: string;             // "Wed, Dec 10"
  theme: string;             // "Tokyo" or "Pre-Arrival"
  activities: Activity[];
}

export interface Trip {
  title: string;
  days: Day[];
}
```

**Step 2: Write a type validation test**

Create `src/__tests__/types.test.ts`:
```typescript
import { Activity, Day, Trip } from '../types';

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

  it('Trip contains days with activities', () => {
    const trip: Trip = {
      title: 'Tokyo Trip',
      days: [
        {
          date: '2024-12-10',
          label: 'Wed, Dec 10',
          theme: 'Pre-Arrival',
          activities: [],
        },
      ],
    };
    expect(trip.days).toHaveLength(1);
  });
});
```

**Step 3: Run the test**

```bash
npx jest src/__tests__/types.test.ts
```
Expected: PASS (TypeScript type tests compile and pass)

**Step 4: Commit**

```bash
git add src/types.ts src/__tests__/types.test.ts
git commit -m "feat: add Trip/Day/Activity TypeScript types"
```

---

### Task 3: Google Doc fetcher utility

**Files:**
- Create: `src/utils/googleDocs.ts`
- Create: `src/__tests__/googleDocs.test.ts`

**Step 1: Write failing tests**

Create `src/__tests__/googleDocs.test.ts`:
```typescript
import { extractDocId, buildExportUrl } from '../utils/googleDocs';

describe('extractDocId', () => {
  it('extracts ID from standard edit URL', () => {
    const url = 'https://docs.google.com/document/d/1iNzhQzlw_6T38uik1jyBTNXa0S7aiCcBehTabqqG1lw/edit?usp=sharing';
    expect(extractDocId(url)).toBe('1iNzhQzlw_6T38uik1jyBTNXa0S7aiCcBehTabqqG1lw');
  });

  it('returns null for invalid URL', () => {
    expect(extractDocId('https://google.com')).toBeNull();
  });
});

describe('buildExportUrl', () => {
  it('builds correct export URL', () => {
    const id = '1iNzhQzlw_6T38uik1jyBTNXa0S7aiCcBehTabqqG1lw';
    expect(buildExportUrl(id)).toBe(
      'https://docs.google.com/document/d/1iNzhQzlw_6T38uik1jyBTNXa0S7aiCcBehTabqqG1lw/export?format=txt'
    );
  });
});
```

**Step 2: Run to verify failure**

```bash
npx jest src/__tests__/googleDocs.test.ts
```
Expected: FAIL — "Cannot find module '../utils/googleDocs'"

**Step 3: Implement the utility**

Create `src/utils/googleDocs.ts`:
```typescript
export function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function buildExportUrl(docId: string): string {
  return `https://docs.google.com/document/d/${docId}/export?format=txt`;
}

export async function fetchDocText(docUrl: string): Promise<string> {
  const docId = extractDocId(docUrl);
  if (!docId) throw new Error('Invalid Google Doc URL. Make sure you copied the full link.');

  const exportUrl = buildExportUrl(docId);
  const response = await fetch(exportUrl, { redirect: 'follow' });

  if (!response.ok) {
    throw new Error('Could not fetch the Google Doc. Make sure sharing is set to "Anyone with the link".');
  }

  return response.text();
}
```

**Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/googleDocs.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/googleDocs.ts src/__tests__/googleDocs.test.ts
git commit -m "feat: add Google Doc fetcher utility"
```

---

### Task 4: Claude AI parser

**Files:**
- Create: `src/utils/parser.ts`
- Create: `src/__tests__/parser.test.ts`

**Step 1: Write failing tests**

Create `src/__tests__/parser.test.ts`:
```typescript
import { parseItineraryText } from '../utils/parser';

// Mock the Anthropic SDK so tests don't make real API calls
jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              title: 'Tokyo Trip',
              days: [
                {
                  date: '2024-12-10',
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
  it('returns a Trip object with days and activities', async () => {
    const trip = await parseItineraryText('some itinerary text');
    expect(trip.title).toBe('Tokyo Trip');
    expect(trip.days).toHaveLength(1);
    expect(trip.days[0].activities).toHaveLength(1);
    expect(trip.days[0].activities[0].time).toBe('19:25');
  });
});
```

**Step 2: Run to verify failure**

```bash
npx jest src/__tests__/parser.test.ts
```
Expected: FAIL — "Cannot find module '../utils/parser'"

**Step 3: Implement the parser**

Create `src/utils/parser.ts`:
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
- If a date cannot be determined, make a reasonable guess from context
- Return ONLY the JSON object, no other text`;

export async function parseItineraryText(text: string): Promise<Trip> {
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
    return JSON.parse(content.text) as Trip;
  } catch {
    throw new Error('AI returned invalid data. Please try again.');
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/parser.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/parser.ts src/__tests__/parser.test.ts
git commit -m "feat: add Claude AI itinerary parser"
```

---

### Task 5: Storage layer

**Files:**
- Create: `src/utils/storage.ts`
- Create: `src/__tests__/storage.test.ts`

**Step 1: Write failing tests**

Create `src/__tests__/storage.test.ts`:
```typescript
import { saveTrip, loadTrip, clearTrip } from '../utils/storage';
import { Trip } from '../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockTrip: Trip = {
  title: 'Test Trip',
  days: [],
};

describe('storage', () => {
  it('saves and loads a trip', async () => {
    await saveTrip(mockTrip);
    const loaded = await loadTrip();
    expect(loaded?.title).toBe('Test Trip');
  });

  it('returns null when no trip is saved', async () => {
    await clearTrip();
    const loaded = await loadTrip();
    expect(loaded).toBeNull();
  });
});
```

**Step 2: Run to verify failure**

```bash
npx jest src/__tests__/storage.test.ts
```
Expected: FAIL

**Step 3: Implement storage**

Create `src/utils/storage.ts`:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip } from '../types';

const TRIP_KEY = 'saved_trip';

export async function saveTrip(trip: Trip): Promise<void> {
  await AsyncStorage.setItem(TRIP_KEY, JSON.stringify(trip));
}

export async function loadTrip(): Promise<Trip | null> {
  const json = await AsyncStorage.getItem(TRIP_KEY);
  return json ? (JSON.parse(json) as Trip) : null;
}

export async function clearTrip(): Promise<void> {
  await AsyncStorage.removeItem(TRIP_KEY);
}
```

**Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/storage.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/storage.ts src/__tests__/storage.test.ts
git commit -m "feat: add AsyncStorage trip persistence"
```

---

### Task 6: Current activity detection logic

**Files:**
- Create: `src/utils/tracking.ts`
- Create: `src/__tests__/tracking.test.ts`

**Step 1: Write failing tests**

Create `src/__tests__/tracking.test.ts`:
```typescript
import { getCurrentActivityIndex } from '../utils/tracking';
import { Activity } from '../types';

const makeActivity = (id: string, time: string | null, completed = false): Activity => ({
  id, time, title: `Activity ${id}`, location: null, notes: null, completed,
});

describe('getCurrentActivityIndex', () => {
  it('returns index of first incomplete timed activity whose time has passed', () => {
    const now = new Date('2024-12-10T10:30:00');
    const activities = [
      makeActivity('1', '09:00'),  // past
      makeActivity('2', '10:00'),  // past — this is "current"
      makeActivity('3', '12:00'),  // future
    ];
    expect(getCurrentActivityIndex(activities, now)).toBe(1);
  });

  it('returns first incomplete untimed activity when nothing matches by time', () => {
    const now = new Date('2024-12-10T10:30:00');
    const activities = [
      makeActivity('1', null, true),   // completed
      makeActivity('2', null, false),  // first incomplete — returned
      makeActivity('3', null, false),
    ];
    expect(getCurrentActivityIndex(activities, now)).toBe(1);
  });

  it('returns -1 when all activities are completed', () => {
    const now = new Date();
    const activities = [
      makeActivity('1', '09:00', true),
      makeActivity('2', '10:00', true),
    ];
    expect(getCurrentActivityIndex(activities, now)).toBe(-1);
  });
});
```

**Step 2: Run to verify failure**

```bash
npx jest src/__tests__/tracking.test.ts
```
Expected: FAIL

**Step 3: Implement tracking logic**

Create `src/utils/tracking.ts`:
```typescript
import { Activity } from '../types';

export function getCurrentActivityIndex(activities: Activity[], now: Date): number {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find the last timed, incomplete activity whose time has passed
  let lastPassedIndex = -1;
  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];
    if (activity.completed || !activity.time) continue;
    const [h, m] = activity.time.split(':').map(Number);
    const activityMinutes = h * 60 + m;
    if (activityMinutes <= currentMinutes) {
      lastPassedIndex = i;
    }
  }
  if (lastPassedIndex !== -1) return lastPassedIndex;

  // Fall back to first incomplete activity (timed or untimed)
  return activities.findIndex((a) => !a.completed);
}
```

**Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/tracking.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/tracking.ts src/__tests__/tracking.test.ts
git commit -m "feat: add current activity tracking logic"
```

---

### Task 7: ActivityCard component

**Files:**
- Create: `src/components/ActivityCard.tsx`
- Create: `src/__tests__/ActivityCard.test.tsx`

**Step 1: Write failing tests**

Create `src/__tests__/ActivityCard.test.tsx`:
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ActivityCard from '../components/ActivityCard';
import { Activity } from '../types';

const mockActivity: Activity = {
  id: '1',
  time: '10:00',
  title: 'Ueno Park',
  location: 'Ueno, Tokyo',
  notes: null,
  completed: false,
};

describe('ActivityCard', () => {
  it('renders activity title and time', () => {
    const { getByText } = render(
      <ActivityCard activity={mockActivity} isCurrent={false} onToggle={() => {}} />
    );
    expect(getByText('Ueno Park')).toBeTruthy();
    expect(getByText('10:00')).toBeTruthy();
  });

  it('calls onToggle when checkmark is pressed', () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <ActivityCard activity={mockActivity} isCurrent={false} onToggle={onToggle} />
    );
    fireEvent.press(getByTestId('toggle-button'));
    expect(onToggle).toHaveBeenCalledWith('1');
  });

  it('shows Directions button when location is present', () => {
    const { getByText } = render(
      <ActivityCard activity={mockActivity} isCurrent={false} onToggle={() => {}} />
    );
    expect(getByText('Directions')).toBeTruthy();
  });
});
```

**Step 2: Run to verify failure**

```bash
npx jest src/__tests__/ActivityCard.test.tsx
```
Expected: FAIL

**Step 3: Implement the component**

Create `src/components/ActivityCard.tsx`:
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Activity } from '../types';

interface Props {
  activity: Activity;
  isCurrent: boolean;
  onToggle: (id: string) => void;
}

export default function ActivityCard({ activity, isCurrent, onToggle }: Props) {
  const openDirections = () => {
    if (!activity.location) return;
    const query = encodeURIComponent(activity.location);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  return (
    <View style={[styles.card, isCurrent && styles.currentCard, activity.completed && styles.completedCard]}>
      <View style={styles.row}>
        <TouchableOpacity testID="toggle-button" onPress={() => onToggle(activity.id)} style={styles.checkbox}>
          <Text style={styles.checkboxText}>{activity.completed ? '✓' : '○'}</Text>
        </TouchableOpacity>
        <View style={styles.content}>
          {activity.time && <Text style={styles.time}>{activity.time}</Text>}
          <Text style={[styles.title, activity.completed && styles.completedText]}>{activity.title}</Text>
          {activity.location && <Text style={styles.location}>{activity.location}</Text>}
          {activity.notes && <Text style={styles.notes}>{activity.notes}</Text>}
        </View>
      </View>
      {activity.location && (
        <TouchableOpacity onPress={openDirections} style={styles.directionsButton}>
          <Text style={styles.directionsText}>Directions</Text>
        </TouchableOpacity>
      )}
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
    borderLeftColor: '#007AFF',
  },
  completedCard: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    paddingTop: 2,
  },
  checkboxText: {
    fontSize: 20,
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
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
  location: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  notes: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  directionsButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  directionsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
```

**Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/ActivityCard.test.tsx
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ActivityCard.tsx src/__tests__/ActivityCard.test.tsx
git commit -m "feat: add ActivityCard component with directions and toggle"
```

---

### Task 8: DayScreen component

**Files:**
- Create: `src/screens/DayScreen.tsx`
- Create: `src/__tests__/DayScreen.test.tsx`

**Step 1: Write failing tests**

Create `src/__tests__/DayScreen.test.tsx`:
```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import DayScreen from '../screens/DayScreen';
import { Day } from '../types';

const mockDay: Day = {
  date: '2024-12-11',
  label: 'Thu, Dec 11',
  theme: 'Tokyo',
  activities: [
    { id: '1', time: '09:00', title: 'Breakfast', location: 'Ginza', notes: null, completed: false },
    { id: '2', time: '11:00', title: 'Explore Harajuku', location: 'Harajuku', notes: null, completed: true },
  ],
};

describe('DayScreen', () => {
  it('renders all activities', () => {
    const { getByText } = render(
      <DayScreen day={mockDay} onToggle={() => {}} />
    );
    expect(getByText('Breakfast')).toBeTruthy();
    expect(getByText('Explore Harajuku')).toBeTruthy();
  });

  it('renders day theme as header', () => {
    const { getByText } = render(
      <DayScreen day={mockDay} onToggle={() => {}} />
    );
    expect(getByText('Tokyo')).toBeTruthy();
  });
});
```

**Step 2: Run to verify failure**

```bash
npx jest src/__tests__/DayScreen.test.tsx
```
Expected: FAIL

**Step 3: Implement DayScreen**

Create `src/screens/DayScreen.tsx`:
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Day } from '../types';
import ActivityCard from '../components/ActivityCard';
import { getCurrentActivityIndex } from '../utils/tracking';

interface Props {
  day: Day;
  onToggle: (activityId: string) => void;
}

export default function DayScreen({ day, onToggle }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const currentIndex = getCurrentActivityIndex(day.activities, now);

  return (
    <View style={styles.container}>
      <Text style={styles.theme}>{day.theme}</Text>
      <FlatList
        data={day.activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ActivityCard
            activity={item}
            isCurrent={index === currentIndex}
            onToggle={onToggle}
          />
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  theme: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  list: { paddingBottom: 32 },
});
```

**Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/DayScreen.test.tsx
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/screens/DayScreen.tsx src/__tests__/DayScreen.test.tsx
git commit -m "feat: add DayScreen with live activity tracking"
```

---

### Task 9: ImportScreen component

**Files:**
- Create: `src/screens/ImportScreen.tsx`

No unit test for this one — it's primarily UI wiring. We'll verify it manually.

**Step 1: Implement ImportScreen**

Create `src/screens/ImportScreen.tsx`:
```typescript
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { fetchDocText } from '../utils/googleDocs';
import { parseItineraryText } from '../utils/parser';
import { saveTrip } from '../utils/storage';
import { Trip } from '../types';

interface Props {
  onImport: (trip: Trip) => void;
}

export default function ImportScreen({ onImport }: Props) {
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
      const trip = await parseItineraryText(text);
      await saveTrip(trip);
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
    padding: 16, alignItems: 'center', marginBottom: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, color: '#999', textAlign: 'center' },
});
```

**Step 2: Commit**

```bash
git add src/screens/ImportScreen.tsx
git commit -m "feat: add ImportScreen"
```

---

### Task 10: Main App with tab navigation

**Files:**
- Modify: `App.tsx`

**Step 1: Replace App.tsx with the full app**

Open `App.tsx` and replace its entire contents with:

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Trip } from './src/types';
import { loadTrip, saveTrip } from './src/utils/storage';
import ImportScreen from './src/screens/ImportScreen';
import DayScreen from './src/screens/DayScreen';

const Tab = createMaterialTopTabNavigator();

function getTodayTabIndex(trip: Trip): number {
  const today = new Date().toISOString().split('T')[0];
  const idx = trip.days.findIndex((d) => d.date === today);
  return idx >= 0 ? idx : 0;
}

export default function App() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadTrip().then((saved) => {
      if (saved) setTrip(saved);
      setLoaded(true);
    });
  }, []);

  const handleImport = (newTrip: Trip) => setTrip(newTrip);

  const handleToggle = useCallback(
    (activityId: string) => {
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
      saveTrip(updated);
    },
    [trip]
  );

  if (!loaded) return null;

  if (!trip) {
    return (
      <SafeAreaView style={styles.container}>
        <ImportScreen onImport={handleImport} />
      </SafeAreaView>
    );
  }

  const initialTab = getTodayTabIndex(trip);

  return (
    <SafeAreaView style={styles.container}>
      <NavigationContainer>
        <Tab.Navigator initialRouteName={trip.days[initialTab]?.label ?? trip.days[0]?.label}>
          {trip.days.map((day) => (
            <Tab.Screen
              key={day.date}
              name={day.label}
              children={() => <DayScreen day={day} onToggle={handleToggle} />}
            />
          ))}
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
});
```

**Step 2: Start the app and test on your iPhone**

```bash
npx expo start
```

Scan the QR code with your iPhone. Try importing your Google Doc link. You should see the tabbed itinerary appear.

**Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: wire up full app with tab navigation and import flow"
```

---

### Task 11: Final smoke test & cleanup

**Step 1: Run all tests**

```bash
npx jest
```
Expected: All tests PASS

**Step 2: Test the full flow on your iPhone**
1. Open the app via Expo Go
2. Paste your Google Doc link
3. Tap "Import Itinerary"
4. Verify tabs appear for each day
5. Tap "Directions" on an activity — Google Maps should open
6. Tap the checkmark — activity should dim
7. Force-quit and reopen the app — itinerary should still be there (loaded from storage)

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: final cleanup and smoke test"
```

---

## Running the app going forward

```bash
cd /Users/kevinyu/Development/live-itinerary-app
npx expo start
```

Scan the QR code with your iPhone's camera or Expo Go app. The app will hot-reload whenever you make changes.
