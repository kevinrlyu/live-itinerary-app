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
