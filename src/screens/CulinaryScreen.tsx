import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Animated, Alert, Keyboard, StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CulinaryRegion } from '../types';
import { useSettings } from '../contexts/SettingsContext';

const PULL_THRESHOLD = 15;
const PULL_MAX = 70;
const HOLD_DURATION = 1000;

interface Props {
  regions: CulinaryRegion[];
  onToggle: (regionIndex: number, itemIndex: number) => void;
  onAddItem: (regionIndex: number, name: string) => void;
  onEditItem: (regionIndex: number, itemIndex: number, name: string) => void;
  onAddRegion: (regionName: string) => void;
  onDeleteItem: (regionIndex: number, itemIndex: number) => void;
  onDeleteRegion: (regionIndex: number) => void;
  onClose?: () => void;
}

export default function CulinaryScreen({ regions, onToggle, onAddItem, onEditItem, onAddRegion, onDeleteItem, onDeleteRegion, onClose }: Props) {
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [editMode, setEditMode] = useState(false);
  const [addingItemForRegion, setAddingItemForRegion] = useState<number | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [sectionName, setSectionName] = useState('');

  // Edit existing item state
  const [editingItem, setEditingItem] = useState<{ rIdx: number; iIdx: number } | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemDesc, setEditItemDesc] = useState('');

  const addItemFormRef = useRef<View>(null);

  // Pull-and-hold state
  const pullAnim = useRef(new Animated.Value(0)).current;
  const holdProgressAnim = useRef(new Animated.Value(0)).current;
  const holdAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const isDraggingRef = useRef(false);
  const isOverscrollingRef = useRef(false);
  const hasFiredRef = useRef(false);
  const [isPulling, setIsPulling] = useState(false);

  const cancelHold = useCallback(() => {
    if (holdAnimRef.current) {
      holdAnimRef.current.stop();
      holdAnimRef.current = null;
    }
    holdProgressAnim.setValue(0);
    isOverscrollingRef.current = false;
    setIsPulling(false);
    pullAnim.setValue(0);
  }, [holdProgressAnim, pullAnim]);

  const startHoldTimer = useCallback(() => {
    if (holdAnimRef.current || hasFiredRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const anim = Animated.timing(holdProgressAnim, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    });
    holdAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && isDraggingRef.current) {
        hasFiredRef.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEditMode(true);
        cancelHold();
      }
    });
  }, [holdProgressAnim, cancelHold]);

  const handleScroll = useCallback((event: any) => {
    const offsetY: number = event.nativeEvent.contentOffset.y;
    scrollOffsetRef.current = offsetY;
    if (editMode) return;

    if (isDraggingRef.current && offsetY < -PULL_THRESHOLD) {
      const rawPull = Math.abs(offsetY) - PULL_THRESHOLD;
      const resistedPull = PULL_MAX * (1 - Math.exp(-rawPull / PULL_MAX));
      pullAnim.setValue(resistedPull);

      if (!isOverscrollingRef.current) {
        isOverscrollingRef.current = true;
        setIsPulling(true);
        startHoldTimer();
      }
    }
  }, [editMode, pullAnim, startHoldTimer]);

  const handleScrollBeginDrag = useCallback(() => {
    isDraggingRef.current = true;
    hasFiredRef.current = false;
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    isDraggingRef.current = false;
    if (isOverscrollingRef.current) {
      cancelHold();
    }
  }, [cancelHold]);

  const exitEditMode = () => {
    setEditMode(false);
    cancelAddItem();
    cancelAddSection();
    cancelEditItem();
    pullAnim.setValue(0);
    holdProgressAnim.setValue(0);
  };

  const editLabelOpacity = holdProgressAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 1],
  });
  const editLabelScale = holdProgressAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.5, 0.8, 1],
  });

  const handleToggle = (rIdx: number, iIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(rIdx, iIdx);
  };

  const handleAddItem = (rIdx: number) => {
    const name = itemName.trim();
    if (!name) return;
    const desc = itemDesc.trim();
    const fullName = desc ? `${name} (${desc})` : name;
    onAddItem(rIdx, fullName);
    setItemName('');
    setItemDesc('');
    setAddingItemForRegion(null);
  };

  const handleAddSection = () => {
    const name = sectionName.trim();
    if (!name) return;
    onAddRegion(name);
    setSectionName('');
    setAddingSection(false);
  };

  const cancelAddItem = () => {
    setItemName('');
    setItemDesc('');
    setAddingItemForRegion(null);
  };

  const cancelAddSection = () => {
    setSectionName('');
    setAddingSection(false);
  };

  // Edit existing item
  const startEditItem = (rIdx: number, iIdx: number) => {
    const item = regions[rIdx]?.items[iIdx];
    if (!item) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cancelAddItem();
    cancelAddSection();
    const nameMatch = (item.name || '').replace(/\s*\(.*\)$/, '');
    const descMatch = (item.name || '').match(/\((.*)\)$/);
    setEditingItem({ rIdx, iIdx });
    setEditItemName(nameMatch);
    setEditItemDesc(descMatch ? descMatch[1] : '');
  };

  const handleSaveEditItem = () => {
    if (!editingItem) return;
    const name = editItemName.trim();
    if (!name) return;
    const desc = editItemDesc.trim();
    const fullName = desc ? `${name} (${desc})` : name;
    onEditItem(editingItem.rIdx, editingItem.iIdx, fullName);
    cancelEditItem();
  };

  const cancelEditItem = () => {
    setEditingItem(null);
    setEditItemName('');
    setEditItemDesc('');
  };

  const confirmDeleteItem = (rIdx: number, iIdx: number, itemName: string) => {
    const displayName = itemName.replace(/\s*\(.*\)$/, '') || 'this item';
    Alert.alert(
      'Delete Item',
      `Remove "${displayName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteItem(rIdx, iIdx) },
      ]
    );
  };

  // Scroll add-item form into view above keyboard
  const scrollOffsetRef = useRef(0);
  const scrollToAddItemForm = () => {
    const keyboardListener = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardListener.remove();
      setTimeout(() => {
        addItemFormRef.current?.measureInWindow((_x: number, y: number, _w: number, h: number) => {
          const fieldBottom = y + h + 12;
          const kbTop = e.endCoordinates.screenY;
          if (fieldBottom > kbTop && scrollRef.current) {
            scrollRef.current.scrollTo({
              y: scrollOffsetRef.current + (fieldBottom - kbTop),
              animated: true,
            });
          }
        });
      }, 50);
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {onClose && (
        <>
          <View style={[styles.safeTop, { height: insets.top, backgroundColor: colors.background }]} />
          <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Local Cuisine</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.accent }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {editMode && (
        <View style={[styles.editBanner, { backgroundColor: colors.editBannerBackground }]}>
          <Text style={[styles.editBannerText, { color: colors.accent }]}>Editing</Text>
          <TouchableOpacity onPress={exitEditMode} style={[styles.doneBtnBanner, { backgroundColor: colors.accent }]}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          alwaysBounceVertical
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          scrollEventThrottle={16}
        >
          {regions.length === 0 && !addingSection ? null : (
            regions.map((region, rIdx) => (
              <View
                key={region.region}
                style={[styles.section, { backgroundColor: colors.cardBackground, shadowColor: colors.shadow }]}
              >
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{region.region}</Text>
                  {editMode && (
                    <TouchableOpacity
                      onPress={() => Alert.alert(
                        'Delete Section',
                        `Remove "${region.region}" and all its items?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => onDeleteRegion(rIdx) },
                        ]
                      )}
                    >
                      <Text style={[styles.deleteSectionText, { color: colors.destructive }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {region.items.map((item, iIdx) => {
                  const isEditing = editingItem?.rIdx === rIdx && editingItem?.iIdx === iIdx;

                  if (isEditing) {
                    return (
                      <View key={`${region.region}-${item.name}-${iIdx}`} style={[styles.editItemForm, { borderTopColor: colors.borderLight }]}>
                        <TextInput
                          style={[styles.addInput, { backgroundColor: colors.inputBackground, color: colors.textPrimary }]}
                          value={editItemName}
                          onChangeText={setEditItemName}
                          placeholder="Item name"
                          placeholderTextColor={colors.textTertiary}
                          autoFocus
                        />
                        <TextInput
                          style={[styles.addInput, { backgroundColor: colors.inputBackground, color: colors.textPrimary }]}
                          value={editItemDesc}
                          onChangeText={setEditItemDesc}
                          placeholder="Description"
                          placeholderTextColor={colors.textTertiary}
                        />
                        <View style={styles.addFormActions}>
                          <TouchableOpacity onPress={cancelEditItem}>
                            <Text style={[styles.addCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={handleSaveEditItem} style={[styles.addSaveBtn, { backgroundColor: colors.accent }]}>
                            <Text style={styles.addSaveText}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={`${region.region}-${item.name}-${iIdx}`}
                      style={[styles.itemRow, { borderTopColor: colors.borderLight }]}
                      onPress={() => editMode ? undefined : handleToggle(rIdx, iIdx)}
                      onLongPress={editMode ? () => startEditItem(rIdx, iIdx) : undefined}
                      delayLongPress={400}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.checkbox, { color: colors.accent }, item.checked && { color: colors.accent }]}>
                        {item.checked ? '✓' : '○'}
                      </Text>
                      <View style={styles.itemTextWrap}>
                        <Text style={[styles.itemName, { color: colors.textPrimary }, item.checked && { textDecorationLine: 'line-through', color: colors.textTertiary }]}>
                          {(item.name || '').replace(/\s*\(.*\)$/, '')}
                        </Text>
                        {/\(.*\)$/.test(item.name || '') && (
                          <Text style={[styles.itemDesc, { color: colors.textSecondary }, item.checked && { textDecorationLine: 'line-through', color: colors.textTertiary }]}>
                            {(item.name || '').match(/\((.+)\)$/)?.[1]}
                          </Text>
                        )}
                      </View>
                      {editMode && (
                        <TouchableOpacity
                          onPress={() => confirmDeleteItem(rIdx, iIdx, item.name)}
                          style={styles.deleteItemBtn}
                        >
                          <Text style={[styles.deleteItemText, { color: colors.destructive }]}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Add item — only in edit mode */}
                {editMode && (
                  addingItemForRegion === rIdx ? (
                    <View ref={addItemFormRef} style={styles.addForm}>
                      <TextInput
                        style={[styles.addInput, { backgroundColor: colors.inputBackground, color: colors.textPrimary }]}
                        value={itemName}
                        onChangeText={setItemName}
                        placeholder="Item name"
                        placeholderTextColor={colors.textTertiary}
                        autoFocus
                      />
                      <TextInput
                        style={[styles.addInput, { backgroundColor: colors.inputBackground, color: colors.textPrimary }]}
                        value={itemDesc}
                        onChangeText={setItemDesc}
                        placeholder="Description"
                        placeholderTextColor={colors.textTertiary}
                      />
                      <View style={styles.addFormActions}>
                        <TouchableOpacity onPress={cancelAddItem}>
                          <Text style={[styles.addCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleAddItem(rIdx)} style={[styles.addSaveBtn, { backgroundColor: colors.accent }]}>
                          <Text style={styles.addSaveText}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addItemBtn, { borderTopColor: colors.borderLight }]}
                      onPress={() => {
                        cancelAddSection();
                        cancelEditItem();
                        setAddingItemForRegion(rIdx);
                        scrollToAddItemForm();
                      }}
                    >
                      <Text style={[styles.addItemText, { color: colors.accent }]}>+ Add item</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            ))
          )}

          {/* Add section — only in edit mode */}
          {editMode && (
            addingSection ? (
              <View style={[styles.section, styles.addForm, { backgroundColor: colors.cardBackground, shadowColor: colors.shadow }]}>
                <TextInput
                  style={[styles.addInput, { backgroundColor: colors.inputBackground, color: colors.textPrimary }]}
                  value={sectionName}
                  onChangeText={setSectionName}
                  placeholder="Section name (e.g. region or cuisine)"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                />
                <View style={styles.addFormActions}>
                  <TouchableOpacity onPress={cancelAddSection}>
                    <Text style={[styles.addCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAddSection} style={[styles.addSaveBtn, { backgroundColor: colors.accent }]}>
                    <Text style={styles.addSaveText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addSectionBtn, { backgroundColor: colors.cardBackground }]}
                onPress={() => {
                  cancelAddItem();
                  cancelEditItem();
                  setAddingSection(true);
                  if (regions.length > 0) {
                    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                    const kbListener = Keyboard.addListener('keyboardDidShow', () => {
                      kbListener.remove();
                      scrollRef.current?.scrollToEnd({ animated: true });
                    });
                  }
                }}
              >
                <Text style={[styles.addSectionText, { color: colors.accent }]}>+ Add section</Text>
              </TouchableOpacity>
            )
          )}

          {/* Extra bottom padding for keyboard */}
          <View style={{ height: 40 }} />
        </ScrollView>

      {/* Pull-and-hold overlay — positioned below safe area + header */}
      {isPulling && !editMode && (
        <View style={[styles.pullOverlay, { top: onClose ? insets.top + 46 : 0, backgroundColor: colors.background + 'EB' }]} pointerEvents="none">
          <View style={styles.pullContent}>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.accent,
                    width: holdProgressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Animated.Text
              style={[
                styles.holdLabel,
                {
                  color: colors.accent,
                  opacity: editLabelOpacity,
                  transform: [{ scale: editLabelScale }],
                },
              ]}
            >
              Editing
            </Animated.Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeTop: {
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    paddingLeft: 12,
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  // Edit mode banner
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#D6EAFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  doneBtnBanner: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 0,
    flexGrow: 1,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  deleteSectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  checkbox: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 12,
    width: 22,
    lineHeight: 20,
    marginTop: 1,
  },
  checkboxChecked: {
    color: '#007AFF',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  itemDesc: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  deleteItemBtn: {
    paddingLeft: 12,
  },
  deleteItemText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
    lineHeight: 20,
  },
  // Add item button
  addItemBtn: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  addItemText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  // Add section button
  addSectionBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
  },
  addSectionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  // Inline add/edit form
  addForm: {
    marginTop: 8,
  },
  editItemForm: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  addInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    height: 44,
    textAlignVertical: 'center',
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  addFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  addCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  addSaveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  addSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Pull-and-hold overlay
  pullOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,245,245,0.92)',
  },
  pullContent: {
    alignItems: 'center',
    gap: 6,
  },
  progressTrack: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#007AFF',
  },
  holdLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});
