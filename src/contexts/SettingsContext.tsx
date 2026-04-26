import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { loadSettings, saveSettings } from '../utils/storage';

// --- Types ---

export type DisplayMode = 'light' | 'dark' | 'system';
export type TimeFormat = '12h' | '24h';
export type MapsProvider = 'google' | 'apple' | 'amap';
export type TempUnit = 'C' | 'F';

export interface AppSettings {
  displayMode: DisplayMode;
  accentColor: string;
  stayAccentColor: string;
  foodAccentColor: string;
  timeFormat: TimeFormat;
  mapsProvider: MapsProvider;
  tempUnit: TempUnit;
}

export const DEFAULT_SETTINGS: AppSettings = {
  displayMode: 'system',
  accentColor: '#007AFF',
  stayAccentColor: '#E91E63',
  foodAccentColor: '#E53935',
  timeFormat: '12h',
  mapsProvider: 'google',
  tempUnit: 'C',
};

export const ACCENT_PALETTE = [
  { name: 'Blue', hex: '#007AFF' },
  { name: 'Green', hex: '#34C759' },
  { name: 'Yellow', hex: '#FFCC00' },
  { name: 'Orange', hex: '#FF9500' },
  { name: 'Red', hex: '#FF3B30' },
  { name: 'Purple', hex: '#AF52DE' },
  { name: 'Pink', hex: '#FC7368' },
];

// --- Color Themes ---

export interface ThemeColors {
  background: string;
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  borderMedium: string;
  accent: string;
  stayAccent: string;
  foodAccent: string;
  accentText: string;
  overlay: string;
  modalBackground: string;
  pillBackground: string;
  destructive: string;
  success: string;
  inputBackground: string;
  headerBackground: string;
  editBannerBackground: string;
  pickerBackground: string;
  padKeyPressed: string;
  shadow: string;
}

function buildColors(mode: 'light' | 'dark', settings: AppSettings): ThemeColors {
  if (mode === 'dark') {
    return {
      background: '#000',
      cardBackground: '#1c1c1e',
      textPrimary: '#f5f5f5',
      textSecondary: '#8e8e93',
      textTertiary: '#636366',
      border: '#38383a',
      borderLight: '#2c2c2e',
      borderMedium: '#38383a',
      accent: settings.accentColor,
      stayAccent: settings.stayAccentColor,
      foodAccent: settings.foodAccentColor,
      accentText: '#fff',
      overlay: 'rgba(0,0,0,0.6)',
      modalBackground: '#2c2c2e',
      pillBackground: '#2c2c2e',
      destructive: '#FF453A',
      success: '#30D158',
      inputBackground: '#2c2c2e',
      headerBackground: '#1c1c1e',
      editBannerBackground: '#1a2a3a',
      pickerBackground: '#2c2c2e',
      padKeyPressed: '#2c2c2e',
      shadow: '#000',
    };
  }
  return {
    background: '#f5f5f5',
    cardBackground: '#fff',
    textPrimary: '#1a1a1a',
    textSecondary: '#888',
    textTertiary: '#bbb',
    border: '#ddd',
    borderLight: '#f0f0f0',
    borderMedium: '#eee',
    accent: settings.accentColor,
    stayAccent: settings.stayAccentColor,
    foodAccent: settings.foodAccentColor,
    accentText: '#fff',
    overlay: 'rgba(0,0,0,0.4)',
    modalBackground: '#f9f9f9',
    pillBackground: '#f0f0f0',
    destructive: '#FF3B30',
    success: '#34C759',
    inputBackground: '#f5f5f5',
    headerBackground: '#fff',
    editBannerBackground: '#D6EAFF',
    pickerBackground: '#f0f0f0',
    padKeyPressed: '#f0f0f0',
    shadow: '#000',
  };
}

// --- Context ---

interface SettingsContextValue {
  settings: AppSettings;
  colors: ThemeColors;
  resolvedTheme: 'light' | 'dark';
  updateSettings: (partial: Partial<AppSettings>) => void;
  loaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  colors: buildColors('light', DEFAULT_SETTINGS),
  resolvedTheme: 'light',
  updateSettings: () => {},
  loaded: false,
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const deviceScheme = useColorScheme();

  useEffect(() => {
    loadSettings().then((saved) => {
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...saved });
      }
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const resolvedTheme: 'light' | 'dark' = useMemo(() => {
    if (settings.displayMode === 'system') {
      return deviceScheme === 'dark' ? 'dark' : 'light';
    }
    return settings.displayMode;
  }, [settings.displayMode, deviceScheme]);

  const colors = useMemo(() => buildColors(resolvedTheme, settings), [resolvedTheme, settings]);

  const value = useMemo(() => ({
    settings,
    colors,
    resolvedTheme,
    updateSettings,
    loaded,
  }), [settings, colors, resolvedTheme, updateSettings, loaded]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
