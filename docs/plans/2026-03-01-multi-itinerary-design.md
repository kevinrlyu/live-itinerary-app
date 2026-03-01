# Multi-Itinerary Support — Design Doc
_Date: 2026-03-01_

## Overview

Add support for multiple saved itineraries with a slide-in drawer to switch between them, import new ones, re-import the current one, and delete old ones.

---

## User Flow

1. Main screen gains a **≡ button** in the top-right corner above the day tabs
2. Tapping it slides open a drawer from the right
3. Drawer shows all saved trips (title + date range); active trip has a checkmark
4. Tap a trip → drawer closes, itinerary view switches to that trip
5. Tap **"+ Import New Itinerary"** → opens import screen as a modal
6. Tap **"↻ Re-import Current"** → re-fetches and re-parses the active trip's Google Doc URL, updates in place
7. Swipe left on a trip row → delete button appears

---

## Data Model Changes

Add `id` and `docUrl` to the Trip type:
```
Trip
 └── id: string          (NEW — uuid generated at import)
 └── docUrl: string      (NEW — original Google Doc link)
 └── title: string
 └── days: Day[]
```

New storage structure (replaces single `saved_trip` key):
```
AsyncStorage keys:
  "trip_list"       → TripMeta[]   (id, title, dateRange, docUrl)
  "trip_<id>"       → Trip         (full trip data)
  "active_trip_id"  → string
```

TripMeta shape:
```
TripMeta
 └── id: string
 └── title: string
 └── dateRange: string   (e.g. "Dec 10–13")
 └── docUrl: string
```

---

## New Components

### TripDrawer.tsx
- Slide-in panel from the right using React Native `Animated` + `Modal`
- Shows list of `TripMeta` items
- Active trip has a checkmark
- "↻ Re-import Current" button at top
- "+ Import New Itinerary" button at bottom
- Swipe-to-delete on each row

### TripHeader.tsx
- Thin bar above the tab navigator
- Shows current trip title on the left
- Shows ≡ button on the right to open drawer

---

## App.tsx Changes

- On startup: load `trip_list` + `active_trip_id`, then load full `trip_<id>` for active trip
- `onOpenDrawer` → sets drawer visible
- `onSwitchTrip(id)` → loads `trip_<id>` from storage, sets as active, closes drawer
- `onDeleteTrip(id)` → removes from `trip_list` + removes `trip_<id>` key; if deleted trip was active, switch to first remaining trip (or show import screen if none left)
- `onReimport()` → fetches + parses active trip's docUrl, saves updated Trip, refreshes view
- `onImportNew(trip)` → saves new trip, adds to trip_list, sets as active

---

## Storage Layer Changes

Replace `storage.ts` functions with:
- `loadTripList(): Promise<TripMeta[]>`
- `saveTripList(list: TripMeta[]): Promise<void>`
- `loadTrip(id: string): Promise<Trip | null>`
- `saveTrip(trip: Trip): Promise<void>`
- `deleteTrip(id: string): Promise<void>`
- `loadActiveTripId(): Promise<string | null>`
- `saveActiveTripId(id: string): Promise<void>`

---

## Out of Scope

- Editing trip names after import
- Reordering trips
- Syncing trips across devices
