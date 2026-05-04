import ActivityKit
import ExpoModulesCore

// JS-facing module name: "TrotterLiveActivity"
// Mirrors the contract in src/utils/liveActivity.ts.
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
      let tripTitle = (state["tripTitle"] as? String) ?? "Trip"
      let attributes = TrotterLiveActivityAttributes(tripTitle: tripTitle)
      let contentState = makeContentState(from: state)
      do {
        let activity = try Activity.request(
          attributes: attributes,
          content: ActivityContent(state: contentState, staleDate: nil),
          pushType: nil
        )
        return activity.id
      } catch {
        NSLog("TrotterLiveActivity: start failed: \(error.localizedDescription)")
        return nil
      }
    }

    AsyncFunction("update") { (activityId: String, state: [String: Any]) -> Void in
      guard #available(iOS 16.2, *) else { return }
      let contentState = makeContentState(from: state)
      let activities = Activity<TrotterLiveActivityAttributes>.activities
      if let activity = activities.first(where: { $0.id == activityId }) {
        await activity.update(ActivityContent(state: contentState, staleDate: nil))
      }
    }

    AsyncFunction("end") { (activityId: String) -> Void in
      guard #available(iOS 16.2, *) else { return }
      let activities = Activity<TrotterLiveActivityAttributes>.activities
      if let activity = activities.first(where: { $0.id == activityId }) {
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
