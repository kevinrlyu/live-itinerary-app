# Live Itinerary App

A mobile app that turns Google Docs travel itineraries into a live, interactive day-by-day guide with activity tracking, expense logging, checklists, maps directions, weather forecasts, and step counting.

**How it works:**

1. Paste a Google Doc link or create an itinerary from scratch
2. Claude AI parses the document into structured activities, transport steps, meals, and hotels
3. Browse your trip day-by-day with swipeable tabs, check off activities as you go, log expenses, and tap for maps directions

**Sharing:** Export any trip as a `.trotter` file and share it with other users via the iOS share sheet. Recipients can import by tapping the file or using the in-app file picker.

---

## Source Code Overview

```
App.tsx                — Root component. Tab navigation, trip state, drawer, .trotter import/export.

src/
├── types.ts           — TypeScript interfaces for Activity, Day, Trip, TripMeta, ChecklistGroup.
├── contexts/
│   └── SettingsContext.tsx     — Theme (light/dark/system), accent colors, time format, maps provider.
├── screens/
│   ├── ImportScreen.tsx        — Google Doc URL input, import flow, and file import fallback.
│   ├── CreateTripScreen.tsx    — Manual trip creation with date range picker.
│   ├── DayScreen.tsx           — Single-day view with grouped/collapsible activities.
│   ├── ExpenseSummaryScreen.tsx — Trip expense breakdown by day and category, CSV export.
│   ├── ChecklistScreen.tsx     — Generic checklists (food, packing, shopping, etc.) grouped by section.
│   └── SettingsScreen.tsx      — Display mode, theme color, time format, maps provider, temperature unit.
├── components/
│   ├── ActivityCard.tsx        — Individual activity card (regular, transport, hotel, meal).
│   ├── ActivityEditSheet.tsx   — Bottom sheet for creating/editing activities.
│   ├── ExpenseInput.tsx        — Expense entry overlay with custom number pad and currency picker.
│   ├── TripHeader.tsx          — Top bar with trip title and menu button.
│   ├── TripDrawer.tsx          — Slide-in drawer for switching/managing/sharing itineraries.
│   ├── DayTabBar.tsx           — Scrollable day tabs with add/remove day gestures.
│   ├── InsertActivityButton.tsx — "+" button between cards in edit mode.
│   ├── NewDayDialog.tsx        — Alert-style dialog for adding a new day with title.
│   ├── DateRangePicker.tsx     — Calendar picker for trip date selection.
│   ├── Walkthrough.tsx         — Interactive help panels with animated demos.
│   └── icons/                  — Custom SVG icon components (WalkIcon, ReceiptIcon).
└── utils/
    ├── googleDocs.ts       — Fetches Google Doc text and title.
    ├── parser.ts           — Claude AI parsing with keyword post-processing.
    ├── storage.ts          — AsyncStorage persistence and migration.
    ├── tracking.ts         — Determines the current activity based on time of day.
    ├── tripBuilder.ts      — Helpers for building trips from manual input.
    ├── trotterFile.ts      — .trotter file export/import (share sheet and file picker).
    ├── geocode.ts          — Location geocoding for maps deep links.
    └── weather.ts          — Weather forecast fetching for trip days.
```

### `App.tsx`

The root component. Manages trip state, bottom tab navigation (Itinerary, Checklists, Expenses), and the trip drawer. Handles activity toggle, trip switching, re-importing, deletion, expense entry, checklist toggling, .trotter file sharing/import, and deep link handling. Preserves expenses and checklist states during re-import. Uses `@react-navigation/bottom-tabs` for the main tabs and `@react-navigation/material-top-tabs` with scrollable tabs for day-by-day navigation.

### `SettingsContext.tsx`

Provides app-wide settings: display mode (light/dark/system), theme accent color, time format (12h/24h), maps provider (Google Maps/Apple Maps/Amap), and temperature unit (F/C). Computes a full color palette based on the selected theme.

### `ImportScreen.tsx`

