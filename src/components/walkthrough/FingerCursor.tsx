import React from 'react';
import { Animated, StyleSheet } from 'react-native';

const SIZE = 22;
const RING_SIZE = 36;

export interface CursorAnim {
  tx: Animated.Value;
  ty: Animated.Value;
  scale: Animated.Value;
  ringScale: Animated.Value;
  ringOpacity: Animated.Value;
}

export function createCursor(initX: number, initY: number): CursorAnim {
  return {
    tx: new Animated.Value(initX),
    ty: new Animated.Value(initY),
    scale: new Animated.Value(1),
    ringScale: new Animated.Value(0.6),
    ringOpacity: new Animated.Value(0),
  };
}

/** Move the cursor from current position to (x, y) over `duration` ms. */
export function moveTo(c: CursorAnim, x: number, y: number, duration = 700): Animated.CompositeAnimation {
  return Animated.parallel([
    Animated.timing(c.tx, { toValue: x, duration, useNativeDriver: true }),
    Animated.timing(c.ty, { toValue: y, duration, useNativeDriver: true }),
  ]);
}

/** Quick tap: finger scale bounce + expanding/fading ripple ring. */
export function tap(c: CursorAnim): Animated.CompositeAnimation {
  return Animated.parallel([
    Animated.sequence([
      Animated.timing(c.scale, { toValue: 0.75, duration: 110, useNativeDriver: true }),
      Animated.timing(c.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]),
    Animated.sequence([
      // reset ring to start state instantly
      Animated.parallel([
        Animated.timing(c.ringScale, { toValue: 0.55, duration: 0, useNativeDriver: true }),
        Animated.timing(c.ringOpacity, { toValue: 0.7, duration: 0, useNativeDriver: true }),
      ]),
      // expand outward and fade
      Animated.parallel([
        Animated.timing(c.ringScale, { toValue: 1.6, duration: 500, useNativeDriver: true }),
        Animated.timing(c.ringOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]),
  ]);
}

/** Press-and-hold: slow ring expansion, sustained press, then release. */
export function hold(c: CursorAnim, duration = 1000): Animated.CompositeAnimation {
  return Animated.parallel([
    Animated.sequence([
      Animated.timing(c.scale, { toValue: 0.82, duration: 150, useNativeDriver: true }),
      Animated.delay(duration),
      Animated.timing(c.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]),
    Animated.sequence([
      Animated.parallel([
        Animated.timing(c.ringScale, { toValue: 0.55, duration: 0, useNativeDriver: true }),
        Animated.timing(c.ringOpacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(c.ringScale, { toValue: 1.4, duration: duration + 150, useNativeDriver: true }),
        Animated.timing(c.ringOpacity, { toValue: 0, duration: duration + 150, useNativeDriver: true }),
      ]),
    ]),
  ]);
}

export default function FingerCursor({ cursor }: { cursor: CursorAnim }) {
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            transform: [
              { translateX: cursor.tx },
              { translateY: cursor.ty },
              { scale: cursor.ringScale },
            ],
            opacity: cursor.ringOpacity,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.finger,
          {
            transform: [
              { translateX: cursor.tx },
              { translateY: cursor.ty },
              { scale: cursor.scale },
            ],
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  finger: {
    position: 'absolute',
    left: 0,
    top: 0,
    marginLeft: -SIZE / 2,
    marginTop: -SIZE / 2,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: 'rgba(60,60,60,0.55)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  ring: {
    position: 'absolute',
    left: 0,
    top: 0,
    marginLeft: -RING_SIZE / 2,
    marginTop: -RING_SIZE / 2,
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(60,60,60,0.65)',
  },
});
