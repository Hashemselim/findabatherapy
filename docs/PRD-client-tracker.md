# Product Requirements Document: Client Tracker Feature

## Overview

A comprehensive client/patient management system for ABA therapy providers, enabling them to track clients from initial inquiry through active treatment and discharge.

## Problem Statement

ABA therapy providers need a centralized system to manage their client caseload, including:
- Tracking client intake and onboarding progress
- Managing parent/guardian contact information
- Monitoring insurance and authorization status
- Organizing service locations
- Managing tasks and follow-ups
- Converting inquiries into clients

## Target Users

- ABA therapy practice owners and administrators
- Clinical directors
- Office managers
- Intake coordinators

## Feature Requirements

### 1. Client Database

#### 1.1 Client Record Structure
- **One child per client record** (simplifies data model and matches real-world workflow)
- Child information: name, DOB, diagnosis, primary concerns, ABA history, school info, pediatrician
- Status workflow: Inquiry → Intake Pending → Waitlist → Assessment → Active → On Hold → Discharged
- Funding source tracking (insurance, regional center, school district, private pay, Medicaid waiver)
- Referral source and date tracking
- Service start date
- Preferred language
- General notes

#### 1.2 Related Entities
- **Parents/Guardians**: Multiple per client, with primary designation, contact info, relationship type
- **Locations**: Service delivery addresses with Google Places autocomplete
- **Insurance**: Multiple policies per client, with member ID, group number, coverage dates
- **Authorizations**: Service authorizations with units tracking, expiration alerts
- **Documents**: File attachments with type categorization
- **Tasks**: Simple task list per client (no assignment, just title/content/due date/status)

### 2. Client List Page (`/dashboard/clients`)

#### 2.1 Features
- Search by child name, parent name, phone, email
- Filter by status (tabs: All, Potential, Intake Pending, Waitlist, Active, On Hold, Discharged)
- Sort by name, status, referral date, service start date
- Pagination with configurable page size
- Row click opens detail panel

#### 2.2 Table Columns
- Child name
- Status badge
- Parent name (primary)
- Phone
- Referral date
- Actions (view, edit, delete)

### 3. Client Detail Page (`/dashboard/clients/[id]`)

#### 3.1 Layout
- Full-width sections with multi-column field grids (responsive 2-4 columns)
- Sections ordered by importance/frequency of use
- Every field is copyable on hover

#### 3.2 Sections (in order)
1. **Child Information** - Name, DOB, age, school, diagnosis, concerns, history
2. **Parents/Guardians** - Contact cards with phone, email, relationship
3. **Status & Service Info** - Status badge, referral info, funding source, notes
4. **Insurance** - Insurance cards with member ID, coverage dates
5. **Authorizations** - Auth cards with units tracking, expiration alerts
6. **Service Locations** - Address cards with edit/delete
7. **Tasks** - Checkbox list with pending/completed sections
8. **Documents** - File list with download links

### 4. Client Edit Page (`/dashboard/clients/[id]/edit`)

#### 4.1 Form Structure
- Collapsible sections matching detail page
- Repeatable field arrays for parents, locations, insurances
- Google Places autocomplete for addresses
- Multi-select for diagnosis (from predefined list)
- Save button with loading state

#### 4.2 Supported Operations
- Update client core fields
- Add/update/remove parents
- Add/update/remove locations
- Add/update/remove insurances

### 5. New Client Form (`/dashboard/clients/new`)

#### 5.1 Features
- Same form as edit page but in create mode
- Optional prefill from inquiry conversion
- Redirects to detail page on success

### 6. Inquiry to Client Conversion

#### 6.1 Flow
1. User clicks "Convert to Client" on inquiry in inbox
2. System extracts data from inquiry (name, phone, email, message)
3. Opens new client form with prefilled data
4. On save, marks inquiry as "converted" and links to client

### 7. Global Tasks Page (`/dashboard/tasks`)

#### 7.1 Features
- Shows all tasks across all clients
- Filter by status (All, Pending, Completed)
- Each task links to its client
- Mark complete, delete actions
- Due date badges with color coding

### 8. Public Client Intake Form (`/intake/[slug]/client`)

#### 8.1 Features
- Branded with provider logo and colors
- Turnstile CAPTCHA protection
- Creates client with "intake_pending" status

#### 8.2 Fields (platform-controlled, not customizable)
- Parent: first name, last name, phone, email, relationship
- Child: first name, last name, DOB, diagnosis (multi-select), primary concerns
- Insurance: name, member ID
- Location: city, state
- Notes

#### 8.3 Access Control
- Only available to premium subscribers
- Must have `client_intake_enabled` flag set on listing
- Inherits branding from intake form settings

## Database Schema

### Tables
- `clients` - Core client record
- `client_parents` - Parent/guardian contacts
- `client_locations` - Service delivery addresses
- `client_insurances` - Insurance policies
- `client_authorizations` - Service authorizations
- `client_documents` - File attachments
- `client_tasks` - Task items
- `client_contacts` - Additional contacts (future use)

### Key Design Decisions
- Soft deletes via `deleted_at` timestamp
- Row-level security for tenant isolation via `profile_id`
- All tables have `sort_order` for manual ordering
- Foreign keys to `clients` table with cascade delete

## Security & Privacy

- All client data protected by Supabase Row-Level Security
- Users can only access clients belonging to their profile
- Public intake form uses admin client for inserts
- Turnstile verification prevents spam submissions
- No PII exposed in URLs

## Navigation

- **Sidebar**: Team & CRM section
  - Clients (link to list page)
  - Tasks (link to global tasks page)

## Future Considerations (Out of Scope)

- Task assignment to staff members
- Multi-child client records
- Custom intake form fields
- Document upload (currently URL-based)
- Authorization unit scheduling
- Insurance verification integration
- Billing/invoicing integration

## Success Metrics

- Time to convert inquiry to client
- Client record completion rate
- Task completion rate
- Authorization expiration tracking effectiveness

## Implementation Status

### Completed
- [x] Database migration with all tables and RLS policies
- [x] Zod validation schemas
- [x] Server actions for full CRUD
- [x] Client list page with search/filter/sort
- [x] Client detail page with copyable fields
- [x] Client edit page
- [x] New client form
- [x] Inquiry to client conversion
- [x] Global tasks page
- [x] Public client intake form
- [x] Navigation links in sidebar

### Deployed
- Production: findabatherapy.org / findabajobs.org
- Database migration applied to Supabase
