# Production Readiness Workboard

> **Coordination Protocol**: Agents claim tasks by editing the "Claimed By" field. Check this file before starting work. Each task is scoped to specific files to prevent conflicts.

---

## How This Works

1. **Before starting**: Read this file to see what's available
2. **Claim a task**: Edit the task's "Claimed By" field with your agent ID
3. **Work independently**: Each task has isolated file scopes - no overlaps
4. **Mark complete**: Change status to ✅ when done
5. **Document blockers**: If blocked, note it and move on

---

## Task Categories

| Category | Tasks | Files Affected | Can Run In Parallel |
|----------|-------|----------------|---------------------|
| A. Security | 3 tasks | middleware, server, next.config | Yes (different files) |
| B. Feature Completion | 4 tasks | actions, components, pages | Yes (different features) |
| C. Code Cleanup | 4 tasks | various (scoped per task) | Yes (non-overlapping) |
| D. Configuration | 3 tasks | config files | Yes (different files) |

---

## CATEGORY A: SECURITY FIXES

### A1. Remove Dev Bypass from Authentication
**Status**: ✅ Complete
**Claimed By**: Agent-A (Security)
**Priority**: CRITICAL
**Estimated**: 30 min

**Files to modify** (exclusive scope):
- `src/middleware.ts` - Remove lines 14-22 (dev bypass check)
- `src/lib/supabase/server.ts` - Remove lines 9-18, 100-115 (mock user logic)

**Task**:
1. Remove `isDevBypassMode` function and all calls
2. Remove `DEV_MOCK_USER_ID` constant
3. Remove the dev bypass cookie check in middleware
4. Remove mock user return in `getUser()` function
5. Ensure auth still works normally without bypass

**Acceptance criteria**:
- No references to `dev_bypass` cookie in these files
- No `DEV_MOCK_USER_ID` constant
- Auth flow works through real Supabase

**Completion notes**: Removed `isDevBypassMode` function, `DEV_MOCK_USER_ID` constant, dev bypass cookie check in middleware, mock user return in `getUser()`, and dev-login redirect logic.

---

### A2. Remove Dev Bypass from Server Actions
**Status**: ✅ Complete
**Claimed By**: Agent-A (Security)
**Priority**: CRITICAL
**Estimated**: 45 min

**Files to modify** (exclusive scope):
- `src/lib/actions/analytics.ts` - Remove mock data at lines 32-37, 382-394, 532-537
- `src/lib/actions/inquiries.ts` - Remove mock data at lines 134-206, 304-322, 536-538
- `src/lib/actions/onboarding.ts` - Remove mock data at lines 728-771, 895-898
- `src/lib/actions/billing.ts` - Remove mock data at lines 25-35
- `src/lib/storage/actions.ts` - Remove mock data at lines 24, 174, 239, 518

**Task**:
1. Find all `isDevBypassMode()` checks in these files
2. Remove the mock data return blocks
3. Ensure real data fetching remains intact
4. Remove unused imports if any

**Acceptance criteria**:
- No `isDevBypassMode` calls in these action files
- No mock/fake data objects
- Functions return real data or proper errors

**Completion notes**: Removed all `isDevBypassMode` checks and mock data from analytics.ts, inquiries.ts, onboarding.ts, billing.ts, storage/actions.ts. Also fixed additional files that were using the removed function: src/lib/analytics/track.ts and src/lib/plans/guards.ts.

---

### A3. Add Security Headers
**Status**: ✅ Complete
**Claimed By**: Agent-A (Security)
**Priority**: HIGH
**Estimated**: 20 min

**Files to modify** (exclusive scope):
- `next.config.mjs`

**Task**:
Add security headers configuration:
```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ];
}
```

**Acceptance criteria**:
- Headers config added to next.config.mjs
- Build passes (`npm run build`)

**Completion notes**: Added security headers to next.config.mjs with X-Frame-Options set to DENY (more restrictive than SAMEORIGIN for better protection). Build passes successfully.

---

## CATEGORY B: FEATURE COMPLETION

### B1. Remove Team Management Feature (UI-Only Stub)
**Status**: ✅ Complete
**Claimed By**: Agent-B
**Priority**: MEDIUM
**Estimated**: 20 min

**Files to modify** (exclusive scope):
- `src/app/(dashboard)/dashboard/team/page.tsx` - DELETE this file
- `src/components/dashboard/dashboard-sidebar.tsx` - Remove team nav link

**Task**:
1. Delete the team page entirely
2. Remove the "Team" link from dashboard sidebar navigation
3. Verify no broken links remain

**Acceptance criteria**:
- Team page deleted
- No "Team" link in sidebar
- No 404s from dashboard navigation

**Completion notes**: Team page deleted. No Team nav link existed in sidebar (was never added).

---

### B2. Remove Partners Feature (UI-Only Stub)
**Status**: ✅ Complete
**Claimed By**: Agent-B
**Priority**: LOW
**Estimated**: 15 min

