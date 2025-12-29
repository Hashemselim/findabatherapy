Great, let’s focus the PRD exactly on those three things and tie it to what you already have.

⸻

PRD – Pricing Page, Onboarding Flow, and Employer Dashboard

for FindABATherapy.org

1. Objectives
	1.	Pricing Page
Increase conversion from anonymous visitor → account creation, and from high-intent visitor → paid plan selection, without hurting Free signups.
	2.	Onboarding Flow
Design a clear, low-friction flow that:
	•	Maximizes “Get listed” completions (at least on Free).
	•	Surfaces plan choice and payment at a high-intent moment.
	•	Avoids double entry and confusion.
	3.	Employer Dashboard
Define:
	•	First-time “onboarding state” for new providers.
	•	Ongoing “normal state” for returning providers.
	•	Where and how upgrades are promoted.

Assumptions:
	•	Plans: Free, Pro, Enterprise exactly as in your current pricing cards.
	•	Tech: Supabase auth, Stripe for payments, ShadCN + Tailwind frontend.

⸻

2. Pricing Page – Changes for High Conversion

2.1 Scope

This applies to:
	•	Provider-facing landing page that currently includes: hero, pricing cards, benefits, testimonials, steps, FAQ, final CTA.
	•	Any dedicated /pricing route that reuses the same pricing cards.

2.2 Required Changes

2.2.1 Hero Area
Goals:
	•	Hero should primarily sell the outcome and push “Get listed free”.
	•	Pricing should be visible but secondary.

Requirements:
	1.	Primary CTA is always account creation, not plan selection.
	•	Button label:
	•	“Get listed free” (keep as-is, but ensure it always routes to onboarding Step 1).
	•	Add microcopy underneath CTA:
	•	“Free plan available. No credit card required to start.”
	2.	Secondary CTA: “View pricing”
	•	Either scrolls to pricing section or navigates to /pricing.
	•	For high-intent visitors who want to compare plans first.
	3.	Above-the-fold trust elements:
	•	Keep/strengthen stats (e.g., “50K+ monthly visitors”, “500+ ABA providers”).
	•	Keep “Set up in under X minutes” element to reinforce low friction.

2.2.2 Pricing Cards Section
You already have Free / Pro / Enterprise cards. Adjust for conversion:
	1.	Align CTAs across all three cards
	•	Free card: “Get Found Free”
	•	Pro card: “Get Found Faster”
	•	Enterprise card: “Get Found Everywhere”
	•	All three should route to the same onboarding flow (Step 1: account creation), with:
	•	intended_plan = Free/Pro/Enterprise saved for later pre-selection.
	2.	Clarify “no risk”
	•	Under Pro and Enterprise price, add:
	•	“Cancel anytime. No long-term contract.”
	3.	Tighten feature bullets to outcomes
	•	Keep the bullets you already have, but:
	•	Reorder so outcomes lead:
	•	e.g., Pro: “Priority search placement”, “Direct contact form”, “Photo gallery and video”.
	•	Put more abstract things (Premium profile, Extended list) under those.
	4.	Social proof near pricing
	•	Immediately under cards, add a small testimonial strip:
	•	One short quote from an ABA provider + name/location.
	•	This keeps high-intent visitors on the page and reassures them.
	5.	FAQ alignment
	•	In FAQ section, ensure you explicitly answer:
	•	“Can I start on Free and upgrade later?”
	•	“Is there a contract?”
	•	“How quickly does my listing go live?”
	•	This addresses the main friction points at the pricing decision moment.
	6.	Tracking
	•	Instrument separate click events:
	•	pricing_cta_clicked with properties:
	•	plan_selected (Free / Pro / Enterprise)
	•	placement (hero, pricing_cards, footer_cta)
	•	This lets you compare how many people click each plan but all still go into one funnel.

⸻

3. Onboarding Flows – Steps & Screens

3.1 Entry Points

All of these should lead into the same multi-step onboarding flow:
	•	Hero CTA: “Get listed free”
	•	Default intended_plan = Free.
	•	Pricing card buttons:
	•	Set intended_plan based on card clicked.
	•	Footer / secondary CTAs:
	•	Default intended_plan = Free.

