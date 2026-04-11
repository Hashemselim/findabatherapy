# Unified Client Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the "Client Details" and "Client Portal" split into a single 8-tab client page: Details, Notes, My Tasks, Family Tasks, Documents, Messages, Resources, Settings.

**Architecture:** Decompose the 1,800-line `client-full-detail.tsx` monolith into a slim coordinator (~100 lines) with 8 tab components. Create a `client_notes` table for the new Notes tab. Unify parents and portal guardians so portal invites are a property of a parent record. Reuse existing portal tab components (portal-tasks-tab, portal-messages-tab, etc.) with minor adaptations.

**Tech Stack:** Next.js 15, React, TypeScript, shadcn/ui (Tabs, Dialog, Card, Button, Select, Badge, AlertDialog), Tailwind CSS, Supabase, sonner (toast)

---

## Phase 1: Database — Client Notes Table

### Task 1: Create client_notes migration

**Files:**
- Create: `supabase/migrations/069_create_client_notes.sql`

**Step 1: Write the migration**

```sql
-- Create client_notes table for provider-internal session/progress notes
create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default 'general' check (category in ('session', 'call', 'admin', 'clinical', 'general')),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for querying notes by client
create index idx_client_notes_client_id on public.client_notes(client_id);
create index idx_client_notes_created_at on public.client_notes(client_id, created_at desc);

-- RLS
alter table public.client_notes enable row level security;

create policy "Users can manage notes for their clients"
  on public.client_notes
  for all
  using (
    profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  )
  with check (
    profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  );
```

**Step 2: Apply migration**

Run: `npx supabase db push` (or apply via Supabase dashboard for remote)

**Step 3: Commit**

```bash
git add supabase/migrations/069_create_client_notes.sql
git commit -m "feat: add client_notes table for provider session notes"
```

---

### Task 2: Create client notes server actions

**Files:**
- Create: `src/lib/actions/client-notes.ts`

Create CRUD server actions for client notes:

```typescript
"use server";

// Types
export interface ClientNote {
  id: string;
  clientId: string;
  profileId: string;
  category: "session" | "call" | "admin" | "clinical" | "general";
  body: string;
  createdAt: string;
  updatedAt: string;
  authorName?: string;
}

// Actions:
// getClientNotes(clientId: string) -> ActionResult<ClientNote[]>
// addClientNote(input: { clientId, category, body }) -> ActionResult<ClientNote>
// updateClientNote(noteId: string, input: { category?, body? }) -> ActionResult<ClientNote>
// deleteClientNote(noteId: string) -> ActionResult<void>
```

Follow the existing pattern in `src/lib/actions/clients.ts`:
- Use `createSupabaseServerClient()` from `@/lib/supabase/server`
- Use `getCurrentUser()` from `@/lib/platform/auth/server`
- Return `ActionResult<T>` pattern: `{ success: true, data } | { success: false, error }`
- Join with profiles table to get authorName
- Order by created_at desc

**Step 1: Write the server actions file**

Read `src/lib/actions/clients.ts` for the exact import pattern and Supabase client usage. Create `src/lib/actions/client-notes.ts` with all 4 CRUD actions.

**Step 2: Commit**

```bash
git add src/lib/actions/client-notes.ts
git commit -m "feat: add client notes CRUD server actions"
```

---

## Phase 2: Unified Page Coordinator

### Task 3: Rewrite client-full-detail.tsx as slim coordinator

**Files:**
- Modify: `src/app/(dashboard)/dashboard/clients/[id]/client-full-detail.tsx`
- Modify: `src/app/(dashboard)/dashboard/clients/[id]/page.tsx`

This is the core refactor. Replace the 1,800-line file with a ~120-line coordinator that:

1. Renders the compact page header (name + status + 3 action buttons)
2. Renders a `Tabs` component with 8 tabs
3. Each `TabsContent` delegates to a sub-component
4. Manages only `activeTab` state and `clientStatus` state

**The page header should be:**
```
← Back to Clients

  Hashem Selim          [Active ▾]     [✉ Email] [📞 Call] [+ Add Task]
```

- Use `DashboardTabsList` + `DashboardTabsTrigger` for the tab bar (from `@/components/dashboard/ui`)
- Import and render each tab component
- Pass `client`, `portalData`, and `notes` as props to relevant tabs

