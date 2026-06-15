<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->


## iOS Development Rules

This file defines the working rules for AI assisted iOS development in this project. Follow these rules every time you make changes.

## 1. Do Not Modify Xcode Project Files

Never modify `.pbxproj` files.

You may create new Swift files, assets, utilities, tests, and documentation, but files must be added to the Xcode project manually in Xcode.

Before creating a new file, clearly state where it should be added in Xcode.

If a change requires project configuration, explain the manual Xcode steps instead of editing the project file.

## 2. Document Platform Gotchas Immediately

Any iOS, SwiftUI, UIKit, Xcode, simulator, device, or SDK issue discovered during a session must be added to this file before the session ends.

Use this format:

```markdown
### Gotcha: Short title

Context:
What triggered the issue.

Problem:
What broke or behaved unexpectedly.

Fix:
What worked.

Rule:
The rule to follow next time.
```

Example:

```markdown
### Gotcha: glassEffect modifier ordering

Context:
Using iOS 26 glass effects in SwiftUI.

Problem:
Applying `.background()` before `.glassEffect()` caused the visual effect to break.

Fix:
Place `.glassEffect()` before background styling.

Rule:
Do not apply `.background()` before `.glassEffect()`.
```

## 3. Use Feature Flags for Experimental Work

Experimental code must be wrapped behind feature flags.

Do not hard launch unfinished behavior directly into the main user flow.

Use a simple feature flag pattern such as:

```swift
enum FeatureFlags {
    static let newCameraFlow = false
    static let experimentalGlassUI = false
}
```

When adding experimental features:

1. Add a feature flag.
2. Default it to off unless explicitly asked otherwise.
3. Make rollback possible by switching one value.
4. Document the flag and what it controls.

## 4. Add Debug Logging for Complex Flows

For complex flows, always add debug logging using `Logger`.

This especially applies to:

1. Camera flows
2. Permission flows
3. Async tasks
4. Networking
5. State restoration
6. Navigation bugs
7. Data persistence
8. Background tasks

Use structured logging like:

```swift
import OSLog

private let logger = Logger(subsystem: "com.yourapp.app", category: "CameraFlow")

logger.debug("Camera permission status: \(status.rawValue)")
logger.error("Failed to start camera session: \(error.localizedDescription)")
```

Logs should help future debugging without exposing sensitive user data.

## 5. Test After Every Change

After each meaningful change, perform a clean test cycle.

Required test flow:

1. Clean build folder with `Cmd Shift K`.
2. Build the app.
3. Run on a real device when device behavior matters.
4. Verify the affected flow manually.
5. Check Xcode console logs.
6. Fix warnings or obvious runtime issues before continuing.

Do not stack multiple untested changes on top of each other.

## 6. Keep Scope Focused

Keep each session focused on one component or one flow.

Good requests:

1. Refactor the camera permission flow.
2. Add logging to onboarding.
3. Create the settings screen UI.
4. Fix the image picker crash.
5. Add a feature flag for the new home screen.

Avoid broad requests like:

```text
Refactor the whole app.
Clean up everything.
Make the app better.
Rewrite all navigation.
```

Smaller scope produces safer code, easier review, and faster rollback.

## 7. Document Session Changes

At the end of every major change, create or update a markdown session note.

Use this location:

```text
Docs/Sessions/
```

Use this filename format:

```text
YYYY MM DD short change name.md
```

Each session note must include:

```markdown
# Session Summary

## What Changed

Describe the files, components, and behavior changed.

## What Broke

Describe errors, regressions, confusing behavior, or unexpected issues.

## How It Was Fixed

Explain the final fix clearly.

## How To Test

List exact steps to verify the change.

## Rollback Steps

Explain how to disable or revert the change.

## Follow Ups

List anything that still needs attention.
```

## 8. Before Making Changes

Before editing code, you should summarize:

1. The exact files you plan to touch.
2. Whether any new files will be created.
3. Whether manual Xcode steps are required.
4. Whether a feature flag is needed.
5. What test flow should be run after the change.

## 9. After Making Changes

After editing code, you should summarize:

1. What changed.
2. What files were touched.
3. What manual Xcode steps are required.
4. What logs were added.
5. What tests should be run.
6. Any rollback steps.

## 10. Current Project Gotchas

Add discovered project specific issues below.

### Gotcha: Do not modify `.pbxproj`

Context:
New files may need to be added to the iOS app.

Problem:
Editing `.pbxproj` directly can corrupt the Xcode project and waste hours.

Fix:
Create files only. Add them to Xcode manually.

Rule:
Never modify `.pbxproj` files.

### Gotcha: Modifier ordering matters for iOS visual effects

Context:
SwiftUI visual effects can be sensitive to modifier order, especially on newer iOS APIs.

Problem:
Certain modifier chains can silently break visual styling.

Fix:
Document working modifier order immediately when discovered.

Rule:
When an iOS API behaves unexpectedly, add the gotcha to this file in the same session.
