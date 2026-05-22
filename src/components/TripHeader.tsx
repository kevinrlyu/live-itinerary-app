import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable, Modal,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../contexts/SettingsContext';

interface Props {
  title: string;
  onOpenDrawer: () => void;
  onRenameTrip?: (newTitle: string) => void;
}

export default function TripHeader({ title, onOpenDrawer, onRenameTrip }: Props) {
  const { colors } = useSettings();
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (renameVisible) {
      setRenameValue(title);
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [renameVisible]);

  const handleLongPress = () => {
    if (!onRenameTrip) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRenameVisible(true);
  };

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== title) onRenameTrip?.(trimmed);
    setRenameVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.borderMedium }]}>
      <Text
        style={[styles.title, { color: colors.textPrimary }]}
        numberOfLines={1}
        onLongPress={handleLongPress}
      >
        {title}
      </Text>
      <TouchableOpacity onPress={onOpenDrawer} style={styles.menuButton} testID="menu-button">
        <View style={styles.menuIconContainer}>
          <View style={[styles.menuBar, { backgroundColor: colors.accent }]} />
          <View style={[styles.menuBar, { backgroundColor: colors.accent }]} />
          <View style={[styles.menuBar, { backgroundColor: colors.accent }]} />
        </View>
      </TouchableOpacity>

      <Modal visible={renameVisible} transparent animationType="fade" onRequestClose={() => setRenameVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRenameVisible(false)} />
          <View style={[styles.dialog, { backgroundColor: colors.modalBackground }]}>
            <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>Rename Trip</Text>
            <TextInput
              ref={inputRef}
              style={[styles.dialogInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Title"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done"
              onSubmitEditing={handleRenameSubmit}
              autoCapitalize="sentences"
              selectTextOnFocus
            />
            <View style={[styles.dialogBtns, { borderTopColor: colors.border }]}>
              <Pressable style={[styles.dialogBtn, styles.dialogBtnLeft, { borderRightColor: colors.border }]} onPress={() => setRenameVisible(false)}>
                <Text style={[styles.dialogBtnText, { color: colors.accent }]}>Cancel</Text>
              </Pressable>
              <View style={[styles.dialogBtnDivider, { backgroundColor: colors.border }]} />
              <Pressable style={styles.dialogBtn} onPress={handleRenameSubmit}>
                <Text style={[styles.dialogBtnText, styles.dialogBtnBold, { color: colors.accent }]}>Rename</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  menuButton: {
    padding: 8,
  },
  menuIconContainer: {
    width: 22,
    height: 18,
    justifyContent: 'space-between',
  },
  menuBar: {
    width: 22,
    height: 2.5,
    borderRadius: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: 270,
    backgroundColor: '#f9f9f9',
    borderRadius: 14,
    paddingTop: 16,
    overflow: 'hidden',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  dialogInput: {
    marginTop: 12,
    marginHorizontal: 14,
    height: 32,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#1a1a1a',
  },
  dialogBtns: {
    flexDirection: 'row',
    marginTop: 14,
    height: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  },
  dialogBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnLeft: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#ccc',
  },
  dialogBtnDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#ccc',
  },
  dialogBtnText: {
    fontSize: 14,
    color: '#007AFF',
  },
  dialogBtnBold: {
    fontWeight: '600',
  },
});
