# Live Activity / Dynamic Island Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Several tasks here MUST be done during a session with simulator/device access — they cannot be safely completed autonomously.

**Goal:** Surface the trip's "current activity" and "next up" on the iOS lock screen and Dynamic Island via a Live Activity. The on-brand answer to the app's "live itinerary" name — a glance at the cutout shows whether you're on time and what's next, without opening the app.

**Architecture:** A new iOS Widget Extension target (`TrotterLiveActivity`) provides the SwiftUI views for compact, minimal, expanded, and lock-screen presentations. A small Expo Module (`TrotterLiveActivityModule`) bridges JS calls — `start`, `update`, `end`, `isSupported` — to ActivityKit. The JS service in `src/utils/liveActivity.ts` (already shipped as a no-op stub) becomes live once the native side is wired in. Today's-itinerary scheduling is fully known up-front, so the Live Activity can flip between "now" and "next" purely from `Date.now()` driven by ActivityKit's content state — no APNs push backend needed for V1.

**Tech Stack:** Swift / SwiftUI / WidgetKit / ActivityKit (iOS 16.2+), Expo Modules API, `expo-modules-core`. Optionally `@bacons/apple-targets` to manage the Widget Extension target via config plugin.

---

## Already Shipped (in main)

- [x] JS service `src/utils/liveActivity.ts` — no-op stub with stable API (`startLiveActivity`, `updateLiveActivity`, `endLiveActivity`, `isLiveActivitySupported`) and `LiveActivityState` shape.

Everything below is what's left.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app.json` | Modify | Add `NSSupportsLiveActivities = true` to iOS infoPlist; register the new Expo plugin |
| `plugins/withTrotterLiveActivity.js` | Create | Config plugin that adds the Widget Extension target on prebuild |
| `targets/TrotterLiveActivity/Attributes.swift` | Create | `LiveActivityAttributes` (the data model) |
| `targets/TrotterLiveActivity/TrotterLiveActivity.swift` | Create | `Widget` + `ActivityConfiguration` + SwiftUI views |
| `targets/TrotterLiveActivity/Info.plist` | Create | Widget Extension Info.plist |
| `modules/TrotterLiveActivity/expo-module.config.json` | Create | Local Expo Module manifest |
| `modules/TrotterLiveActivity/ios/TrotterLiveActivityModule.swift` | Create | Bridges JS calls → ActivityKit |
| `App.tsx` | Modify | Call `startLiveActivity` when the active trip changes; `updateLiveActivity` when "current activity" changes; `endLiveActivity` on day-end / app exit |
| `src/utils/liveActivity.ts` | (already exists) | No changes needed — the native module name `TrotterLiveActivity` matches the stub's `getNativeModule()` lookup |

---

## Pre-flight checklist

- [ ] Confirm minimum iOS deployment target is **16.2 or later** (Live Activities require this). Check `ios/Trotter.xcworkspace` build settings via `npx expo prebuild --platform ios && open ios/Trotter.xcworkspace` — if it's lower, raise it via `expo-build-properties` plugin or `app.json`.
- [ ] Decide whether to use **`@bacons/apple-targets`** (config-plugin-driven, less manual) or **manual Xcode target setup** (more familiar, but lost on `prebuild --clean`). Recommendation: use `@bacons/apple-targets` since `ios/` is already gitignored and prebuild is the source of truth.
- [ ] Confirm the user has an Apple Developer account with the app's bundle ID provisioned; Live Activities require entitlements that ship in the same provisioning profile as the main app.

---

### Task 1: Set the iOS deployment target to 16.2

**Files:** `app.json`

- [ ] Add or update the `expo-build-properties` plugin entry in `app.json`:
  ```json
  ["expo-build-properties", { "ios": { "deploymentTarget": "16.2" } }]
  ```
- [ ] If `expo-build-properties` isn't installed, run `npx expo install expo-build-properties` first.

### Task 2: Declare Live Activity support in Info.plist

**Files:** `app.json`