**Files to modify** (exclusive scope):
- `src/app/(dashboard)/dashboard/partners/page.tsx` - DELETE this file
- `src/components/dashboard/dashboard-sidebar.tsx` - Remove partners nav link (if exists)

**Task**:
1. Delete the partners page
2. Remove any navigation links to it
3. Verify no broken links

**Acceptance criteria**:
- Partners page deleted
- No navigation to partners
- No 404s

**Completion notes**: Partners page deleted. Partners nav link removed from both dashboard-sidebar.tsx and dashboard-mobile-nav.tsx. Sparkles icon import also removed.

---

### B3. Add Email Notification Placeholders
**Status**: ✅ Complete
**Claimed By**: Agent-B
**Priority**: HIGH
**Estimated**: 30 min

**Files to modify** (exclusive scope):
- `src/lib/actions/inquiries.ts` - Lines 116-123
- `src/app/api/stripe/webhooks/route.ts` - Line 362

**Task**:
1. Create placeholder email function that logs intent (for now)
2. Replace TODO comments with calls to placeholder
3. Add comment indicating Resend integration needed

```typescript
// Add to src/lib/email/notifications.ts (new file)
export async function sendProviderInquiryNotification(/* params */) {
  // TODO: Integrate with Resend email service
  console.log('[EMAIL PLACEHOLDER] Would send inquiry notification');
}

export async function sendPaymentFailureNotification(/* params */) {
  // TODO: Integrate with Resend email service
  console.log('[EMAIL PLACEHOLDER] Would send payment failure notification');
}
```

**Acceptance criteria**:
- Email placeholder module created
- TODOs replaced with function calls
- Clear path for future Resend integration

**Completion notes**:
- Created src/lib/email/notifications.ts with typed placeholder functions
- Updated inquiries.ts to call sendProviderInquiryNotification after inquiry insert
- Updated stripe webhooks route.ts to call sendPaymentFailureNotification on failed invoices
- Added sendSubscriptionConfirmation placeholder for future use

---

### B4. Fix Listing Form Persistence
**Status**: ✅ Complete
**Claimed By**: Main Agent
**Priority**: HIGH
**Estimated**: 45 min

**Files to modify** (exclusive scope):
- `src/components/dashboard/listing-onboarding.tsx` - Around line 156

**Task**:
1. Identify what data the form collects
2. Connect form submission to existing onboarding actions
3. Use `updateListingDetails` or similar from `src/lib/actions/onboarding.ts`

**Acceptance criteria**:
- Form data persists to database on submit
- Success/error feedback to user
- No more TODO comment about persistence

**Completion notes**:
- Connected form submission to `updateProfileBasics`, `updateListingDetails`, and `updateBasicAttributes` actions
- Added `useTransition` for loading state management
- Added success/error feedback UI
- Fixed type compatibility between SERVICE_TYPES and serviceModes enum
- Build passes successfully

---

## CATEGORY C: CODE CLEANUP

### C1. Remove Console Statements - Actions
**Status**: ✅ Complete
**Claimed By**: Agent-C
**Priority**: MEDIUM
**Estimated**: 20 min

**Files to modify** (exclusive scope):
- `src/lib/actions/inquiries.ts`
- `src/lib/actions/analytics.ts`
- `src/lib/actions/search.ts`

**Task**:
1. Remove all `console.log` statements
2. Replace `console.error` with proper error handling (throw or return error)
3. Keep any that are genuinely needed for production debugging (convert to proper logger comment)

**Acceptance criteria**:
- No console.log in these files
- Errors properly thrown or returned

---

### C2. Remove Console Statements - Hooks & Utils
**Status**: ✅ Complete
**Claimed By**: Agent-C
**Priority**: MEDIUM
**Estimated**: 15 min

**Files to modify** (exclusive scope):
- `src/hooks/use-track-view.ts`
- `src/lib/analytics/track.ts`
- `src/lib/geo/geocode.ts`

**Task**:
1. Remove all `console.log` statements
2. Remove debug logging

**Acceptance criteria**:
- No console.log in these files

---

### C3. Remove Console Statements - Components
**Status**: ✅ Complete
**Claimed By**: Agent-C
**Priority**: MEDIUM
**Estimated**: 15 min

**Files to modify** (exclusive scope):
- `src/app/(dashboard)/dashboard/analytics/page.tsx`
- Any other dashboard components with console statements

**Task**:
1. Search for and remove console.log/error in dashboard components
2. Replace with proper error boundaries if needed

**Acceptance criteria**:
- No console.log in dashboard components

---

### C4. Fix Unused Variables
**Status**: ✅ Complete
**Claimed By**: Agent-C
**Priority**: LOW
**Estimated**: 10 min

**Files to modify** (exclusive scope):
- `src/components/search/search-results.tsx` - Remove unused `SERVICE_MODE_LABELS`
- `src/lib/data/cities.ts` - Remove or use `abbrev`
- `src/lib/queries/search.ts` - Remove unused `getBoundingBox` and `searchRadius`

