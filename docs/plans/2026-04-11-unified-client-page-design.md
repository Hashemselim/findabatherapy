# Unified Client Page Design

## Problem

The client detail page splits into "Client Details" and "Client Portal" — two separate views that force providers to context-switch between internal data and family-facing tools. Information is duplicated (parents vs guardians), forms are always visible before intent, and the layout feels randomly organized.

## Solution

Merge both views into a single tabbed interface with 8 purpose-driven tabs. Eliminate the detail/portal split. Unify parents and guardians into one entity. Move portal configuration to a Settings tab.

## Page Header

Compact single row:
- Client name (text-xl font-semibold)
- Status dropdown (inline badge/select: Inquiry, Active, Waitlist, etc.)
- Action buttons: Email, Call, Add Task (all outline, sm)
- No portal button, no stats, no subtext

## Tabs

1. **Details** — Client info, parents/guardians (with portal invite buttons), locations, insurance, authorizations, clinical info, service info
2. **Notes** — Chronological free-form provider notes with category tags (Session, Call, Admin, Clinical)
3. **My Tasks** — Provider-internal tasks (follow up on auth, call parent, etc.)
4. **Family Tasks** — Family-facing portal tasks (upload doc, complete intake, sign consent)
5. **Documents** — All documents unified: provider shared, family uploads, internal. Visibility controls.
6. **Messages** — Provider → family one-way messages with read tracking
7. **Resources** — Combined resources + connected tools. Links, FAQs, external tools.
8. **Settings** — Portal on/off, invite management (linked to parents), sign-in link, preview, activity log

## Key Design Decisions

### Parents = Guardians (unified)
Parents/guardians in the Details tab ARE the portal guardians. Portal invite is an attribute of a parent record, not a separate entity. "Send portal invite" button appears on each parent card that has an email.

### Portal invites flow
- Primary path: Details → parent card → "Send portal invite"
- Secondary path: Settings → Portal Invites → see eligible parents → send invite
- Both reference the same parent record
- No separate "Add guardian" form in the portal section

### Task separation
- "My Tasks" = provider-internal (what I need to do)
- "Family Tasks" = family-facing (what the family needs to do)
- Clear naming prevents confusion

### Notes as first-class tab
- Free-form chronological feed, newest first
- Category tags: Session, Call, Admin, Clinical
- Provider-internal only, families never see these
- Replaces scattered notes fields across sections

### Resources + Connected Tools merged
- Single tab for all external links, tools, FAQs
- Category tags for organization
- Pinned items first

### Settings consolidates portal config
- Portal on/off toggle
- Invite management (parents with portal status)
- Sign-in link copy
- Preview link
- Activity log (full portal event feed)
