import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard,
  ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { fetchDocText, fetchDocTitle } from '../utils/googleDocs';
import { parseItineraryText } from '../utils/parser';
import { saveTripFull, saveTripList, loadTripList, saveActiveTripId, loadApiKey, saveApiKey } from '../utils/storage';
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
  return first === last ? fmt(first) : `${fmt(first)} – ${fmt(last)}`;
}

export default function ImportScreen({ onImport, onCancel }: Props) {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    loadApiKey().then((key) => {
      if (key) {
        setApiKey(key);
        setHasStoredKey(true);
      }
    });
  }, []);

  // Persist the API key whenever it changes (debounced to avoid saving on every keystroke)
  useEffect(() => {
    const trimmed = apiKey.trim();
    if (!trimmed || hasStoredKey) return;
    const timer = setTimeout(() => saveApiKey(trimmed), 500);
    return () => clearTimeout(timer);
  }, [apiKey, hasStoredKey]);

  const handleImport = async () => {
    if (!apiKey.trim()) {
      Alert.alert('API Key Required', 'Please enter your Anthropic API key.');
      return;
    }
    if (!url.trim()) {
      Alert.alert('Paste your Google Doc link first.');
      return;
    }
    await saveApiKey(apiKey.trim());
    setLoading(true);
    setProgress('Fetching document...');
    try {
      const [text, docTitle] = await Promise.all([
        fetchDocText(url.trim()),
        fetchDocTitle(url.trim()),
      ]);
      setProgress('Starting parse...');
      const trip = await parseItineraryText(text, url.trim(), docTitle ?? undefined, setProgress);
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Let's Get Started</Text>
      <Text style={styles.label}>Anthropic API Key</Text>
      <Text style={styles.hint}>Get an API key at console.anthropic.com</Text>
      <TextInput
        style={styles.input}
        placeholder="sk-ant-..."
        placeholderTextColor="#bbb"
        value={apiKey}
        onChangeText={(text) => { setApiKey(text); if (hasStoredKey) setHasStoredKey(false); }}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={hasStoredKey}
        editable={!loading}
      />
      <Text style={styles.label}>Google Doc URL</Text>
      <Text style={styles.hint}>Change general access setting to "Anyone with the link"</Text>
      <TextInput
        style={styles.input}
        placeholder="https://docs.google.com/document/d/..."
        placeholderTextColor="#bbb"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      <TouchableOpacity style={styles.button} onPress={handleImport} disabled={loading}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#fff" />
            {progress ? <Text style={styles.progressText}>{progress}</Text> : null}
          </View>
        ) : (
          <Text style={styles.buttonText}>Import Itinerary</Text>
        )}
      </TouchableOpacity>
      {onCancel && (
        <TouchableOpacity onPress={onCancel} disabled={loading}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#f5f5f5',
    justifyContent: 'center', padding: 24,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 32 },
  label: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    fontSize: 14, borderWidth: 1, borderColor: '#ddd', marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF', borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  progressText: { color: '#fff', fontSize: 14, marginLeft: 10 },
  cancel: { color: '#007AFF', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  hint: { fontSize: 12, color: '#888', marginBottom: 6 },
});
