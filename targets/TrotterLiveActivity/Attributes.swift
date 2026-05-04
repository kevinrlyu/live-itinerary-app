import ActivityKit
import Foundation

// Shared between the Widget Extension (which renders the views) and the
// Expo Module bridge (which receives ContentState updates from JS). The
// shape mirrors LiveActivityState in src/utils/liveActivity.ts.
public struct TrotterLiveActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    // Current activity (nil if there's nothing happening "now")
    public var currentTitle: String?
    public var currentLocation: String?
    public var currentStartTime: String?     // "HH:MM" 24h
    public var currentEndTime: String?
    public var currentCategory: String?      // "hotel" | "meal" | nil
    public var currentIsTransport: Bool

    // Next upcoming activity
    public var nextTitle: String?
    public var nextStartTime: String?

    public init(
      currentTitle: String? = nil,
      currentLocation: String? = nil,
      currentStartTime: String? = nil,
      currentEndTime: String? = nil,
      currentCategory: String? = nil,
      currentIsTransport: Bool = false,
      nextTitle: String? = nil,
      nextStartTime: String? = nil
    ) {
      self.currentTitle = currentTitle
      self.currentLocation = currentLocation
      self.currentStartTime = currentStartTime
      self.currentEndTime = currentEndTime
      self.currentCategory = currentCategory
      self.currentIsTransport = currentIsTransport
      self.nextTitle = nextTitle
      self.nextStartTime = nextStartTime
    }
  }

  // Static attributes — set once when activity starts
  public var tripTitle: String

  public init(tripTitle: String) {
    self.tripTitle = tripTitle
  }
}
