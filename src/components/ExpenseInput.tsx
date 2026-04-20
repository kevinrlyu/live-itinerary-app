import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, TouchableOpacity, ScrollView, Modal, Dimensions,
  StyleSheet, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const CURRENCY_FLAGS: Record<string, string> = {
  AED: '\u{1F1E6}\u{1F1EA}', AFN: '\u{1F1E6}\u{1F1EB}', ALL: '\u{1F1E6}\u{1F1F1}',
  AMD: '\u{1F1E6}\u{1F1F2}', ANG: '\u{1F1F3}\u{1F1F1}', AOA: '\u{1F1E6}\u{1F1F4}',
  ARS: '\u{1F1E6}\u{1F1F7}', AUD: '\u{1F1E6}\u{1F1FA}', AWG: '\u{1F1E6}\u{1F1FC}',
  AZN: '\u{1F1E6}\u{1F1FF}', BAM: '\u{1F1E7}\u{1F1E6}', BBD: '\u{1F1E7}\u{1F1E7}',
  BDT: '\u{1F1E7}\u{1F1E9}', BGN: '\u{1F1E7}\u{1F1EC}', BHD: '\u{1F1E7}\u{1F1ED}',
  BIF: '\u{1F1E7}\u{1F1EE}', BMD: '\u{1F1E7}\u{1F1F2}', BND: '\u{1F1E7}\u{1F1F3}',
  BOB: '\u{1F1E7}\u{1F1F4}', BRL: '\u{1F1E7}\u{1F1F7}', BSD: '\u{1F1E7}\u{1F1F8}',
  BTN: '\u{1F1E7}\u{1F1F9}', BWP: '\u{1F1E7}\u{1F1FC}', BYN: '\u{1F1E7}\u{1F1FE}',
  BZD: '\u{1F1E7}\u{1F1FF}', CAD: '\u{1F1E8}\u{1F1E6}', CDF: '\u{1F1E8}\u{1F1E9}',
  CHF: '\u{1F1E8}\u{1F1ED}', CLP: '\u{1F1E8}\u{1F1F1}', CNY: '\u{1F1E8}\u{1F1F3}',
  COP: '\u{1F1E8}\u{1F1F4}', CRC: '\u{1F1E8}\u{1F1F7}', CUP: '\u{1F1E8}\u{1F1FA}',
  CVE: '\u{1F1E8}\u{1F1FB}', CZK: '\u{1F1E8}\u{1F1FF}', DJF: '\u{1F1E9}\u{1F1EF}',
  DKK: '\u{1F1E9}\u{1F1F0}', DOP: '\u{1F1E9}\u{1F1F4}', DZD: '\u{1F1E9}\u{1F1FF}',
  EGP: '\u{1F1EA}\u{1F1EC}', ERN: '\u{1F1EA}\u{1F1F7}', ETB: '\u{1F1EA}\u{1F1F9}',
  EUR: '\u{1F1EA}\u{1F1FA}', FJD: '\u{1F1EB}\u{1F1EF}', FKP: '\u{1F1EB}\u{1F1F0}',
  GBP: '\u{1F1EC}\u{1F1E7}', GEL: '\u{1F1EC}\u{1F1EA}', GHS: '\u{1F1EC}\u{1F1ED}',
  GIP: '\u{1F1EC}\u{1F1EE}', GMD: '\u{1F1EC}\u{1F1F2}', GNF: '\u{1F1EC}\u{1F1F3}',
  GTQ: '\u{1F1EC}\u{1F1F9}', GYD: '\u{1F1EC}\u{1F1FE}', HKD: '\u{1F1ED}\u{1F1F0}',
  HNL: '\u{1F1ED}\u{1F1F3}', HRK: '\u{1F1ED}\u{1F1F7}', HTG: '\u{1F1ED}\u{1F1F9}',
  HUF: '\u{1F1ED}\u{1F1FA}', IDR: '\u{1F1EE}\u{1F1E9}', ILS: '\u{1F1EE}\u{1F1F1}',
  INR: '\u{1F1EE}\u{1F1F3}', IQD: '\u{1F1EE}\u{1F1F6}', IRR: '\u{1F1EE}\u{1F1F7}',
  ISK: '\u{1F1EE}\u{1F1F8}', JMD: '\u{1F1EF}\u{1F1F2}', JOD: '\u{1F1EF}\u{1F1F4}',
  JPY: '\u{1F1EF}\u{1F1F5}', KES: '\u{1F1F0}\u{1F1EA}', KGS: '\u{1F1F0}\u{1F1EC}',
  KHR: '\u{1F1F0}\u{1F1ED}', KMF: '\u{1F1F0}\u{1F1F2}', KPW: '\u{1F1F0}\u{1F1F5}',
  KRW: '\u{1F1F0}\u{1F1F7}', KWD: '\u{1F1F0}\u{1F1FC}', KYD: '\u{1F1F0}\u{1F1FE}',
  KZT: '\u{1F1F0}\u{1F1FF}', LAK: '\u{1F1F1}\u{1F1E6}', LBP: '\u{1F1F1}\u{1F1E7}',
  LKR: '\u{1F1F1}\u{1F1F0}', LRD: '\u{1F1F1}\u{1F1F7}', LSL: '\u{1F1F1}\u{1F1F8}',
  LYD: '\u{1F1F1}\u{1F1FE}', MAD: '\u{1F1F2}\u{1F1E6}', MDL: '\u{1F1F2}\u{1F1E9}',
  MGA: '\u{1F1F2}\u{1F1EC}', MKD: '\u{1F1F2}\u{1F1F0}', MMK: '\u{1F1F2}\u{1F1F2}',
  MNT: '\u{1F1F2}\u{1F1F3}', MOP: '\u{1F1F2}\u{1F1F4}', MRU: '\u{1F1F2}\u{1F1F7}',
  MUR: '\u{1F1F2}\u{1F1FA}', MVR: '\u{1F1F2}\u{1F1FB}', MWK: '\u{1F1F2}\u{1F1FC}',
  MXN: '\u{1F1F2}\u{1F1FD}', MYR: '\u{1F1F2}\u{1F1FE}', MZN: '\u{1F1F2}\u{1F1FF}',
  NAD: '\u{1F1F3}\u{1F1E6}', NGN: '\u{1F1F3}\u{1F1EC}', NIO: '\u{1F1F3}\u{1F1EE}',
  NOK: '\u{1F1F3}\u{1F1F4}', NPR: '\u{1F1F3}\u{1F1F5}', NZD: '\u{1F1F3}\u{1F1FF}',
  OMR: '\u{1F1F4}\u{1F1F2}', PAB: '\u{1F1F5}\u{1F1E6}', PEN: '\u{1F1F5}\u{1F1EA}',
  PGK: '\u{1F1F5}\u{1F1EC}', PHP: '\u{1F1F5}\u{1F1ED}', PKR: '\u{1F1F5}\u{1F1F0}',
  PLN: '\u{1F1F5}\u{1F1F1}', PYG: '\u{1F1F5}\u{1F1FE}', QAR: '\u{1F1F6}\u{1F1E6}',
  RON: '\u{1F1F7}\u{1F1F4}', RSD: '\u{1F1F7}\u{1F1F8}', RUB: '\u{1F1F7}\u{1F1FA}',
  RWF: '\u{1F1F7}\u{1F1FC}', SAR: '\u{1F1F8}\u{1F1E6}', SBD: '\u{1F1F8}\u{1F1E7}',
  SCR: '\u{1F1F8}\u{1F1E8}', SDG: '\u{1F1F8}\u{1F1E9}', SEK: '\u{1F1F8}\u{1F1EA}',
  SGD: '\u{1F1F8}\u{1F1EC}', SHP: '\u{1F1F8}\u{1F1ED}', SLE: '\u{1F1F8}\u{1F1F1}',
  SOS: '\u{1F1F8}\u{1F1F4}', SRD: '\u{1F1F8}\u{1F1F7}', SSP: '\u{1F1F8}\u{1F1F8}',
  STN: '\u{1F1F8}\u{1F1F9}', SYP: '\u{1F1F8}\u{1F1FE}', SZL: '\u{1F1F8}\u{1F1FF}',
  THB: '\u{1F1F9}\u{1F1ED}', TJS: '\u{1F1F9}\u{1F1EF}', TMT: '\u{1F1F9}\u{1F1F2}',
  TND: '\u{1F1F9}\u{1F1F3}', TOP: '\u{1F1F9}\u{1F1F4}', TRY: '\u{1F1F9}\u{1F1F7}',
  TTD: '\u{1F1F9}\u{1F1F9}', TWD: '\u{1F1F9}\u{1F1FC}', TZS: '\u{1F1F9}\u{1F1FF}',
  UAH: '\u{1F1FA}\u{1F1E6}', UGX: '\u{1F1FA}\u{1F1EC}', USD: '\u{1F1FA}\u{1F1F8}',
  UYU: '\u{1F1FA}\u{1F1FE}', UZS: '\u{1F1FA}\u{1F1FF}', VES: '\u{1F1FB}\u{1F1EA}',
  VND: '\u{1F1FB}\u{1F1F3}', VUV: '\u{1F1FB}\u{1F1FA}', WST: '\u{1F1FC}\u{1F1F8}',
  XAF: '\u{1F1E8}\u{1F1F2}', XCD: '\u{1F1E6}\u{1F1EC}', XOF: '\u{1F1F8}\u{1F1F3}',
  XPF: '\u{1F1F5}\u{1F1EB}', YER: '\u{1F1FE}\u{1F1EA}', ZAR: '\u{1F1FF}\u{1F1E6}',
  ZMW: '\u{1F1FF}\u{1F1F2}', ZWL: '\u{1F1FF}\u{1F1FC}',
};