**Update page.tsx** to also fetch client notes:
- Add `getClientNotes(resolvedParams.id)` to the Promise.all
- Pass notes to ClientFullDetail

**Step 1: Read the full current file to understand all state, helpers, and dialogs**

Read `client-full-detail.tsx` completely. Note every piece of state, every helper function, and every dialog.

**Step 2: Write the new slim coordinator**

The coordinator should:
- Keep: `CopyButton`, `Field`, `FullWidthField`, `EmptyState`, `SectionHeader` helper components (move to a shared file or keep inline)
- Keep: `DashboardPageHeader` for the top
- Remove: `activeSection` toggle (no more details/portal split)
- Remove: All 10 section card JSX blocks (move to DetailsTab component)
- Remove: All portal-related rendering (handled by tab components)
- Add: Tabs with 8 tab triggers

**Step 3: Commit**

```bash
git commit -m "feat: rewrite client page as unified 8-tab coordinator"
```

---

## Phase 3: Extract Detail Sections into Tab Components

### Task 4: Create shared helpers file

**Files:**
- Create: `src/app/(dashboard)/dashboard/clients/[id]/client-detail-helpers.tsx`

Extract from the current `client-full-detail.tsx`:
- `SectionHeader` component
- `Field` component
- `FullWidthField` component
- `EmptyState` component
- `CopyButton` component
- `getOptionLabel` helper
- `EMAIL_PROVIDER_OPTIONS` constant
- `CLIENT_STATUS_OPTIONS` constant (if it exists inline)

These are used by multiple tabs.

**Step 1: Create the helpers file with all shared components**
**Step 2: Update coordinator imports to use the helpers file**
**Step 3: Commit**

```bash
git commit -m "refactor: extract shared detail helpers to separate file"
```

---

### Task 5: Create DetailsTab component

**Files:**
- Create: `src/app/(dashboard)/dashboard/clients/[id]/tabs/details-tab.tsx`

Move sections 1-5 and 7-8 from the old `client-full-detail.tsx`:
1. Client Information
2. Parents / Guardians (with portal invite button per parent)
3. Locations
4. Insurance
5. Authorizations
7. Clinical Information
8. Service Information (without the general notes field — that moves to Notes tab)

**Props:** `{ client: ClientDetail; portalData: ClientPortalData | null }`

For the Parents/Guardians section, add a "Send portal invite" button to each parent card that has an email. The button:
- Shows "Invite to portal" if not yet invited
- Shows "Invited" badge if already invited (check portalData.guardians for matching email)
- Calls `sendPortalGuardianMagicLink` on click with toast feedback
- Uses the existing guardian ID lookup from portalData

This tab manages its own dialog states for all the edit dialogs (ChildInfoEditDialog, ParentEditDialog, InsuranceEditDialog, LocationEditDialog, ClinicalInfoEditDialog, StatusEditDialog, AddAuthorizationDialog, EditAuthorizationDialog, AlertDialog for deletes).

**Step 1: Create the details tab file, moving all section JSX and dialog state**
**Step 2: Update coordinator to render DetailsTab in the Details TabsContent**
**Step 3: Verify types compile: `npx tsc --noEmit`**
**Step 4: Commit**

```bash
git commit -m "feat: extract Details tab with portal invite on parent cards"
```

---

### Task 6: Create NotesTab component

**Files:**
- Create: `src/app/(dashboard)/dashboard/clients/[id]/tabs/notes-tab.tsx`
- Create: `src/app/(dashboard)/dashboard/clients/[id]/tabs/dialogs/note-dialog.tsx`

**NotesTab:** Chronological feed of provider notes, newest first.

Layout:
- Top bar: "Notes" heading + count badge + "+ Add note" button
- List: `DashboardCard` containing `divide-y` rows
- Each row: category badge (Session/Call/Admin/Clinical/General), body text, timestamp, author name, edit/delete buttons
- Empty state: `DashboardEmptyState` with StickyNote icon

**NoteDialog:** Create/edit note dialog.
- Category select (5 options)
- Body textarea (6 rows)
- Save button calls `addClientNote` or `updateClientNote`

**Props:** `{ clientId: string; notes: ClientNote[] }`

