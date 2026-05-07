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
        DynamicIslandExpandedRegion(.leading) {
          EmptyView()
        }
        DynamicIslandExpandedRegion(.trailing) {
          EmptyView()
        }
        DynamicIslandExpandedRegion(.center) {
          ExpandedContent(attributes: context.attributes, state: context.state)
        }
        DynamicIslandExpandedRegion(.bottom) {
          ExpandedBottom(state: context.state)
        }
      } compactLeading: {
        TrotterIconView(size: 22)
          .padding(.leading, 2)
      } compactTrailing: {
        EmptyView()
      } minimal: {
        TrotterIconView(size: 22)
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
      if let range = state.currentTimeRange {
        Text(range)
          .font(.caption2)
          .foregroundColor(.white.opacity(0.6))
          .textCase(.uppercase)
      }

      if let title = state.currentTitle {
        HStack(spacing: 8) {
          if let uiImage = UIImage(named: "TrotterIcon") {
            Image(uiImage: uiImage)
              .resizable()
              .aspectRatio(contentMode: .fit)
              .frame(width: 24, height: 24)
              .clipShape(RoundedRectangle(cornerRadius: 6))
          }
          Text(title)
            .font(.headline)
            .foregroundColor(.white)
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

// MARK: - Trotter icon helper

private struct TrotterIconView: View {
  var size: CGFloat
  var body: some View {
    if let uiImage = UIImage(named: "TrotterIcon") {
      Image(uiImage: uiImage)
        .resizable()
        .aspectRatio(contentMode: .fit)
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.25, style: .continuous))
    }
  }
}

// MARK: - Dynamic Island expanded content

private struct ExpandedContent: View {
  let attributes: TrotterLiveActivityAttributes
  let state: TrotterLiveActivityAttributes.ContentState
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      if let range = state.currentTimeRange {
        Text(range)
          .font(.caption2)
          .foregroundColor(.white.opacity(0.6))
          .textCase(.uppercase)
      }

      if let title = state.currentTitle {
        HStack(spacing: 8) {
          TrotterIconView(size: 24)
          Text(title)
            .font(.headline)
            .foregroundColor(.white)
            .lineLimit(1)
        }
      } else {
        Text(attributes.tripTitle)
          .font(.subheadline)
          .foregroundColor(.white.opacity(0.7))
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .offset(y: -8)
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