const CURRENCIES = Object.keys(CURRENCY_FLAGS).sort();

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', AED: 'د.إ',
  ARS: '$', AUD: 'A$', BRL: 'R$', CAD: 'C$', CHF: 'CHF', CLP: '$',
  COP: '$', CRC: '₡', CZK: 'Kč', DKK: 'kr', EGP: 'E£', GEL: '₾',
  HKD: 'HK$', HUF: 'Ft', IDR: 'Rp', ILS: '₪', INR: '₹', ISK: 'kr',
  KRW: '₩', KWD: 'د.ك', MXN: '$', MYR: 'RM', NGN: '₦', NOK: 'kr',
  NZD: 'NZ$', PEN: 'S/', PHP: '₱', PKR: '₨', PLN: 'zł', QAR: 'ر.ق',
  RON: 'lei', RUB: '₽', SAR: 'ر.س', SEK: 'kr', SGD: 'S$', THB: '฿',
  TRY: '₺', TWD: 'NT$', UAH: '₴', VND: '₫', ZAR: 'R',
};

export interface ExpenseInputTarget {
  activityId: string;
  activityTitle: string;
  existingExpense: { amount: number; currency: string } | null;
  defaultCurrency: string;
}

interface Props {
  target: ExpenseInputTarget;
  onSave: (activityId: string, expense: { amount: number; currency: string } | null) => void;
  onClose: () => void;
}

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

