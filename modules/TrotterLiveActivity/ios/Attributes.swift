import ActivityKit
import Foundation

// IMPORTANT: this file is duplicated at targets/TrotterLiveActivity/Attributes.swift
// — keep the two copies in sync. ActivityKit requires the attributes type to
// be visible (with the same unqualified name and Codable shape) in both the
// host app target (this copy) and the widget extension target (the other one).
// Apple's recommended approach is "add the same file to both targets via
// Target Membership," but @bacons/apple-targets doesn't expose that, so we
// keep parallel copies with identical contents.

public struct TrotterLiveActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var currentTitle: String?
    public var currentLocation: String?
    public var currentStartTime: String?
    public var currentEndTime: String?
    public var currentCategory: String?
    public var currentIsTransport: Bool

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

  public var tripTitle: String

  public init(tripTitle: String) {
    self.tripTitle = tripTitle
  }
}
