import React, { useRef, useState } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Demo1Drawer from './walkthrough/Demo1Drawer';
import Demo2Day from './walkthrough/Demo2Day';
import Demo3Activities from './walkthrough/Demo3Activities';
import Demo4Expenses from './walkthrough/Demo4Expenses';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Panel {
  title: string;
  body: string;
}

const PANELS: Panel[] = [
  { title: 'Add or reorder an itinerary', body: '' },
  { title: 'Add or remove a day', body: '' },
  { title: 'Add or edit activities', body: '' },
  { title: 'Track expenses and navigate', body: '' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function Walkthrough({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <WalkthroughContent visible={visible} onClose={onClose} />
      </SafeAreaProvider>
    </Modal>
  );
}

function WalkthroughContent({ visible, onClose }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const insets = useSafeAreaInsets();

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (p !== page) setPage(p);
  };

  const goTo = (p: number) => {
    scrollRef.current?.scrollTo({ x: p * SCREEN_WIDTH, animated: true });
  };

  const isLast = page === PANELS.length - 1;

  const renderVisual = (idx: number) => {
    const active = visible && idx === page;
    if (idx === 0) return <Demo1Drawer active={active} />;
    if (idx === 1) return <Demo2Day active={active} />;
    if (idx === 2) return <Demo3Activities active={active} />;
    if (idx === 3) return <Demo4Expenses active={active} />;
    return null;
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Help</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scroll}
        >
          {PANELS.map((panel, idx) => (
            <View key={idx} style={styles.panel}>
              <View style={styles.visual}>{renderVisual(idx)}</View>
              <View style={styles.caption}>
                <Text style={[styles.title, !panel.body && styles.titleNoBody]}>{panel.title}</Text>
                {panel.body ? <Text style={styles.body}>{panel.body}</Text> : null}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {PANELS.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, idx === page && styles.dotActive]}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => (isLast ? onClose() : goTo(page + 1))}
          >
            <Text style={styles.nextText}>{isLast ? 'Got it' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, color: '#888' },
  scroll: { flex: 1 },
  panel: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  visual: {
    flex: 1,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
  },
  caption: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  titleNoBody: {
    marginBottom: 0,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 8,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#007AFF',
    width: 22,
  },
  nextBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