3.2 Flow Overview
	1.	Step 1: Create Account
	2.	Step 2: Basic Practice Details
	3.	Step 3: Plan Selection (“Your listing is ready”)
	4.	Step 4: Payment (for Pro/Enterprise)
	5.	Step 5: Confirmation + first-time dashboard

3.2.1 Step 1 – Create Account
Screen: “Create your provider account”

Fields / UI:
	•	Buttons:
	•	“Continue with Google”
	•	“Continue with Microsoft”
	•	Divider: “or sign up with email”
	•	Email input
	•	Password input
	•	Checkbox: “I agree to the Terms & Privacy Policy”
	•	Primary button: “Continue”

Logic:
	•	On success: create user and provider records in Supabase.
	•	Save intended_plan from entry source on provider record.
	•	Redirect to Step 2.

3.2.2 Step 2 – Basic Practice Details
Screen: “Tell us about your ABA practice”

Goal: Capture the minimum viable data for a usable Free listing (and a good preview).

Required core fields (from your current design):
	•	Practice name
	•	Tagline (optional but recommended)
	•	Primary state
	•	Primary location (city/state or address)
	•	Phone
	•	Email
	•	Website
	•	Services (a basic multi-select; Free gets “Standard service list”)
	•	Insurances (chips)
	•	Short “About” text

Plan-dependent fields at this step:
	•	For MVP and simplicity, do not gate fields here yet.
Keep this step focused on basics that apply to all plans.
	•	Pro/Enterprise-only extras (extended services, ages served, specialties, languages, photos, video) can be completed from the dashboard post-upgrade.
	•	Reason: less cognitive load = more completions.

UX:
	•	Progress indicator:
	•	“Step 2 of 3 – Practice details”
	•	Primary action: “Continue”

Validation:
	•	All required fields must pass client + server validation before moving to Step 3.

3.2.3 Step 3 – Plan Selection (“Your listing is ready”)
Screen: “Your listing is ready to go live”

Layout:
	•	Left / top: Preview of Free listing
	•	Show card similar to how it appears in search: name, location, services, insurances, “Visit website”, etc.
	•	Right / below: Plan selection cards
	•	Same Free / Pro / Enterprise cards used on pricing page, but:
	•	Pre-select card based on intended_plan.
	•	Mark Pro as “Most Popular”.

Buttons behaviour:
	•	For whichever card is selected:
	•	If Free is selected:
	•	Primary CTA: “Continue with Free Listing”
	•	On click:
	•	Set plan_type = FREE
	•	listing_status = live
	•	Redirect → Step 5 (confirmation).
	•	If Pro or Enterprise is selected:
	•	Primary CTA: “Upgrade & Go Live”
	•	On click:
	•	Redirect to Stripe Checkout with correct plan.
	•	Regardless of selection:
	•	A subtle secondary text link:
	•	“Continue with Free listing for now” (visible when Pro/Enterprise is selected).
	•	For visitors who change their mind at the last minute.

3.2.4 Step 4 – Payment (Stripe Checkout)
Only for Pro / Enterprise selection.

Flow:
	•	User lands on Stripe Checkout with:
	•	Plan (Pro or Enterprise)
	•	Billing period (monthly by default; optional toggle for annual if/when you support it).
	•	On successful payment (Stripe webhook + redirect back):
	•	Set plan_type appropriately.
	•	Set listing_status = live.
	•	Redirect to Step 5 (confirmation).
	•	On cancel / failure:
	•	Redirect back to Step 3 with error:
	•	“We weren’t able to complete your payment. You can try again or continue with a Free listing for now.”

3.2.5 Step 5 – Confirmation & First Dashboard Access
Screen: “[Plan] listing is live”

Content:
	•	Hero text:
	•	If Free: “Your listing is live on Find ABA Therapy.”
	•	If Pro: “Your Pro listing is live and ready to be discovered.”
	•	If Enterprise: “Your Enterprise listing is live across all locations.”
	•	Buttons:
	•	Primary: “Go to dashboard”
	•	Secondary: “View your public listing”

Optional (good idea):
	•	For Free: callout:
	•	“Add photos, a contact form, and more details by upgrading to Pro later.”