Accepts a Google Doc URL, fetches the document text and title in parallel, sends it to Claude for parsing, and saves the resulting trip. Also supports importing from `.trotter` files via an "Import from File" button.

### `CreateTripScreen.tsx`

Manual trip creation with a title field and date range picker. Generates empty days for each date in the selected range.

### `DayScreen.tsx`

Renders a single day's activities. Builds a parent-child hierarchy from `parentId` references, rendering grouped activities with a collapsible chevron badge and a vertical connector line. Supports pull-to-edit mode for adding/removing days and inserting/editing activities. Displays live step count and weather forecast. Updates every 60 seconds to highlight the current activity.

### `ActivityCard.tsx`

Renders individual activities with category-specific styling:

- **Regular activities** — Card with accent-colored checkbox, expense button, and maps pin button
- **Transport** — Faint tappable text row (no card, no checkbox), entire row opens maps
- **Hotels** — Pink accent color on checkbox and buttons
- **Meals** — Red accent color on checkbox and buttons

Displays time (12h or 24h per settings), italic descriptions, hours of operation, and notes. The expense button shows a bill icon (no expense logged) or the amount (expense logged). The directions button opens the user's configured maps provider (Google Maps, Apple Maps, or Amap) with geocoded coordinates.

### `ActivityEditSheet.tsx`

Bottom sheet for creating or editing activities. Includes type (Place/Transit), category (Default/Stay/Food), parent activity selector, time pickers, and text fields for title, description, hours, notes, and location.

### `ExpenseInput.tsx`

A non-modal overlay for entering per-activity expenses. Uses a custom number pad (0-9, decimal, backspace) built from Pressable buttons. Includes a currency picker and Save/Cancel/Delete actions.

### `ExpenseSummaryScreen.tsx`

Full-screen view showing all logged expenses with grand totals, category breakdown (Hotels/Meals/Other), and day-by-day line items. Supports CSV export via the system share sheet.

### `ChecklistScreen.tsx`

Full-screen checklist view for items extracted from the itinerary preamble, grouped by section. Supports any type of checklist (food, packing, shopping, to-do, etc.). Sections and items can be added, edited, and deleted. Checked state persists across sessions.

### `SettingsScreen.tsx`

Settings page with display mode toggle (Light/Dark/System), theme accent color picker, time format (12h/24h), default maps provider (Google Maps/Apple Maps/Amap), and temperature unit (F/C).

### `TripDrawer.tsx`

Slide-in drawer for managing itineraries. Shows all saved trips with share (↗), re-import (↻), and delete (✕) buttons. Supports drag-to-reorder. Includes buttons for importing from Google Docs, creating a new trip, and accessing Settings and Help.

### `parser.ts`

Splits the Google Doc text into per-day chunks and sends each to Claude Haiku in parallel (3 concurrent, with retry logic). Extracts checklists from the document preamble using AI with light title cleanup. For documents that can't be split by day, falls back to a single-call parse with Claude Sonnet for larger documents. Post-processes the AI output to infer activity types (transport) and categories (hotel, meal) from title keywords, and fixes child activity locations that incorrectly match their parent's location. Caches parsed day results by content hash to speed up re-imports.

### `storage.ts`

Persists trips, settings, and metadata to AsyncStorage. Supports multiple saved itineraries with an active trip selection. Includes migration logic from older storage formats (single-trip, culinarySpecialties → checklists, region → title).

### `trotterFile.ts`

Exports trips as `.trotter` files (JSON with personal data stripped: no expenses, trip ID, or doc URL; completed/checked states reset) via the iOS share sheet. Imports `.trotter` files from both the document picker and deep link URIs.

### `tracking.ts`

Determines which activity to highlight as "current" based on the time of day. Finds the last timed, incomplete, non-transport activity whose start time has passed. Falls back to the first incomplete activity.

### `geocode.ts`

Geocodes location strings to coordinates for maps deep links. Supports constructing deep links for Google Maps, Apple Maps, and Amap.

### `weather.ts`

Fetches weather forecast data for trip days using the Open-Meteo API.

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
