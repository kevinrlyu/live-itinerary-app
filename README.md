# Live Itinerary App

A mobile app that turns Google Docs travel itineraries into a live, interactive day-by-day guide with activity tracking, expense logging, culinary checklists, and Google Maps directions.

**How it works:**

1. Paste a Google Doc link containing your travel itinerary
2. Claude AI parses the document into structured activities, transport steps, meals, and hotels
3. Browse your trip day-by-day with swipeable tabs, check off activities as you go, log expenses, and tap for Google Maps directions

---

## Source Code Overview

```
App.tsx                — Root component. Tab navigation, trip switching, re-import, expense/culinary state.

src/
├── types.ts           — TypeScript interfaces for Activity, Day, Trip, TripMeta, CulinaryRegion.
├── screens/
│   ├── ImportScreen.tsx        — Google Doc URL input and import flow.
│   ├── DayScreen.tsx           — Single-day view with grouped/collapsible activities.
│   ├── ExpenseSummaryScreen.tsx — Trip expense breakdown by day and category, CSV export.
│   └── CulinaryScreen.tsx      — Culinary specialties checklist grouped by region.
├── components/
│   ├── ActivityCard.tsx    — Individual activity card (regular, transport, hotel, meal).
│   ├── ExpenseInput.tsx    — Expense entry overlay with custom number pad and currency picker.
│   ├── TripHeader.tsx      — Top bar with trip title and menu button.
│   └── TripDrawer.tsx      — Slide-in drawer for switching/managing itineraries.
└── utils/
    ├── googleDocs.ts       — Fetches Google Doc text and title.
    ├── parser.ts           — Claude AI parsing with keyword post-processing.
    ├── storage.ts          — AsyncStorage persistence and migration.
    └── tracking.ts         — Determines the current activity based on time of day.
```

### `App.tsx`

The root component. Manages trip state, tab navigation (one tab per day), and the trip drawer. Handles activity toggle (completion), trip switching, re-importing from Google Docs, deletion, expense entry, and culinary checklist toggling. Preserves expenses and culinary checked states during re-import. Uses `@react-navigation/material-top-tabs` with scrollable tabs for trips with many days.

### `ImportScreen.tsx`

Accepts a Google Doc URL, fetches the document text and title in parallel, sends it to Claude for parsing, and saves the resulting trip to AsyncStorage.

### `DayScreen.tsx`

Renders a single day's activities. Builds a parent-child hierarchy from `parentId` references, rendering grouped activities with a collapsible chevron badge and a vertical connector line. Updates every 60 seconds to highlight the current activity.

### `ActivityCard.tsx`

Renders individual activities with category-specific styling:

- **Regular activities** — White card with blue accent, bill/expense icon and Google Maps pin button
- **Transport** — Faint tappable text row (no card, no checkbox), entire row opens Google Maps
- **Hotels** — Pink accent color on checkbox and buttons
- **Meals** — Red accent color on checkbox and buttons

Displays time in 12-hour format, italic descriptions, hours of operation, and notes. The expense button shows a bill icon (no expense logged) or the amount (expense logged). The directions button uses a Google Maps-style teardrop pin icon. Provides haptic feedback on checkbox tap.

### `ExpenseInput.tsx`

A non-modal overlay for entering per-activity expenses. Uses a custom number pad (0-9, decimal, backspace) built from Pressable buttons instead of a system keyboard to avoid iOS double-tap issues. Includes a currency dropdown picker and Save/Cancel/Delete actions.

### `ExpenseSummaryScreen.tsx`

Full-screen view showing all logged expenses with grand totals, category breakdown (Hotels/Meals/Other), and day-by-day line items. Supports CSV export via the system share sheet.

### `CulinaryScreen.tsx`

Full-screen checklist of culinary specialties extracted from the itinerary preamble, grouped by region. Tapping a dish toggles its checked state, which persists across sessions.

### `parser.ts`

Splits the Google Doc text into per-day chunks and sends each to Claude Haiku in parallel (3 concurrent, with retry logic). Extracts culinary specialties from the document preamble. For documents that can't be split by day, falls back to a single-call parse with Claude Sonnet for larger documents. Post-processes the AI output to infer activity types (transport) and categories (hotel, meal) from title keywords, and fixes child activity locations that incorrectly match their parent's location. Caches parsed day results by content hash to speed up re-imports.

### `storage.ts`

Persists trips and metadata to AsyncStorage. Supports multiple saved itineraries with an active trip selection. Includes migration logic from an older single-trip storage format.

### `tracking.ts`

Determines which activity to highlight as "current" based on the time of day. Finds the last timed, incomplete, non-transport activity whose start time has passed. Falls back to the first incomplete activity.

---

## Environment Variables

Create a `.env` file (or set in your Expo environment) with:

| Variable                       | Description                              |
| ------------------------------ | ---------------------------------------- |
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | Anthropic API key for Claude AI parsing |

---

## Running Locally

```bash
# Install dependencies
npm install

# Start the Expo dev server
npx expo start
```

Then scan the QR code with Expo Go on your phone, or press `i` for iOS simulator / `a` for Android emulator.

---

## Running Tests

```bash
npx jest
```
