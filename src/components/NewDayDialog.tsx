import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSettings } from '../contexts/SettingsContext';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onAdd: (title: string) => void;
}

export default function NewDayDialog({ visible, onCancel, onAdd }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);
  const { colors } = useSettings();

  useEffect(() => {
    if (visible) {
      setValue('');
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const submit = () => {
    onAdd(value);
    setValue('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={[styles.dialog, { backgroundColor: colors.modalBackground }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>New Day</Text>
          <TextInput
            ref={inputRef}
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textPrimary }]}
            value={value}
            onChangeText={setValue}
            placeholder="Title"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="done"
            onSubmitEditing={submit}
            autoCapitalize="sentences"
          />
          <View style={[styles.btns, { borderTopColor: colors.border }]}>
            <Pressable style={[styles.btn, styles.btnLeft, { borderRightColor: colors.border }]} onPress={onCancel}>
              <Text style={[styles.btnText, { color: colors.accent }]}>Cancel</Text>
            </Pressable>
            <View style={[styles.btnDivider, { backgroundColor: colors.border }]} />
            <Pressable style={styles.btn} onPress={submit}>
              <Text style={[styles.btnText, styles.btnBold, { color: colors.accent }]}>Add</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  input: {
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
  btns: {
    flexDirection: 'row',
    marginTop: 14,
    height: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLeft: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#ccc',
  },
  btnDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#ccc',
  },
  btnText: {
    fontSize: 14,
    color: '#007AFF',
  },
  btnBold: {
    fontWeight: '700',
  },
});