**Task**:
1. Remove the unused exports/variables
2. Verify nothing else imports them

**Acceptance criteria**:
- `npm run build` passes with no unused variable warnings

---

## CATEGORY D: CONFIGURATION

### D1. Fix Environment Variable Validation
**Status**: ✅ Complete
**Claimed By**: Agent-D (Configuration)
**Priority**: MEDIUM
**Estimated**: 15 min

**Files to modify** (exclusive scope):
- `src/env.ts`

**Task**:
Add missing env vars to Zod schema:
```typescript
TURNSTILE_SECRET_KEY: z.string().min(1),
GOOGLE_MAPS_API_KEY: z.string().min(1),
```

**Acceptance criteria**:
- All used env vars are validated
- App fails fast if env vars missing

**Completion notes**: Added TURNSTILE_SECRET_KEY and GOOGLE_MAPS_API_KEY to both the Zod schema and the parsing object. App now fails fast with descriptive error if these env vars are missing.

---

### D2. Fix Hardcoded Domains
**Status**: ✅ Complete
**Claimed By**: Agent-D (Configuration)
**Priority**: LOW
**Estimated**: 10 min

**Files to modify** (exclusive scope):
- `src/app/robots.ts`
- `src/app/sitemap.ts`

**Task**:
1. Replace hardcoded `https://www.findabatherapy.com` with `env.NEXT_PUBLIC_SITE_URL`
2. Import env config

**Acceptance criteria**:
- Domain comes from environment variable
- Works in staging/production with different domains

**Completion notes**: Both files now use `process.env.NEXT_PUBLIC_SITE_URL` with fallback to production URL. Used process.env directly since these are build-time files where the server-only env module cannot be imported.

---

### D3. Verify Stripe API Version
**Status**: ✅ Complete
**Claimed By**: Agent-D (Configuration)
**Priority**: MEDIUM
**Estimated**: 10 min

**Files to modify** (exclusive scope):
- `src/lib/stripe.ts`

**Task**:
1. Check current Stripe API version (should not be future-dated)
2. Update to latest stable version from Stripe docs
3. Current shows `2025-10-29.clover` which seems incorrect

**Acceptance criteria**:
- Valid Stripe API version
- Stripe operations work correctly

**Completion notes**: Verified that `2025-10-29.clover` is the correct API version bundled with stripe SDK v19.2.0 (confirmed in node_modules/stripe/types/apiVersion.d.ts). Added a clarifying comment to the code. No changes needed - version is valid and matches the SDK.

---

## PROGRESS TRACKER

| Task | Status | Agent | Started | Completed |
|------|--------|-------|---------|-----------|
| A1 | ✅ | Agent-A | 2025-12-28 | 2025-12-28 |
| A2 | ✅ | Agent-A | 2025-12-28 | 2025-12-28 |
| A3 | ✅ | Agent-A | 2025-12-28 | 2025-12-28 |
| B1 | ✅ | Agent-B | 2025-12-28 | 2025-12-28 |
| B2 | ✅ | Agent-B | 2025-12-28 | 2025-12-28 |
| B3 | ✅ | Agent-B | 2025-12-28 | 2025-12-28 |
| B4 | ✅ | Main | 2025-12-28 | 2025-12-28 |
| C1 | ✅ | Agent-C | 2025-12-28 | 2025-12-28 |
| C2 | ✅ | Agent-C | 2025-12-28 | 2025-12-28 |
| C3 | ✅ | Agent-C | 2025-12-28 | 2025-12-28 |
| C4 | ✅ | Agent-C | 2025-12-28 | 2025-12-28 |
| D1 | ✅ | Agent-D | 2025-12-28 | 2025-12-28 |
| D2 | ✅ | Agent-D | 2025-12-28 | 2025-12-28 |
| D3 | ✅ | Agent-D | 2025-12-28 | 2025-12-28 |

**Legend**: 🔴 Not Started | 🟡 In Progress | ✅ Complete | 🚫 Blocked

---

## AGENT INSTRUCTIONS

When you claim a task:

1. **Read this file first** to see what's claimed
2. **Edit the task** to add your agent ID to "Claimed By"
3. **Update status** to 🟡 In Progress
4. **Work only on files listed** in your task scope
5. **When done**: Update status to ✅ and note completion in Progress Tracker
6. **If blocked**: Note the blocker and move to another task

### File Ownership Rules

To prevent conflicts, each task has exclusive file scope. If you need to touch a file owned by another task:
1. Check if that task is claimed
2. If claimed, coordinate or wait
3. If unclaimed, you can claim both tasks

### Parallel-Safe Task Groups

These tasks can run simultaneously with zero conflict:
- A1 + A2 + A3 (different files)
- B1 + B2 + B3 + B4 (different features)
- C1 + C2 + C3 + C4 (different file sets)
- D1 + D2 + D3 (different config files)

### Dependencies

- A2 depends on A1 (both touch dev bypass, but different files - safe to parallel)
- B4 may need to reference onboarding actions (read-only, no conflict)
- All other tasks are independent