**Step 1: Create the note dialog**
**Step 2: Create the notes tab with list + empty state + dialog wiring**
**Step 3: Update coordinator to pass notes data and render NotesTab**
**Step 4: Commit**

```bash
git commit -m "feat: add Notes tab with chronological provider notes"
```

---

### Task 7: Create MyTasksTab component

**Files:**
- Create: `src/app/(dashboard)/dashboard/clients/[id]/tabs/my-tasks-tab.tsx`

Move the Tasks section (section 6, lines 1112-1287) from client-full-detail into its own tab.

Layout:
- Top bar: "My Tasks" heading + active count badge + "+ Add task" button
- Active tasks list (pending + in_progress) with status dropdown, due date, content
- Completed tasks section below (collapsible or just lower opacity)
- Uses existing `TaskFormDialog` for create/edit

**Props:** `{ client: ClientDetail }`

Reuse the exact same task rendering logic from the current section 6 — just lift it into its own component.

**Step 1: Create the my-tasks tab**
**Step 2: Update coordinator**
**Step 3: Commit**

```bash
git commit -m "feat: extract My Tasks tab from client detail"
```

---

### Task 8: Adapt FamilyTasksTab

**Files:**
- Modify: `src/components/client-portal/portal-tasks-tab.tsx` (minor — just rename heading)

The existing `PortalTasksTab` already works perfectly for this. Just:
- Change heading from "Tasks" to "Family Tasks"
- Ensure it renders in the new coordinator

**Step 1: Update the heading text**
**Step 2: Wire into coordinator**
**Step 3: Commit**

```bash
git commit -m "feat: adapt portal tasks tab as Family Tasks"
```

---

### Task 9: Create unified DocumentsTab

**Files:**
- Create: `src/app/(dashboard)/dashboard/clients/[id]/tabs/documents-tab.tsx`

Merge the client detail Documents section (lines 1369-1601) with the portal DocumentsTab. Show all documents in one unified view:

- Top bar: "Documents" heading + count + "+ Upload" button
- Sections: "Shared with family" / "Family uploads" / "Internal"
- Each document card: label, type badge, source badge, visibility, ack status
- Uses existing `DocumentEditDialog` for uploads
- Uses portal `savePortalDocumentShare` for visibility toggles

**Props:** `{ client: ClientDetail; portalData: ClientPortalData | null }`

Combine document lists from both sources:
- `client.documents` — internal documents
- `portalData.documents` — portal-visible documents
- Deduplicate by ID (same doc may appear in both)

**Step 1: Create the unified documents tab**
**Step 2: Wire into coordinator**
**Step 3: Commit**

```bash
git commit -m "feat: create unified Documents tab merging detail and portal docs"
```

---

### Task 10: Adapt MessagesTab

**Files:**
- Minimal changes to `src/components/client-portal/portal-messages-tab.tsx`

The existing portal messages tab works as-is. Just wire it into the coordinator.

**Step 1: Wire into coordinator**
**Step 2: Commit**

```bash
git commit -m "feat: wire Messages tab into unified client page"
```

---

### Task 11: Create unified ResourcesTab

**Files:**
- Create: `src/app/(dashboard)/dashboard/clients/[id]/tabs/resources-tab.tsx`

Merge Resources + Connected Tools from the portal into one tab. Use the existing portal server actions (`savePortalResource`, `savePortalTool`, `deletePortalResource`, `deletePortalTool`).

Layout:
- Top bar: "Resources" heading + count + "+ Add" button
- Grid of cards (lg:grid-cols-2)
- Each card: title, description, URL link, optional "when to use" note, category badge
- Edit/delete with AlertDialog

Combine `portalData.resources` and `portalData.connectedTools` into a single list, distinguishing by a "type" field or just treating them uniformly.

**Step 1: Create the resources tab**
**Step 2: Wire into coordinator**
**Step 3: Commit**

```bash
git commit -m "feat: create unified Resources tab merging resources and tools"
```

---

### Task 12: Create SettingsTab

**Files:**
- Create: `src/app/(dashboard)/dashboard/clients/[id]/tabs/settings-tab.tsx`

Settings tab contains portal configuration + history:

**Sections:**

1. **Portal Status** — on/off toggle with status indicator
   - Switch component
   - Calls `setClientPortalEnabled` on toggle
   - Toast feedback

