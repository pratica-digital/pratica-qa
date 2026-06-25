# TopNav Review

## Scope

This review covers the platform top navigation actions: sidebar toggle, global search, create action, notifications, profile access, logout, and the removed theme toggle.

## Decisions

### Theme Toggle

Removed.

Reason: the platform only has a complete light theme. The previous dark-mode button toggled a root class and local storage key, but the product did not provide a complete dark visual system. Keeping it increased visual and state complexity without a real user workflow.

Removed implementation:
- `isDark` state and theme effect from `AppShell`.
- `onToggleTheme` and `isDark` props from `TopNav`.
- Moon/Sun theme button from `TopNav`.
- `qa-platform-theme` storage usage.
- `dark:` Tailwind classes from auth/sidebar surfaces.
- `:root.dark` CSS rule.

### Global Search

Implemented in the frontend using existing API endpoints.

Current behavior:
- Debounced real-time search.
- Results grouped by Projects, Test Plans, Test Suites, Test Cases, Test Runs, Reports, Users, Tags, and Categories.
- Loading, empty, and error states.
- Keyboard entry point via `Ctrl+K` / `Cmd+K`.
- Result navigation:
  - Projects, plans, suites, cases, users, tags, and categories navigate to their module.
  - Test Runs open the execution/report flow through the existing run handler.
  - Completed Test Runs are listed as reports and open the final report flow.

Current data sources:
- `projectsApi.listPage`
- `testPlansApi.listPage`
- `testSuitesApi.listPage`
- `testCasesApi.listPage`
- `testRunsApi.listPage`
- `usersApi.list` for admins only

Future backend recommendation:
- Add `GET /search?q=` returning grouped results with stable target metadata.
- Include target type, target id, display title, subtitle, matched field, and direct navigation intent.
- Add permission filtering server-side so the frontend does not need to know which entities each role may search.

### Notifications

Implemented as a frontend-ready notification layer backed by existing Test Run data.

Current behavior:
- Dropdown with unread indicator.
- Empty state.
- Mark one notification as read.
- Mark all as read.
- Notification navigation to the related Test Run/report.
- Read state persisted per user in local storage.

Current temporary sources:
- Assigned active Test Runs.
- Completed Test Runs.
- Test Runs with failed results when result data is available on the list response.

Future backend recommendation:
- Add persisted `Notification` records linked to user and domain target.
- Suggested fields:
  - `id`
  - `userId`
  - `type`
  - `title`
  - `description`
  - `targetType`
  - `targetId`
  - `readAt`
  - `createdAt`
- Add endpoints:
  - `GET /notifications`
  - `PATCH /notifications/:id/read`
  - `PATCH /notifications/read-all`
- Emit notifications from Test Run assignment, completed execution, failed/critical results, user invites, project updates, and Test Case changes.

### Remaining TopNav Actions

Kept:
- Sidebar toggle: required for mobile navigation.
- Create action: remains conditional and permission-aware for modules that opt into it.
- Notifications: now functional.
- Global search: now functional.
- Profile shortcut: opens the profile page.
- Logout: signs the user out through the auth context.