const PICKER_ITEM_H = 36;
const PICKER_VISIBLE_ITEMS = 3;
const PICKER_H = PICKER_ITEM_H * PICKER_VISIBLE_ITEMS;

export default function ExpenseInput({ target, onSave, onClose }: Props) {
  const [amount, setAmount] = useState(
    target.existingExpense ? String(target.existingExpense.amount) : ''
  );
  const [currency, setCurrency] = useState(
    target.existingExpense?.currency || target.defaultCurrency || 'USD'
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [scrollY, setScrollY] = useState(0);
  const lastTickIdx = useRef(-1);

  const openPicker = () => {
    buttonRef.current?.measureInWindow((x, y, w, h) => {
      const buttonMidY = y + h / 2;
      const screenWidth = Dimensions.get('window').width;
      setPickerPos({
        top: buttonMidY - PICKER_H / 2,
        right: screenWidth - (x + w),
      });
      setPickerOpen(true);
    });
  };

  useEffect(() => {
    if (pickerOpen) {
      const idx = CURRENCIES.indexOf(currency);
      lastTickIdx.current = idx;
      if (idx >= 0) {
        const y = idx * PICKER_ITEM_H;
        setScrollY(y);
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y, animated: false });
        }, 0);
      }
    }
  }, [pickerOpen]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / PICKER_ITEM_H);
    const clamped = Math.max(0, Math.min(idx, CURRENCIES.length - 1));
    if (CURRENCIES[clamped] !== currency) {
      setCurrency(CURRENCIES[clamped]);
    }
  };

  const centeredIdx = Math.round(scrollY / PICKER_ITEM_H);
  const getItemOpacity = (idx: number) => {
    const dist = Math.abs(idx - centeredIdx);
    if (dist === 0) return 1;
    if (dist === 1) return 0.35;
    return 0.15;
  };

  const handleKey = (key: string) => {
    if (key === '⌫') {
      setAmount((prev) => prev.slice(0, -1));
    } else if (key === '.') {
      if (!amount.includes('.')) setAmount((prev) => prev + '.');
    } else {
      setAmount((prev) => prev + key);
    }
  };

  const handleSave = () => {
    const parsed = parseFloat(amount);
    if (!isNaN(parsed) && parsed > 0) {
      onSave(target.activityId, { amount: parsed, currency });
    }
    onClose();
  };

  const handleDelete = () => {
    onSave(target.activityId, null);
    onClose();
  };

  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  const displayAmount = amount || '0';

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.card}>
        <Text style={styles.title} numberOfLines={1}>{target.activityTitle}</Text>

        {/* Amount display */}
        <View style={styles.amountRow}>
          <Text style={[styles.amountDisplay, !amount && styles.amountPlaceholder]}>
            {sym}{displayAmount}
          </Text>
          <View ref={buttonRef} collapsable={false}>
            <Pressable
              style={styles.currencyButton}
              onPress={() => pickerOpen ? setPickerOpen(false) : openPicker()}
            >
              <Text style={styles.currencyButtonText}>{CURRENCY_FLAGS[currency] || ''} {currency}</Text>
            </Pressable>
          </View>
        </View>

        {/* Number pad */}
        <View style={styles.pad}>
          {PAD_KEYS.map((key) => (
            <Pressable
              key={key}
              style={({ pressed }) => [styles.padKey, pressed && styles.padKeyPressed]}
              onPress={() => handleKey(key)}
            >
              <Text style={styles.padKeyText}>{key}</Text>
            </Pressable>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {target.existingExpense && (
            <Pressable onPress={handleDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }} />
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={pickerOpen} transparent animationType="none" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={pickerStyles.backdrop} onPress={() => setPickerOpen(false)} />
        {pickerPos && (
          <View style={[pickerStyles.container, { top: pickerPos.top, right: pickerPos.right }]}>
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
                if (idx !== lastTickIdx.current && idx >= 0 && idx < CURRENCIES.length) {
                  lastTickIdx.current = idx;
                  Haptics.selectionAsync();
                }
              }}
              scrollEventThrottle={16}
              onMomentumScrollEnd={handleScrollEnd}
              onScrollEndDrag={(e) => {
                const v = e.nativeEvent.velocity?.y ?? 0;
                if (Math.abs(v) < 0.1) handleScrollEnd(e);
              }}
              contentContainerStyle={{
                paddingVertical: PICKER_ITEM_H,
              }}
            >
              {CURRENCIES.map((cur, i) => (
                <TouchableOpacity
                  key={cur}
                  style={pickerStyles.item}
                  activeOpacity={0.7}
                  onPress={() => {
                    setCurrency(cur);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={[
                    pickerStyles.itemText,
                    i === centeredIdx && pickerStyles.itemTextSelected,
                    { opacity: getItemOpacity(i) },
                  ]}>{CURRENCY_FLAGS[cur] || ''} {cur}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currencyButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  amountDisplay: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'left',
  },
  amountPlaceholder: {
    color: '#ccc',
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  padKey: {
    width: '33.33%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padKeyPressed: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  padKeyText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

const pickerStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    position: 'absolute',
    width: 100,
    height: PICKER_H,
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
    alignItems: 'center',
  },
  itemText: {
    fontSize: 14,
    color: '#333',
  },
  itemTextSelected: {
    color: '#007AFF',
    fontWeight: '700',
  },
});