2. **Portal Invites** — list of parents from `client.parents` with their portal access status
   - Each row: parent name, email, relationship, portal status badge (Not invited / Invited / Active / Revoked)
   - Match parents to `portalData.guardians` by email to determine status
   - "Send invite" / "Resend" buttons
   - Calls `sendPortalGuardianMagicLink`

3. **Sign-in Link** — copy button
   - Calls `getPortalGuardianSignInPageLink`
   - Clipboard + toast

4. **Preview** — link to preview the family portal
   - Simple `Link` to `/dashboard/clients/${clientId}/portal/preview`

5. **Activity Log** — full activity feed from `portalData.activity`
   - Reuse the `divide-y` list pattern from portal-activity-tab
   - Show all items chronologically

**Props:** `{ client: ClientDetail; portalData: ClientPortalData | null }`

**Step 1: Create the settings tab**
**Step 2: Wire into coordinator**
**Step 3: Commit**

```bash
git commit -m "feat: create Settings tab with portal config and activity log"
```

---

## Phase 4: Cleanup and Polish

### Task 13: Remove old portal tab components that are no longer needed

**Files to potentially remove or simplify:**
- `src/components/client-portal/portal-overview-tab.tsx` — replaced by Overview content in other tabs
- `src/components/client-portal/portal-guardians-tab.tsx` — replaced by Settings tab invite section + Details tab parent cards
- `src/components/client-portal/portal-documents-tab.tsx` — replaced by unified Documents tab
- `src/components/client-portal/portal-resources-tab.tsx` — replaced by unified Resources tab
- `src/components/client-portal/portal-tools-tab.tsx` — merged into Resources tab
- `src/components/client-portal/portal-activity-tab.tsx` — moved to Settings tab
- `src/components/client-portal/portal-header.tsx` — no longer needed (unified header)
- `src/components/client-portal/client-portal-manager.tsx` — no longer used as coordinator

Keep:
- `portal-tasks-tab.tsx` — used as Family Tasks tab
- `portal-messages-tab.tsx` — used as Messages tab
- All `dialogs/*` — still used
- `portal-constants.ts` and `portal-utils.ts` — still used
- `public-client-portal.tsx` and family-facing components — unchanged

**Step 1: Remove unused portal components**
**Step 2: Update any remaining imports**
**Step 3: Commit**

```bash
git commit -m "refactor: remove unused portal tab components"
```

---

### Task 14: Verify everything compiles and lint

**Step 1:** Run `npx tsc --noEmit` — fix any type errors
**Step 2:** Run `npm run lint` — fix any lint warnings
**Step 3:** Run `npm run build 2>&1 | tail -100` — verify build succeeds
**Step 4:** Commit any fixes

```bash
git commit -m "fix: resolve type and lint issues from unified page refactor"
```

---

### Task 15: Visual verification

**Step 1:** Start dev server: `preview_start` with `next-dev-webpack`
**Step 2:** Log in as test user
**Step 3:** Navigate to client detail page
**Step 4:** Screenshot and verify each of the 8 tabs
**Step 5:** Test responsive layout at mobile width
**Step 6:** Test dialog opens (add note, create task, etc.)

---

## Key Implementation Notes

### Parent ↔ Guardian Unification
When rendering parents in the Details tab, look up their portal status:
```typescript
const guardianForParent = portalData?.guardians.find(g => g.email === parent.email);
const portalStatus = guardianForParent?.accessStatus ?? "not_invited";
```

### Tab Component Props Pattern
Each tab component should follow:
```typescript
interface XxxTabProps {
  client: ClientDetail;
  portalData: ClientPortalData | null;
  // ... tab-specific data
}
```

### Reusable Imports
All tab components should import from:
- `@/components/dashboard/ui` — DashboardCard, DashboardStatusBadge, DashboardEmptyState, DashboardTabsList, DashboardTabsTrigger
- `@/components/ui/*` — shadcn components
- `../client-detail-helpers` — Field, SectionHeader, etc.
- `sonner` — toast

### Dialog Pattern
Each tab manages its own dialog state locally:
```typescript
const [dialogOpen, setDialogOpen] = useState(false);
const [editingItem, setEditingItem] = useState<ItemType | undefined>();
```
