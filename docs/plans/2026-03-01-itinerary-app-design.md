# Travel Itinerary App — Design Doc
_Date: 2026-03-01_

## Overview

A mobile app for iPhone (built with Expo/React Native) that takes a Google Doc travel itinerary link, parses it using Claude AI, and displays a live day-by-day interface that tracks where you should be next and lets you open directions in Google Maps.

---

## User Flow

1. User opens the app and pastes a Google Doc shareable link
2. App extracts the doc ID, fetches plain text via Google's export URL (`/export?format=txt`)
3. Plain text is sent to Claude API, which returns structured JSON (days + activities)
4. Parsed itinerary is saved to device storage (AsyncStorage) for offline use
5. Main screen shows one tab per day; today's tab is auto-selected
6. Activities auto-advance based on the clock (for timed items) and can be manually checked off
7. Each activity has a "Directions" button that opens Google Maps with the location pre-filled

---

## Screens

### Screen 1: Import Screen
- Shown on first launch or when no itinerary is loaded
- Text input for Google Doc link
- "Import Itinerary" button
- Loading spinner during fetch + parse

### Screen 2: Itinerary Screen (main)
- Scrollable tab bar at top — one tab per day (e.g., "Wed Dec 10")
- Today's tab auto-selected on open
- Vertical list of activity cards per day
- Current/next activity highlighted (bold + colored indicator)
- Past activities dimmed
- Each activity card shows:
  - Time (if available)
  - Activity name
  - Location
  - "Done" checkmark (manual check-off)
  - "Directions" button (opens Google Maps)

No separate detail screen — all info shown inline.

---

## Data Model

```
Trip
 └── title: string
 └── days: Day[]

Day
 └── date: string (YYYY-MM-DD)
 └── label: string (e.g. "Wed, Dec 10")
 └── theme: string (e.g. "Tokyo" or "Pre-Arrival")
 └── activities: Activity[]

Activity
 └── id: string
 └── time: string | null (e.g. "14:30")
 └── title: string
 └── location: string | null
 └── notes: string | null
 └── completed: boolean
```

---

## Tech Stack

| Concern | Tool |
|---|---|
| App framework | Expo (React Native) |
| Language | TypeScript |
| AI parsing | Claude API (claude-haiku-4-5 for cost efficiency) |
| Local storage | AsyncStorage |
| Navigation | React Navigation (tab-based) |
| Maps | expo-linking → Google Maps deep link |

---

## External Dependencies

- **Anthropic API key** — for Claude AI parsing (pay-as-you-go, fractions of a cent per import)
- **Google Doc** — must be shared as "Anyone with the link can view"
- **Expo Go app** — for testing on iPhone during development
- **Apple Developer account** — only needed if distributing via TestFlight/App Store

---

## Out of Scope (for now)

- In-app directions (uses Google Maps instead)
- Push notifications / reminders
- Multiple saved itineraries
- Editing the itinerary inside the app
- Android support (works but not optimized)
