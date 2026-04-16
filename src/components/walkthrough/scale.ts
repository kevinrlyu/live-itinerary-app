// Shared scaling constants for all walkthrough demo mockups.
// The demo frame is a fixed size; every real-world dimension from the live
// app components is multiplied by S so the mockup is a true proportional
// representation of what the user sees on-device.

export const FRAME_W = 220;
export const FRAME_H = 460;
export const IPHONE_W = 402; // iPhone 17 Pro logical width in points
export const S = FRAME_W / IPHONE_W;

// Apply scale to a real-world pt value
export const s = (n: number) => n * S;

// Approximate top safe-area inset on modern iPhones
export const STATUS_H = s(50);
