import ActivityKit
import SwiftUI
import WidgetKit

@main
struct TrotterLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    TrotterLiveActivity()
  }
}

struct TrotterLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TrotterLiveActivityAttributes.self) { context in
      // Lock-screen / notification banner UI
      LockScreenView(attributes: context.attributes, state: context.state)
        .padding(14)
        .activityBackgroundTint(Color.black.opacity(0.85))
        .activitySystemActionForegroundColor(Color.white)
    } dynamicIsland: { context in
      DynamicIsland {
        // Expanded (long-press) regions
        DynamicIslandExpandedRegion(.leading) {
          ExpandedLeading(state: context.state)
        }
        DynamicIslandExpandedRegion(.trailing) {
          ExpandedTrailing(state: context.state)
        }
        DynamicIslandExpandedRegion(.center) {
          ExpandedCenter(attributes: context.attributes, state: context.state)
        }
        DynamicIslandExpandedRegion(.bottom) {
          ExpandedBottom(state: context.state)
        }
      } compactLeading: {
        Text(iconForState(context.state))
          .font(.system(size: 14))
      } compactTrailing: {
        Text(compactTrailingLabel(context.state))
          .font(.system(size: 12, weight: .semibold))
          .foregroundColor(.white)
      } minimal: {
        Text(iconForState(context.state))
          .font(.system(size: 14))
      }
    }
  }
}

// MARK: - Lock-screen card

private struct LockScreenView: View {
  let attributes: TrotterLiveActivityAttributes
  let state: TrotterLiveActivityAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(attributes.tripTitle)
        .font(.caption2)
        .foregroundColor(.white.opacity(0.6))
        .textCase(.uppercase)

      if let title = state.currentTitle {
        HStack(spacing: 6) {
          Text(iconForState(state))
            .font(.system(size: 16))
          Text("Now: \(title)")
            .font(.headline)
            .foregroundColor(.white)
            .lineLimit(1)
        }
        if let loc = state.currentLocation, !loc.isEmpty {
          Text(loc)
            .font(.caption)
            .foregroundColor(.white.opacity(0.7))
            .lineLimit(1)
        }
      }

      if let next = state.nextTitle {
        HStack(spacing: 4) {
          Text("Next:")
            .font(.caption)
            .foregroundColor(.white.opacity(0.5))
          Text(next + (state.nextStartTime.map { " · \($0)" } ?? ""))
            .font(.caption)
            .foregroundColor(.white.opacity(0.7))
            .lineLimit(1)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

// MARK: - Dynamic Island expanded regions

private struct ExpandedLeading: View {
  let state: TrotterLiveActivityAttributes.ContentState
  var body: some View {
    Text(iconForState(state))
      .font(.system(size: 28))
      .padding(.leading, 4)
  }
}

private struct ExpandedTrailing: View {
  let state: TrotterLiveActivityAttributes.ContentState
  var body: some View {
    if let end = state.currentEndTime {
      VStack(alignment: .trailing, spacing: 0) {
        Text("until")
          .font(.caption2)
          .foregroundColor(.white.opacity(0.5))
        Text(end)
          .font(.system(size: 14, weight: .semibold))
          .foregroundColor(.white)
      }
      .padding(.trailing, 4)
    } else if let nextStart = state.nextStartTime {
      VStack(alignment: .trailing, spacing: 0) {
        Text("next")
          .font(.caption2)
          .foregroundColor(.white.opacity(0.5))
        Text(nextStart)
          .font(.system(size: 14, weight: .semibold))
          .foregroundColor(.white)
      }
      .padding(.trailing, 4)
    } else {
      EmptyView()
    }
  }
}

private struct ExpandedCenter: View {
  let attributes: TrotterLiveActivityAttributes
  let state: TrotterLiveActivityAttributes.ContentState
  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(state.currentTitle ?? "—")
        .font(.headline)
        .foregroundColor(.white)
        .lineLimit(1)
      if let loc = state.currentLocation, !loc.isEmpty {
        Text(loc)
          .font(.caption)
          .foregroundColor(.white.opacity(0.6))
          .lineLimit(1)
      } else {
        Text(attributes.tripTitle)
          .font(.caption)
          .foregroundColor(.white.opacity(0.5))
          .lineLimit(1)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

private struct ExpandedBottom: View {
  let state: TrotterLiveActivityAttributes.ContentState
  var body: some View {
    if let next = state.nextTitle {
      HStack(spacing: 4) {
        Text("Next:")
          .font(.caption)
          .foregroundColor(.white.opacity(0.5))
        Text(next + (state.nextStartTime.map { " · \($0)" } ?? ""))
          .font(.caption)
          .foregroundColor(.white.opacity(0.7))
          .lineLimit(1)
        Spacer()
      }
    } else {
      EmptyView()
    }
  }
}

// MARK: - Helpers

private func iconForState(_ state: TrotterLiveActivityAttributes.ContentState) -> String {
  if state.currentIsTransport { return "🚆" }
  switch state.currentCategory {
  case "hotel": return "🏨"
  case "meal": return "🍴"
  default: return "📍"
  }
}

private func compactTrailingLabel(_ state: TrotterLiveActivityAttributes.ContentState) -> String {
  if let end = state.currentEndTime { return end }
  if let nextStart = state.nextStartTime { return "→\(nextStart)" }
  return "—"
}