⸻

4. Employer (Provider) Dashboard

4.1 Two States

Yes, there should be distinct states:
	1.	Onboarding state (first sessions after sign-up):
	•	Focuses on helping them fully complete their profile.
	•	Shows checklist/progress.
	2.	Post-onboarding (regular use) state:
	•	Focuses on status, visibility, and upgrades.

4.2 Navigation Structure

Sidebar (example):
	•	Overview
	•	Profile & Details
	•	Locations
	•	Media (Photos & Video)
	•	Messages (if you later surface contact form leads)
	•	Plan & Billing
	•	Featured Partners
	•	Logout

4.3 Onboarding State (First-time)

Trigger:
	•	First time the user hits the dashboard, or until they complete a configured checklist threshold.

Overview screen content:
	•	Header:
	•	“[Practice Name], welcome to your provider dashboard.”
	•	Checklist card (progress indicator), e.g.:
	•	Add your services and insurances
	•	Confirm your location and contact info
	•	(Pro/Enterprise only) Add photos or video
	•	View your public listing
	•	Each checklist item links to relevant section.
	•	For Free plan:
	•	Prominent but not aggressive Pro upsell below checklist:
	•	“Boost your profile with Pro: priority search placement, direct contact form, and rich media.”

Exit condition:
	•	When they complete key items (e.g., profile 80% complete) or after X sessions, switch them to “regular” Overview state.

4.4 Regular Dashboard State

Overview screen:
	•	Top summary:
	•	Plan badge (Free / Pro / Enterprise).
	•	Status: “Your listing is live.”
	•	Primary buttons:
	•	“View your public listing”
	•	If Free: “Upgrade to Pro” CTA.
	•	Metrics (v2+ but design around future):
	•	Views in last 30 days
	•	Contact form submissions (for Pro/Enterprise)
	•	Clicks to website
	•	For Free users:
	•	Banner:
	•	“Pro providers unlock direct contact forms, richer profiles, and more visibility.”
	•	Button: “See Pro benefits” → Plan & Billing or upgrade modal.

4.5 Key Sections

4.5.1 Profile & Details
	•	Edit:
	•	Name, tagline, About text
	•	Services (standard + extended)
	•	Insurances
	•	Ages served, diagnoses, specialties, languages

Gating:
	•	For Free:
	•	Show extended tiles (ages, diagnoses, specialties, languages) as:
	•	visible but non-editable with lock + “Upgrade to Pro to add more details families care about.”
	•	For Pro/Enterprise:
	•	All editable.

4.5.2 Locations
	•	For Free:
	•	Only 1 location allowed.
	•	Attempt to add another → upgrade prompt.
	•	For Pro:
	•	Up to 5 locations.
	•	For Enterprise:
	•	Unlimited.

4.5.3 Media (Photos & Video)
	•	For Free:
	•	Entire section is shown with a lock and clear explanation:
	•	“Add a photo gallery and video walkthrough with Pro.”
	•	For Pro/Enterprise:
	•	Upload photos (enforce limit as per plan).
	•	Add YouTube link.

4.5.4 Plan & Billing
	•	Shows:
	•	Current plan, price, renewal date.
	•	Buttons:
	•	“Upgrade to Pro/Enterprise” depending on plan.
	•	“Manage billing” (Stripe portal link).

Flow:
	•	Upgrade → Stripe Checkout.
	•	On success → plan updated; UI refresh.

⸻

5. Summary
	•	Pricing page: keep your three-card layout but make all CTAs feed the same “Get listed” onboarding, de-emphasize plan choice in the hero, and add clear low-risk copy (“Free plan available, no credit card to start,” “Cancel anytime”).
	•	Onboarding:
Single funnel with:
	1.	Account creation
	2.	Basic practice details
	3.	“Your listing is ready” plan selection with preview
	4.	Stripe (if Pro/Enterprise)
	5.	Confirmation + dashboard.
	•	Dashboard:
Two states:
	•	Onboarding state with a checklist and guided tasks.
	•	Regular state with status, metrics, and upgrade surfaces.
	•	Sections: Overview, Profile & Details, Locations, Media, Plan & Billing, Featured Partners.

