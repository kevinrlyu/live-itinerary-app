import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard,
  ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
  Modal, Pressable, Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { fetchDocText, fetchDocTitle } from '../utils/googleDocs';
import { parseItineraryText } from '../utils/parser';
import { saveTripFull, saveTripList, loadTripList, saveActiveTripId, loadProviderApiKey, saveProviderApiKey, saveLastLLMConfig, loadLastLLMConfig } from '../utils/storage';
import { Trip, TripMeta } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { getProviders, getProvider, ModelProvider } from '../utils/providers';
import { fetchModels, LLMConfig } from '../utils/llm';

interface Props {
  onImport: (trip: Trip) => void;
  onCancel?: () => void;
  onImportFromFile?: () => void;
}

function buildDateRange(trip: Trip): string {
  if (trip.days.length === 0) return '';
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;
  const fmt = (d: string) => {
    const dt = new Date(`${d}T12:00:00`);
    return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]} ${dt.getDate()}`;
  };
  return first === last ? fmt(first) : `${fmt(first)} – ${fmt(last)}`;
}

const PROVIDERS = getProviders();
const PICKER_ITEM_H = 40;
const PICKER_VISIBLE = 3;
const PICKER_H = PICKER_ITEM_H * PICKER_VISIBLE;
const MANUAL_MODEL_SENTINEL = '__manual__';

/* ── Roller Picker (shared by provider & model) ── */

function RollerPicker({
  items,
  value,
  onChange,
  anchorRef,
  open,
  onClose,
  width,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  anchorRef: React.RefObject<View | null>;
  open: boolean;
  onClose: () => void;
  width?: number;
}) {
  const { colors } = useSettings();
  const scrollRef = useRef<ScrollView>(null);
  const [scrollY, setScrollY] = useState(0);
  const lastTickIdx = useRef(-1);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (open && anchorRef.current) {
      anchorRef.current.measureInWindow((x, y, w, h) => {
        const fieldMidY = y + h / 2;
        // Align the highlighted item's text with the field's text
        // Center slot text is at: paddingVertical (1 row) + half item height from picker top
        const centerSlotOffset = PICKER_ITEM_H + PICKER_ITEM_H / 2;
        setPos({ top: fieldMidY - centerSlotOffset - 8, left: x });
      });
      const idx = items.findIndex((it) => it.id === value);
      lastTickIdx.current = idx;
      if (idx >= 0) {
        const yy = idx * PICKER_ITEM_H;
        setScrollY(yy);
        setTimeout(() => scrollRef.current?.scrollTo({ y: yy, animated: false }), 0);
      }
    }
  }, [open]);

  const centeredIdx = Math.round(scrollY / PICKER_ITEM_H);
  const getOpacity = (idx: number) => {
    const d = Math.abs(idx - centeredIdx);
    if (d === 0) return 1;
    if (d === 1) return 0.5;
    if (d === 2) return 0.25;
    return 0.12;
  };

  if (!open) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={() => {
        const clamped = Math.max(0, Math.min(centeredIdx, items.length - 1));
        onChange(items[clamped].id);
        onClose();
      }} />
      {pos && (
        <View style={[pickerStyles.container, { top: pos.top, left: pos.left, width: width || 200, height: PICKER_H, backgroundColor: colors.pickerBackground }]}>
          <ScrollView
            ref={scrollRef}
            style={pickerStyles.scroll}
            showsVerticalScrollIndicator={false}
            snapToInterval={PICKER_ITEM_H}
            decelerationRate="fast"
            onScroll={(e) => {
              const y = e.nativeEvent.contentOffset.y;
              setScrollY(y);
              const idx = Math.round(y / PICKER_ITEM_H);
              if (idx !== lastTickIdx.current && idx >= 0 && idx < items.length) {
                lastTickIdx.current = idx;
                Haptics.selectionAsync();
              }
            }}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingVertical: PICKER_ITEM_H }}
          >
            {items.map((item, i) => (
              <TouchableOpacity
                key={item.id}
                style={pickerStyles.item}
                activeOpacity={0.7}
                onPress={() => { onChange(item.id); onClose(); }}
              >
                <Text style={[
                  pickerStyles.itemText,
                  { color: colors.textPrimary },
                  i === centeredIdx && { color: colors.accent, fontWeight: '600' },
                  { opacity: getOpacity(i) },
                ]} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}

/* ── Import Screen ── */

export default function ImportScreen({ onImport, onCancel, onImportFromFile }: Props) {
  const { colors } = useSettings();
  const [url, setUrl] = useState('');
  const [providerId, setProviderId] = useState('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [manualModelMode, setManualModelMode] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const providerFieldRef = useRef<View>(null);
  const modelFieldRef = useRef<View>(null);

  const provider = getProvider(providerId);
  const initializedRef = useRef(false);

  // Restore last-used provider and model on mount
  useEffect(() => {
    loadLastLLMConfig().then((config) => {
      if (config) {
        // Handle old 'qwen' ID → new 'alibaba' ID
        const pid = config.providerId === 'qwen' ? 'alibaba' : config.providerId;
        setProviderId(pid);
        setModel(config.model);
      }
      initializedRef.current = true;
    });
  }, []);

  // Load stored API key when provider changes
  useEffect(() => {
    setApiKey('');
    setHasStoredKey(false);
    setAvailableModels([]);
    setModel('');
    setCustomModel('');
    setManualModelMode(false);
    // Also try old 'qwen' key for 'alibaba' provider
    const keysToTry = providerId === 'alibaba' ? [providerId, 'qwen'] : [providerId];
    (async () => {
      for (const kid of keysToTry) {
        const key = await loadProviderApiKey(kid);
        if (key) {
          setApiKey(key);
          setHasStoredKey(true);
          return;
        }
      }
    })();
  }, [providerId]);

  // Fetch available models when API key is set
  const doFetchModels = useCallback(async (pid: string, key: string) => {
    if (!key.trim()) return;
    setLoadingModels(true);
    try {
      const models = await fetchModels(pid, key.trim());
      setAvailableModels(models);
      if (models.length > 0 && !model) {
        setModel(models[0]);
      }
    } catch {
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [model]);

  // Debounced model fetch when API key changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!apiKey.trim()) {
      setAvailableModels([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      doFetchModels(providerId, apiKey);
    }, hasStoredKey ? 0 : 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [apiKey, providerId, hasStoredKey]);

  const selectedModel = customModel.trim() || model;

  const handleImport = async () => {
    if (!apiKey.trim()) {
      Alert.alert('API Key Required', `Please enter your ${provider?.name || 'AI'} API key.`);
      return;
    }
    if (!selectedModel) {
      Alert.alert('Model Required', 'Please select or enter a model name.');
      return;
    }
    if (!url.trim()) {
      Alert.alert('Paste your Google Doc link first.');
      return;
    }
    await saveProviderApiKey(providerId, apiKey.trim());
    await saveLastLLMConfig(providerId, selectedModel);
    const llmConfig: LLMConfig = {
      providerId,
      apiKey: apiKey.trim(),
      model: selectedModel,
    };
    setLoading(true);
    setProgress('Fetching document...');
    try {
      const [text, docTitle] = await Promise.all([
        fetchDocText(url.trim()),
        fetchDocTitle(url.trim()),
      ]);
      setProgress('Starting parse...');
      const trip = await parseItineraryText(text, url.trim(), docTitle ?? undefined, setProgress, undefined, llmConfig);
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

  // Build model picker items
  const modelPickerItems = [
    ...availableModels.map((m) => ({ id: m, label: m })),
    { id: MANUAL_MODEL_SENTINEL, label: 'Enter model ID manually' },
  ];

  const handleModelPick = (id: string) => {
    if (id === MANUAL_MODEL_SENTINEL) {
      setManualModelMode(true);
      setModel('');
      setCustomModel('');
      setModelPickerOpen(false);
    } else {
      setModel(id);
      setCustomModel('');
      setManualModelMode(false);
      setModelPickerOpen(false);
    }
  };

  const providerItems = PROVIDERS.map((p) => ({ id: p.id, label: p.name }));
  const providerLabel = provider?.name || 'Select provider';
  const modelLabel = manualModelMode ? 'Manual entry' : (model || 'Select model');
  const fieldWidth = Dimensions.get('window').width - 48;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: colors.textPrimary }]}>Let's Get Started</Text>

      {/* Provider picker */}
      <Text style={[styles.label, { color: colors.textPrimary }]}>AI Provider</Text>
      <View ref={providerFieldRef} collapsable={false}>
        <TouchableOpacity
          style={[styles.input, styles.pickerField, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
          onPress={() => { Keyboard.dismiss(); setProviderPickerOpen(true); }}
          disabled={loading}
        >
          <Text style={[styles.pickerFieldText, { color: colors.textPrimary }]}>{providerLabel}</Text>
          <Text style={[styles.pickerChevron, { color: colors.textTertiary }]}>▼</Text>
        </TouchableOpacity>
      </View>
      <RollerPicker
        items={providerItems}
        value={providerId}
        onChange={(id) => { setProviderId(id); setProviderPickerOpen(false); }}
        anchorRef={providerFieldRef}
        open={providerPickerOpen}
        onClose={() => setProviderPickerOpen(false)}
        width={fieldWidth}
      />

      {/* API key */}
      <Text style={[styles.label, { color: colors.textPrimary }]}>API Key</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder={provider?.apiKeyPlaceholder || 'API key'}
        placeholderTextColor={colors.textTertiary}
        value={apiKey}
        onChangeText={(text) => { setApiKey(text); if (hasStoredKey) setHasStoredKey(false); }}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={hasStoredKey}
        editable={!loading}
      />

      {/* Model picker */}
      <Text style={[styles.label, { color: colors.textPrimary }]}>Model</Text>
      {loadingModels && (
        <View style={styles.loadingModelsRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 0, marginLeft: 6 }]}>Loading models...</Text>
        </View>
      )}
      {manualModelMode ? (
        <>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Enter model ID (e.g. gpt-4o)"
            placeholderTextColor={colors.textTertiary}
            value={customModel}
            onChangeText={setCustomModel}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          {availableModels.length > 0 && (
            <TouchableOpacity onPress={() => { setManualModelMode(false); if (availableModels.length > 0 && !model) setModel(availableModels[0]); }}>
              <Text style={[styles.switchLink, { color: colors.accent }]}>Choose from available models</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <View ref={modelFieldRef} collapsable={false}>
            <TouchableOpacity
              style={[styles.input, styles.pickerField, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              onPress={() => { Keyboard.dismiss(); setModelPickerOpen(true); }}
              disabled={loading || (availableModels.length === 0 && !loadingModels)}
            >
              <Text
                style={[
                  styles.pickerFieldText,
                  { color: model ? colors.textPrimary : colors.textTertiary },
                ]}
                numberOfLines={1}
              >
                {model || (loadingModels ? 'Loading...' : (apiKey.trim() ? 'No models found' : 'Enter API key first'))}
              </Text>
              <Text style={[styles.pickerChevron, { color: colors.textTertiary }]}>▼</Text>
            </TouchableOpacity>
          </View>
          <RollerPicker
            items={modelPickerItems}
            value={model}
            onChange={handleModelPick}
            anchorRef={modelFieldRef}
            open={modelPickerOpen}
            onClose={() => setModelPickerOpen(false)}
            width={fieldWidth}
          />
        </>
      )}

      {/* Google Doc URL */}
      <Text style={[styles.label, { color: colors.textPrimary }]}>Google Doc URL</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>Change general access setting to "Anyone with the link"</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="https://docs.google.com/document/d/..."
        placeholderTextColor={colors.textTertiary}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleImport} disabled={loading}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#fff" />
            {progress ? <Text style={styles.progressText}>{progress}</Text> : null}
          </View>
        ) : (
          <Text style={styles.buttonText}>Import Itinerary</Text>
        )}
      </TouchableOpacity>
      {onImportFromFile && (
        <TouchableOpacity
          style={[styles.fileButton, { borderColor: colors.accent }]}
          onPress={onImportFromFile}
          disabled={loading}
        >
          <Text style={[styles.fileButtonText, { color: colors.accent }]}>Import .trotter File</Text>
        </TouchableOpacity>
      )}
      {onCancel && (
        <TouchableOpacity onPress={onCancel} disabled={loading}>
          <Text style={[styles.cancel, { color: colors.accent }]}>Cancel</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 32 },
  label: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    fontSize: 14, borderWidth: 1, borderColor: '#ddd', marginBottom: 16,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerFieldText: {
    fontSize: 14,
    flex: 1,
  },
  pickerChevron: {
    fontSize: 10,
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#007AFF', borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  progressText: { color: '#fff', fontSize: 14, marginLeft: 10 },
  cancel: { color: '#007AFF', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  hint: { fontSize: 12, color: '#888', marginBottom: 6 },
  fileButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  fileButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchLink: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 16,
  },
  loadingModelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});

const pickerStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    position: 'absolute',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  item: {
    height: PICKER_ITEM_H,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  itemText: {
    fontSize: 14,
    color: '#333',
  },
});
