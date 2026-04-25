# Settings Page Design Spec

## Overview

Add a Settings page to Trotter, accessible from the trip drawer. Users can configure display mode (light/dark/system), accent color, time format (12h/24h), and default maps provider (Google Maps, Apple Maps, Amap).

## Settings Model

```ts
interface AppSettings {
  displayMode: 'light' | 'dark' | 'system';
  accentColor: string;       // hex value from preset palette
  timeFormat: '12h' | '24h';
  mapsProvider: 'google' | 'apple' | 'amap';
}

const DEFAULT_SETTINGS: AppSettings = {
  displayMode: 'system',
  accentColor: '#007AFF',
  timeFormat: '12h',
  mapsProvider: 'google',
};
```

## Accent Color Palette

Preset options (user taps a color circle to select):

| Name   | Hex       |
|--------|-----------|
| Blue   | `#007AFF` |
| Red    | `#FF3B30` |
| Green  | `#34C759` |
| Purple | `#AF52DE` |
| Orange | `#FF9500` |
| Teal   | `#5AC8FA` |
| Pink   | `#FF2D55` |

## Architecture

### SettingsContext (`src/contexts/SettingsContext.tsx`)

- React Context with a provider component that wraps the app root
- Loads settings from AsyncStorage on mount (key: `app_settings`)
- Exposes `settings` object and `updateSettings(partial)` function via `useSettings()` hook
- Derives `resolvedTheme: 'light' | 'dark'` from `displayMode` + device appearance (via `useColorScheme()`)
- Exposes a `colors` object with all resolved theme colors (backgrounds, text, borders, etc.) so components don't need to compute colors themselves

### Color Theme (`src/contexts/SettingsContext.tsx`)

Two color maps, one for light and one for dark:

```ts
// Illustrative — actual keys match what components need
const lightColors = {
  background: '#f5f5f5',
  cardBackground: '#fff',
  textPrimary: '#1a1a1a',
  textSecondary: '#888',
  textTertiary: '#bbb',
  border: '#ddd',
  borderLight: '#f0f0f0',
  borderMedium: '#eee',
  // accent is injected from settings.accentColor
  accent: '<from settings>',
  accentText: '#fff',         // text on accent-colored backgrounds
  overlay: 'rgba(0,0,0,0.4)',
  modalBackground: '#f9f9f9',
  pillBackground: '#f0f0f0',
  destructive: '#FF3B30',
  success: '#34C759',
  transportText: '#888',
  checkboxUnchecked: '#888',  // or uses accent
};

const darkColors = {
  background: '#000',
  cardBackground: '#1c1c1e',
  textPrimary: '#f5f5f5',
  textSecondary: '#8e8e93',
  textTertiary: '#636366',
  border: '#38383a',
  borderLight: '#2c2c2e',
  borderMedium: '#38383a',
  accent: '<from settings>',
  accentText: '#fff',
  overlay: 'rgba(0,0,0,0.6)',
  modalBackground: '#2c2c2e',
  pillBackground: '#2c2c2e',
  destructive: '#FF453A',
  success: '#30D158',
  transportText: '#8e8e93',
  checkboxUnchecked: '#8e8e93',
};
```

Components replace all hardcoded color values with `colors.xxx` from the context.

### Maps URL Builder

A utility function in ActivityCard (or extracted if needed):

```ts
function buildMapsUrl(query: string, provider: MapsProvider): string {
  switch (provider) {
    case 'apple':
      return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
    case 'amap':
      return `https://uri.amap.com/search?keyword=${encodeURIComponent(query)}`;
    case 'google':
    default:
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
}
```

### Time Format

The existing `to12h()` function in ActivityCard becomes format-aware:

- When `timeFormat === '12h'`: current behavior (e.g., `2:30pm`)
- When `timeFormat === '24h'`: display as-is from data (e.g., `14:30`)

Same for `convertTimesIn()` — when 24h, it becomes a no-op.

The `to12hDisplay` function in ActivityEditSheet also respects this setting.

## New Files

1. **`src/contexts/SettingsContext.tsx`** — context, provider, hook, color themes, defaults
2. **`src/screens/SettingsScreen.tsx`** — settings UI, presented as a Modal

## Modified Files

### App.tsx
- Wrap app in `<SettingsProvider>`
- Add `showSettings` state, `handleShowSettings` callback
- Pass `onShowSettings` to TripDrawer
- Render SettingsScreen in a Modal

### Storage (`src/utils/storage.ts`)
- Add `loadSettings()` and `saveSettings()` functions (key: `app_settings`)

### TripDrawer (`src/components/TripDrawer.tsx`)
- Add `onShowSettings` prop
- Add Settings button between "+ Create New Itinerary" and "Help" (same style as Help)
- Apply dark mode colors

### ActivityCard (`src/components/ActivityCard.tsx`)
- Use `useSettings()` for `timeFormat` and `mapsProvider`
- Use `colors` from context for all hardcoded colors
- Replace `openDirections` to use `buildMapsUrl`

### ActivityEditSheet (`src/components/ActivityEditSheet.tsx`)
- Use `timeFormat` setting for time display
- Apply dark mode colors

### Every other component/screen
- Replace hardcoded colors with `colors` from context:
  - DayScreen
  - CulinaryScreen
  - ExpenseSummaryScreen
  - ImportScreen
  - CreateTripScreen
  - TripHeader
  - DayTabBar
  - ExpenseInput
  - NewDayDialog
  - DateRangePicker
  - InsertActivityButton
  - Walkthrough + Demo panels

### Accent color references to replace
Every instance of `#007AFF` becomes `colors.accent`. Key locations:
- ActivityCard (checkbox, buttons, current card border)
- ActivityEditSheet (pills, save button)
- DayTabBar (active tab, progress bar)
- TripDrawer (menu bars, active row, buttons)
- TripHeader
- DayScreen (edit bar, buttons)
- CulinaryScreen (tabs, buttons, checkmarks)
- ExpenseInput (keys, currency button, save)
- ExpenseSummaryScreen
- CreateTripScreen (buttons, calendar)
- DateRangePicker (selection, arrows)
- NewDayDialog (buttons)
- InsertActivityButton
- Walkthrough (dots, buttons)
- ImportScreen (buttons, links)

## Settings Screen Layout

Presented as a full-screen Modal (like Import/CreateTrip). Structure:

```
[Header: "Settings" with X close button]

Display Mode
  [Light]  [Dark]  [System]     ← segmented control, 3 options

Theme Color
  [o] [o] [o] [o] [o] [o] [o]  ← row of colored circles, checkmark on selected

Time Format
  [12-hour]  [24-hour]          ← segmented control, 2 options

Maps Provider
  [Google Maps]  [Apple Maps]  [Amap]  ← segmented control, 3 options
```

Font sizes follow app standards: 16 for section labels, 14 for control text. Spacing consistent with CreateTripScreen patterns.

## Walkthrough / Demo Panels

The four demo panels use scaled-down illustrations with their own hardcoded colors. These will NOT consume the settings context (they are fixed illustrations). However, they should reflect the current accent color where they currently use `#007AFF`, by reading `colors.accent` from context.

## Edge Cases

- **System mode**: Uses `useColorScheme()` from React Native. If the device returns `null`, default to light.
- **Accent color in dark mode**: Same hex value is used in both modes. The preset palette was chosen to work well on both light and dark backgrounds.
- **Amap availability**: Amap URLs open in the device browser. If Amap app is installed, it may deep-link automatically. No special handling needed — this matches Google Maps behavior.
- **Settings persistence**: Saved on every change (no save button). Same pattern as other AsyncStorage usage in the app.
