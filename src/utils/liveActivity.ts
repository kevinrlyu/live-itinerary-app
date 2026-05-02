// Live Activity / Dynamic Island integration — JS-side service module.
//
// This file defines the JS API surface that the rest of the app can call to
// drive a Live Activity (lock-screen card + Dynamic Island compact/expanded
// states). The native iOS Widget Extension that actually renders these is
// not yet implemented — see docs/superpowers/plans/2026-05-02-live-activities.md
// for the implementation plan.
//
// Until the native module is in place, all functions here are safe no-ops:
// they preserve the call sites in JS so the rest of the app can be wired up
// against a stable contract, and switch over to the real implementation in
// a single place when the native side ships.

import { NativeModules, Platform } from 'react-native';

/**
 * Snapshot of "what's happening now" + "what's next" for the active trip.
 * Mirrors what the Dynamic Island compact + expanded views will render.
 */
export interface LiveActivityState {
  tripTitle: string;
  // Current activity (may be null if there's no scheduled activity for now)
  current: {
    title: string;
    location: string | null;
    startTime: string | null;     // HH:MM, 24h
    endTime: string | null;       // HH:MM, 24h, optional
    category: 'hotel' | 'meal' | null;
    isTransport: boolean;
  } | null;
  // Next upcoming activity — what fills the trailing slot when nothing is "now"
  next: {
    title: string;
    startTime: string | null;
  } | null;
}

interface NativeLiveActivityModule {
  start(state: LiveActivityState): Promise<string | null>;     // returns activityId, or null on failure
  update(activityId: string, state: LiveActivityState): Promise<void>;
  end(activityId: string): Promise<void>;
  isSupported(): Promise<boolean>;
}

function getNativeModule(): NativeLiveActivityModule | null {
  if (Platform.OS !== 'ios') return null;
  const mod = (NativeModules as Record<string, NativeLiveActivityModule | undefined>).TrotterLiveActivity;
  return mod ?? null;
}

/**
 * Start a Live Activity for the current trip. Returns an activityId that
 * subsequent update/end calls reference. Returns null if Live Activities
 * aren't supported on this device (older iPhone, Android, native module
 * not yet shipped).
 */
export async function startLiveActivity(state: LiveActivityState): Promise<string | null> {
  const native = getNativeModule();
  if (!native) return null;
  try {
    return await native.start(state);
  } catch {
    return null;
  }
}

export async function updateLiveActivity(activityId: string, state: LiveActivityState): Promise<void> {
  const native = getNativeModule();
  if (!native) return;
  try {
    await native.update(activityId, state);
  } catch {
    // Update failures are non-critical — the activity continues showing the
    // previous state until the next successful update or until it expires.
  }
}

export async function endLiveActivity(activityId: string): Promise<void> {
  const native = getNativeModule();
  if (!native) return;
  try {
    await native.end(activityId);
  } catch {
    // Ignore — iOS will time out the activity automatically after 8 hours.
  }
}

/** True only if a real native module is wired in (not just the stub). */
export async function isLiveActivitySupported(): Promise<boolean> {
  const native = getNativeModule();
  if (!native) return false;
  try {
    return await native.isSupported();
  } catch {
    return false;
  }
}
