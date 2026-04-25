import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useSettings,
  ACCENT_PALETTE,
  DisplayMode,
  TimeFormat,
  MapsProvider,
} from '../contexts/SettingsContext';

interface Props {
  onClose: () => void;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accentColor,
  bgColor,
  textColor,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  accentColor: string;
  bgColor: string;
  textColor: string;
}) {
  return (
    <View style={[segStyles.container, { backgroundColor: bgColor }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[segStyles.option, active && { backgroundColor: accentColor }]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[segStyles.optionText, { color: textColor }, active && segStyles.optionTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ColorRow({
  label,
  value,
  onChange,
  colors,
  showTopBorder,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  colors: ReturnType<typeof useSettings>['colors'];
  showTopBorder?: boolean;
}) {
  return (
    <View>
      {showTopBorder && <View style={[rowStyles.divider, { backgroundColor: colors.borderLight }]} />}
      <View style={rowStyles.container}>
      <Text style={[rowStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={rowStyles.circles}>
        {ACCENT_PALETTE.map((c) => {
          const selected = c.hex === value;
          return (
            <TouchableOpacity
              key={c.hex}
              onPress={() => onChange(c.hex)}
              style={[
                rowStyles.circle,
                { backgroundColor: c.hex },
                selected && rowStyles.circleSelected,
              ]}
              activeOpacity={0.7}
            >
              {selected && <Text style={rowStyles.check}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      </View>
      <View style={[rowStyles.divider, { backgroundColor: colors.borderLight }]} />
    </View>
  );
}

export default function SettingsScreen({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { settings, colors, updateSettings } = useSettings();

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderMedium }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Display Mode */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Display Mode</Text>
        <SegmentedControl<DisplayMode>
          options={[
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'System', value: 'system' },
          ]}
          value={settings.displayMode}
          onChange={(v) => updateSettings({ displayMode: v })}
          accentColor={colors.accent}
          bgColor={colors.pillBackground}
          textColor={colors.textTertiary}
        />

        {/* Theme Colors */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 28 }]}>Theme Color</Text>
        <View style={[styles.colorSection, { backgroundColor: colors.cardBackground }]}>
          <ColorRow
            label="Primary"
            value={settings.accentColor}
            onChange={(hex) => updateSettings({ accentColor: hex })}
            colors={colors}
            showTopBorder
          />
          <ColorRow
            label="Stays"
            value={settings.stayAccentColor}
            onChange={(hex) => updateSettings({ stayAccentColor: hex })}
            colors={colors}
          />
          <ColorRow
            label="Food"
            value={settings.foodAccentColor}
            onChange={(hex) => updateSettings({ foodAccentColor: hex })}
            colors={colors}
          />
        </View>

        {/* Time Format */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 28 }]}>Time Format</Text>
        <SegmentedControl<TimeFormat>
          options={[
            { label: '12-hour', value: '12h' },
            { label: '24-hour', value: '24h' },
          ]}
          value={settings.timeFormat}
          onChange={(v) => updateSettings({ timeFormat: v })}
          accentColor={colors.accent}
          bgColor={colors.pillBackground}
          textColor={colors.textTertiary}
        />

        {/* Maps Provider */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 28 }]}>Maps Provider</Text>
        <SegmentedControl<MapsProvider>
          options={[
            { label: 'Google Maps', value: 'google' },
            { label: 'Apple Maps', value: 'apple' },
            { label: 'Amap', value: 'amap' },
          ]}
          value={settings.mapsProvider}
          onChange={(v) => updateSettings({ mapsProvider: v })}
          accentColor={colors.accent}
          bgColor={colors.pillBackground}
          textColor={colors.textTertiary}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 13.5,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
    marginTop: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 16,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  colorSection: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});

const segStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  optionTextActive: {
    color: '#fff',
  },
});

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    width: 70,
  },
  circles: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 10,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSelected: {},
  check: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
