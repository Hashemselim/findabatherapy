# Launch Tasks Checklist

Human tasks required before and after launching Find ABA Therapy.

---

## Pre-Launch (Do Before Deploying)

### Environment Variables
- [ ] **Set up Supabase production project**
  - Create production Supabase project
  - Run migrations on production database
  - Get production `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **Set up Stripe production keys**
  - Switch from test to live keys
  - Get `STRIPE_SECRET_KEY` (live)
  - Get `STRIPE_WEBHOOK_SECRET` (live)
  - Set up webhook endpoint in Stripe Dashboard pointing to `/api/stripe/webhooks`

- [ ] **Set up Google Places API**
  - Get `GOOGLE_PLACES_API_KEY` for address autocomplete

- [ ] **Set up Cloudflare Turnstile (spam protection)**
  - Get `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - Get `TURNSTILE_SECRET_KEY`

- [ ] **Set up IndexNow (instant Bing indexing)**
  - Generate a 32-character hex key (e.g., `openssl rand -hex 16`)
  - Add `INDEXNOW_KEY=your-key` to environment variables
  - Create file `public/[your-key].txt` containing just the key

---

## Deploy to Vercel

- [ ] **Connect GitHub repo to Vercel**
- [ ] **Add all environment variables to Vercel**
- [ ] **Set custom domain**: `www.findabatherapy.com`
- [ ] **Enable Edge Functions** if using middleware
- [ ] **Test deployment** - verify pages load correctly

---

## Post-Launch SEO Setup

### Google Search Console
- [ ] **Add property** for `www.findabatherapy.com`
- [ ] **Verify ownership** (should auto-verify via DNS if using Vercel)
- [ ] **Submit sitemap**: `https://www.findabatherapy.com/sitemap.xml`
- [ ] **Request indexing** for priority pages:
  - Homepage `/`
  - `/search`
  - `/learn` (articles index)
  - Top state pages (California, Texas, Florida, New York)
  - Featured articles

### Bing Webmaster Tools
- [ ] **Add site** to Bing Webmaster Tools
- [ ] **Submit sitemap**
- [ ] **Verify IndexNow** is working (check API response)

### Google Business Profile (Optional but recommended)
- [ ] Create Google Business Profile for Find ABA Therapy as a directory/service

---

## Content & Data

- [ ] **Seed production database** with initial provider listings
- [ ] **Verify all articles** display correctly with author info
- [ ] **Test contact forms** - ensure emails are delivered
- [ ] **Test Stripe checkout** - complete a test subscription

---

## Monitoring & Analytics

- [ ] **Set up Google Analytics 4**
  - Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` to env
  - Or use Vercel Analytics (built-in)

- [ ] **Set up error monitoring** (optional)
  - Sentry, LogRocket, or similar
  - Add error boundary tracking

- [ ] **Monitor Core Web Vitals**
  - Check Vercel Analytics or PageSpeed Insights
  - Target: LCP < 2.5s, INP < 200ms, CLS < 0.1

---

## Legal & Compliance

- [ ] **Privacy Policy** - verify `/legal/privacy` is accurate
- [ ] **Terms of Service** - verify `/legal/terms` is accurate
- [ ] **HIPAA considerations** - contact forms don't collect PHI, but review
- [ ] **Cookie consent** - add if using analytics cookies (GDPR)

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

- [ ] Track initial rankings:
  - "ABA therapy" + target cities
  - Brand name searches

---

## Future Enhancements (Post-Launch)

- [ ] Add real reviews/ratings integration
- [ ] Implement email newsletter
- [ ] Add more insurance pages
- [ ] Expand city coverage
- [ ] A/B test landing pages
- [ ] Build backlinks (guest posts, PR, partnerships)

---

## Environment Variables Summary

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Google
GOOGLE_PLACES_API_KEY=
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=  # Optional, auto-verifies on Vercel

# Turnstile (Cloudflare)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# IndexNow
INDEXNOW_KEY=

# Site
NEXT_PUBLIC_SITE_URL=https://www.findabatherapy.com

# Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

---

*Last updated: December 28, 2024*