- [ ] In `app.json` under `ios.infoPlist`, add:
  ```json
  "NSSupportsLiveActivities": true,
  "NSSupportsLiveActivitiesFrequentUpdates": false
  ```
  (Set the second to `true` only if you implement push-based update updates later. False is correct for V1, where we drive purely from the day's known schedule.)

### Task 3: Add `@bacons/apple-targets` and configure the Widget Extension target

**Files:** `package.json`, `app.json`, `targets/TrotterLiveActivity/expo-target.config.json`

- [ ] `npx expo install @bacons/apple-targets`
- [ ] Add the plugin to `app.json`:
  ```json
  "plugins": [
    ...,
    "@bacons/apple-targets"
  ]
  ```
- [ ] Create `targets/TrotterLiveActivity/expo-target.config.json`:
  ```json
  {
    "type": "widget",
    "icon": "../../assets/icon.png",
    "deploymentTarget": "16.2",
    "frameworks": ["SwiftUI", "WidgetKit", "ActivityKit"]
  }
  ```

### Task 4: Define the activity attributes (data model)

**Files:** `targets/TrotterLiveActivity/Attributes.swift`

- [ ] Create the file:
  ```swift
  import ActivityKit

  // Static attributes — set once when the activity starts.
  // Dynamic state goes in ContentState.
  public struct TrotterLiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
      public var currentTitle: String?
      public var currentLocation: String?
      public var currentStartTime: String?  // "HH:MM"
      public var currentEndTime: String?
      public var currentCategory: String?   // "hotel" | "meal" | nil
      public var currentIsTransport: Bool
      public var nextTitle: String?
      public var nextStartTime: String?
    }
    public var tripTitle: String
  }
  ```

### Task 5: Implement the Widget + SwiftUI views

**Files:** `targets/TrotterLiveActivity/TrotterLiveActivity.swift`

- [ ] Create the Widget struct with all four presentations. Skeleton:
  ```swift
  import ActivityKit
  import WidgetKit
  import SwiftUI

  @main
  struct TrotterLiveActivityBundle: WidgetBundle {
    var body: some Widget {
      TrotterLiveActivity()
    }
  }

  struct TrotterLiveActivity: Widget {
    var body: some WidgetConfiguration {
      ActivityConfiguration(for: TrotterLiveActivityAttributes.self) { context in
        // Lock screen / banner UI
        VStack(alignment: .leading, spacing: 6) {
          Text(context.attributes.tripTitle)
            .font(.caption2).foregroundColor(.secondary)
          if let title = context.state.currentTitle {
            Text("Now: \(title)").font(.headline)
            if let loc = context.state.currentLocation {
              Text(loc).font(.caption).foregroundColor(.secondary)
            }
          }
          if let next = context.state.nextTitle {
            Text("Next: \(next)" + (context.state.nextStartTime.map { " · \($0)" } ?? ""))
              .font(.caption).foregroundColor(.secondary)
          }
        }
        .padding(12)
      } dynamicIsland: { context in
        DynamicIsland {
          // Expanded (long-press) regions
          DynamicIslandExpandedRegion(.leading) {
            Text(iconForCategory(context.state.currentCategory, isTransport: context.state.currentIsTransport))
          }
          DynamicIslandExpandedRegion(.center) {
            Text(context.state.currentTitle ?? "—").lineLimit(1).font(.headline)
          }
          DynamicIslandExpandedRegion(.bottom) {
            if let next = context.state.nextTitle {
              Text("Next: \(next)" + (context.state.nextStartTime.map { " · \($0)" } ?? ""))
                .font(.caption).foregroundColor(.secondary)
            }
          }
        } compactLeading: {
          Text(iconForCategory(context.state.currentCategory, isTransport: context.state.currentIsTransport))
        } compactTrailing: {
          Text(context.state.currentEndTime ?? context.state.nextStartTime ?? "—")
            .font(.caption2)
        } minimal: {
          Text("·")  // placeholder — use SF Symbol per category
        }
      }
    }
  }

  private func iconForCategory(_ category: String?, isTransport: Bool) -> String {
    if isTransport { return "🚆" }
    switch category {
    case "hotel": return "🏨"
    case "meal": return "🍴"
    default: return "📍"
    }
  }
  ```

  *Visual polish needs simulator iteration — the skeleton above renders correctly but layout will need tightening.*

### Task 6: Implement the Expo Module bridge

**Files:** `modules/TrotterLiveActivity/expo-module.config.json`, `modules/TrotterLiveActivity/ios/TrotterLiveActivityModule.swift`

- [ ] Create `expo-module.config.json`:
  ```json
  {
    "platforms": ["apple"],
    "apple": { "modules": ["TrotterLiveActivityModule"] }
  }
  ```
- [ ] Create `TrotterLiveActivityModule.swift`:
  ```swift
  import ExpoModulesCore
  import ActivityKit

  public class TrotterLiveActivityModule: Module {
    public func definition() -> ModuleDefinition {
      Name("TrotterLiveActivity")

      AsyncFunction("isSupported") { () -> Bool in
        if #available(iOS 16.2, *) {
          return ActivityAuthorizationInfo().areActivitiesEnabled
        }
        return false
      }

      AsyncFunction("start") { (state: [String: Any]) -> String? in
        guard #available(iOS 16.2, *) else { return nil }
        let attributes = TrotterLiveActivityAttributes(
          tripTitle: (state["tripTitle"] as? String) ?? ""
        )
        let contentState = makeContentState(from: state)
        do {
          let activity = try Activity.request(
            attributes: attributes,
            content: ActivityContent(state: contentState, staleDate: nil),
            pushType: nil
          )
          return activity.id
        } catch {
          return nil
        }
      }

      AsyncFunction("update") { (activityId: String, state: [String: Any]) -> Void in
        guard #available(iOS 16.2, *) else { return }
        let contentState = makeContentState(from: state)
        if let activity = Activity<TrotterLiveActivityAttributes>.activities.first(where: { $0.id == activityId }) {
          await activity.update(ActivityContent(state: contentState, staleDate: nil))
        }
      }

      AsyncFunction("end") { (activityId: String) -> Void in
        guard #available(iOS 16.2, *) else { return }
        if let activity = Activity<TrotterLiveActivityAttributes>.activities.first(where: { $0.id == activityId }) {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
      }
    }

    @available(iOS 16.2, *)
    private func makeContentState(from state: [String: Any]) -> TrotterLiveActivityAttributes.ContentState {
      let current = state["current"] as? [String: Any]
      let next = state["next"] as? [String: Any]
      return TrotterLiveActivityAttributes.ContentState(
        currentTitle: current?["title"] as? String,
        currentLocation: current?["location"] as? String,
        currentStartTime: current?["startTime"] as? String,
        currentEndTime: current?["endTime"] as? String,
        currentCategory: current?["category"] as? String,
        currentIsTransport: (current?["isTransport"] as? Bool) ?? false,
        nextTitle: next?["title"] as? String,
        nextStartTime: next?["startTime"] as? String
      )
    }
  }
  ```

  Note: `TrotterLiveActivityAttributes` is defined in the Widget Extension target. To share it with the main app target, either (a) duplicate the struct in both targets (simplest), or (b) put it in a Shared Swift framework. Recommend (a) for V1.

### Task 7: Wire JS service to drive Live Activities from app state

**Files:** `App.tsx`, optionally a new `src/hooks/useLiveActivity.ts`

- [ ] In `App.tsx`, add a `useEffect` that:
  - On mount with an active trip whose date range includes today, calls `startLiveActivity(buildState(trip, today))` and stores the returned `activityId` in state.
  - When `tracking.ts` reports a change to the "current activity" or "next activity", calls `updateLiveActivity(activityId, ...)`.
  - On unmount or when the active trip changes, calls `endLiveActivity(activityId)`.
- [ ] `buildState(trip, today)` should:
  - Find the day matching `today`'s date.
  - From that day's activities, pick the current one (start time ≤ now < end time, or via `tracking.ts` logic) and the next one (next-after-current with a start time).
  - Map to the `LiveActivityState` shape.

### Task 8: Test on a real device (or 14-Pro+ simulator)

- [ ] Build and install: `npx expo run:ios --device` or via TestFlight.
- [ ] Open a trip whose start date is today (or temporarily fake the date in `tracking.ts`). Confirm the lock-screen card appears.
- [ ] On a 14-Pro+ device/simulator, verify the Dynamic Island compact, minimal, and expanded states.
- [ ] Force a scenario with a music app playing — confirm coexistence: Trotter on the leading slot, music on the trailing.
- [ ] Verify the activity ends cleanly when the day rolls over (or when the user closes the trip).

### Task 9: Handle the 8-hour activity lifetime cap

- [ ] In the `useEffect` above, schedule a timer that ends the current activity at ~7h59m and starts a fresh one if the trip day is still in progress.
- [ ] Or, simpler: end at midnight and don't restart until the user opens the app the next day.

### Task 10: Update README

**Files:** `README.md`

- [ ] Add a brief section under "How it works" describing the Live Activity behavior.
- [ ] Add `targets/`, `modules/`, and the new plugin to the source code overview.

---

## Things deliberately deferred to V2

- **APNs-driven updates** — would let the activity reflect mid-day changes (e.g. user manually toggles an activity complete from another device) without the app being open. Requires a server. Skip for V1.
- **Per-activity Live Activities** — a separate activity tied to e.g. a specific flight or reservation, started in advance, with countdown UI. Higher value for users with strict-timing items but adds complexity. Skip.
- **Apple Watch companion** — Live Activities don't surface directly on Watch; that needs a separate WatchKit complication / app target. Different feature.
- **Android equivalent** (foreground service notification) — Android's analog is much more limited; the call sites in `liveActivity.ts` already no-op on Android, which is the right behavior unless/until we explicitly want to invest there.
