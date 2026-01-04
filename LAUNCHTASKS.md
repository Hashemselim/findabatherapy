# Launch Tasks Checklist

Human tasks required before and after launching Find ABA Therapy.

**Last updated:** December 30, 2024

---

## Pre-Launch (Do Before Deploying)

### Environment Variables

- [x] **Set up Supabase project**
  - ✅ Migrations ready (17 migration files)
  - ✅ `NEXT_PUBLIC_SUPABASE_URL` configured
  - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
  - ✅ `SUPABASE_SERVICE_ROLE_KEY` configured
  - ✅ Using cloud Supabase as production (single environment)

- [x] **Set up Stripe keys**
  - ✅ Checkout flow implemented
  - ✅ Webhook handler complete (`/api/stripe/webhooks`)
  - ✅ `STRIPE_SECRET_KEY` configured (test mode)
  - ✅ `STRIPE_WEBHOOK_SECRET` configured
  - ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` configured
  - [ ] Switch from test to **live keys** for production

- [x] **Set up Google Maps/Places API**
  - ✅ Address autocomplete implemented (`/api/places/*`)
  - ✅ Rate limiting in place (30 req/min per IP)
  - ✅ `GOOGLE_MAPS_API_KEY` configured

- [x] **Set up Cloudflare Turnstile (spam protection)**
  - ✅ Integrated into contact forms and sign-up
  - ✅ `NEXT_PUBLIC_TURNSTILE_SITE_KEY` configured
  - ✅ `TURNSTILE_SECRET_KEY` configured

- [x] **Set up Email (Resend)**
  - ✅ Email notifications implemented
  - ✅ `RESEND_API_KEY` configured
  - ✅ `EMAIL_FROM` configured

- [x] **Set up IndexNow (instant Bing indexing)**
  - ✅ API endpoint implemented (`/api/indexnow`)
  - ✅ Key generated: `be9d419af4b441bfe8af202a7e90ad68`
  - ✅ Added `INDEXNOW_KEY` to `.env.local`
  - ✅ Created `public/be9d419af4b441bfe8af202a7e90ad68.txt`

---

## Critical: Content Required

- [x] **Privacy Policy** - `/legal/privacy`
  - ✅ Complete - covers data collection, usage, third-party sharing, HIPAA disclaimer
  - Effective date: January 1, 2025

- [x] **Terms of Service** - `/legal/terms`
  - ✅ Complete - covers billing, refunds, fair use, liability, provider requirements
  - Effective date: January 1, 2025

- [x] **GDPR Cookie Consent** - Not needed (US-only site, no EU compliance required)

---

## Analytics Setup

- [ ] **Option A: Google Analytics 4** (recommended for detailed insights)
  - Create GA4 property
  - Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` to env
  - Implement gtag.js in `_app` or layout
  - Set up conversion tracking for inquiries

- [ ] **Option B: Vercel Analytics** (simpler, privacy-focused)
  - Enable in Vercel dashboard
  - No code changes required

- [x] **Custom Analytics** (already implemented)
  - ✅ Listing views, clicks, impressions tracked in Supabase
  - ✅ Session-based deduplication
  - ✅ Dashboard analytics available for providers

---

## Deploy to Vercel

- [ ] **Connect GitHub repo to Vercel**
- [ ] **Add all environment variables to Vercel**
  - Use production values (live Stripe keys, production Supabase)
- [ ] **Set custom domain**: `www.findabatherapy.org`
- [ ] **Configure redirects**: `findabatherapy.org` → `www.findabatherapy.org`
- [ ] **Test deployment** - verify pages load correctly

---

## Post-Launch SEO Setup

### Google Search Console
- [ ] **Add property** for `www.findabatherapy.org`
- [ ] **Verify ownership** (auto-verifies via DNS on Vercel)
- [ ] **Submit sitemap**: `https://www.findabatherapy.org/sitemap.xml`
- [ ] **Request indexing** for priority pages:
  - Homepage `/`
  - `/search`
  - Top state pages (California, Texas, Florida, New York)

### Bing Webmaster Tools
- [ ] **Add site** to Bing Webmaster Tools
- [ ] **Submit sitemap**
- [ ] **Verify IndexNow** is working (check API response)

---

## Testing Before Launch

- [ ] **Test Stripe checkout flow**
  - Complete a test subscription (use test card 4242...)
  - Verify webhook receives events
  - Check listing gets published after payment

- [ ] **Test contact forms**
  - Submit inquiry as a test user
  - Verify email notification is sent to provider
  - Check inquiry appears in dashboard inbox

- [ ] **Test authentication flow**
  - Sign up new account
  - Verify email verification works
  - Test password reset

- [ ] **Test provider dashboard**
  - Create/edit listing
  - Manage locations
  - View analytics

---

## Monitoring & Error Tracking

- [ ] **Set up error monitoring** (recommended)
  - Sentry, LogRocket, or Vercel's built-in error tracking
  - Add error boundary for React errors

- [ ] **Monitor Core Web Vitals**
  - Check Vercel Analytics or PageSpeed Insights
  - Target: LCP < 2.5s, INP < 200ms, CLS < 0.1

---

## Post-Launch Monitoring (First 2 Weeks)

- [ ] Check Google Search Console daily for:
  - Indexing errors
  - Coverage issues
  - Manual actions

- [ ] Monitor Vercel for:
  - Build errors
  - Function timeouts
  - Error rates

- [ ] Monitor Stripe for:
  - Failed payments
  - Webhook delivery issues

---

## Future Enhancements (Post-Launch)

- [ ] Add real reviews/ratings integration
- [ ] Implement email newsletter
- [ ] Add more insurance pages
- [ ] Expand city coverage
- [ ] A/B test landing pages
- [ ] Build backlinks (guest posts, PR, partnerships)
- [ ] Google Business Profile for Find ABA Therapy

---

## Environment Variables Summary

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (use LIVE keys for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google
GOOGLE_MAPS_API_KEY=AIza...

# Turnstile (Cloudflare)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x...
TURNSTILE_SECRET_KEY=0x...

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=Find ABA Therapy <noreply@findabatherapy.org>

# IndexNow (generate with: openssl rand -hex 16)
INDEXNOW_KEY=your-32-char-hex-key

# Site
NEXT_PUBLIC_SITE_URL=https://www.findabatherapy.org

# Analytics (optional - choose one)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## What's Already Done ✅

| Feature | Status |
|---------|--------|
| Supabase database & auth | ✅ Complete |
| Stripe subscriptions (Pro/Enterprise/Featured) | ✅ Complete |
| Stripe webhooks | ✅ Complete |
| Google Places autocomplete | ✅ Complete |
| Cloudflare Turnstile spam protection | ✅ Complete |
| Contact forms with email notifications | ✅ Complete |
| Provider dashboard | ✅ Complete |
| Custom analytics tracking | ✅ Complete |
| Sitemap generation | ✅ Complete |
| Robots.txt | ✅ Complete |
| Security headers (CSP, etc.) | ✅ Complete |
| Resend email integration | ✅ Complete |

---

## What's Blocking Launch 🚨

| Item | Priority | Action Required |
|------|----------|-----------------|
| ~~Privacy Policy content~~ | ✅ Done | Legal copy complete |
| ~~Terms of Service content~~ | ✅ Done | Legal copy complete |
| ~~IndexNow key setup~~ | ✅ Done | Key generated, file created |
| Analytics | 🟢 Optional | Enable Vercel Analytics in dashboard (recommended) |
| Production env vars in Vercel | 🟡 High | Add before deploy |
| ~~Run migrations on prod DB~~ | ✅ Done | Already using cloud Supabase |

---

## Quick Start for Launch Day

1. ~~**Generate IndexNow key**~~ ✅ Done
2. **Add all env vars to Vercel** (copy from `.env.local`, use production values)
3. **Switch Stripe to live mode** in Vercel env vars
4. **Deploy to Vercel**
5. **Submit sitemap** to Google Search Console
6. **Test checkout** with real card (small amount, refund after)
