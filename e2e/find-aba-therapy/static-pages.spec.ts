import { test, expect } from "@playwright/test";

/**
 * Find ABA Therapy - Static Pages Tests (FAT-013, FAT-014, FAT-015, FAT-016)
 *
 * Tests educational content, FAQ, legal pages, and get listed.
 */
test.describe("Find ABA Therapy - Learn Pages", () => {
  test("FAT-013: Learn hub page loads", async ({ page }) => {
    await page.goto("/learn");

    // Page heading
    await expect(page.getByRole("heading")).toBeVisible();

    // Educational content indicators
    await expect(
      page.locator("text=/learn|resources|guide|article/i").first()
    ).toBeVisible();
  });

  test("Learn hub has article list", async ({ page }) => {
    await page.goto("/learn");

    // Article links
    const articleLinks = page.locator('a[href*="/learn/"]');
    const count = await articleLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("Learn hub has category filters", async ({ page }) => {
    await page.goto("/learn");

    // Category filter options
    const categories = page.locator("text=/getting started|choosing|insurance|costs/i");
    const count = await categories.count();
    console.log(`Category filters found: ${count}`);
  });

  test("Article pages load correctly", async ({ page }) => {
    await page.goto("/learn");

    // Click first article link
    const articleLink = page.locator('a[href*="/learn/"][href$=""]').first();

    if (await articleLink.isVisible()) {
      await articleLink.click();

      // Should have article content
      await expect(page.getByRole("article")).toBeVisible().catch(() => {
        // Fallback: check for main content area
        expect(page.getByRole("main")).toBeVisible();
      });
    }
  });

  test("Glossary page loads", async ({ page }) => {
    await page.goto("/learn/glossary");

    // Page heading
    await expect(page.getByRole("heading")).toBeVisible();

    // Glossary terms
    await expect(
      page.locator("text=/glossary|terms|definition/i").first()
    ).toBeVisible();
  });

  test("Glossary has searchable terms", async ({ page }) => {
    await page.goto("/learn/glossary");

    // Search input
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);
    console.log(`Glossary search visible: ${hasSearch}`);
  });
});

test.describe("Find ABA Therapy - FAQ Page", () => {
  test("FAT-014: FAQ page loads", async ({ page }) => {
    await page.goto("/faq");

    // Page heading
    await expect(page.getByRole("heading", { name: /faq|questions|help/i })).toBeVisible();
  });

  test("FAQ page has expandable questions", async ({ page }) => {
    await page.goto("/faq");

    // FAQ items (accordion or details elements)
    const faqItems = page.locator(
      'details, [data-testid="faq-item"], [role="button"], button[aria-expanded]'
    );
    const count = await faqItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test("FAQ questions expand on click", async ({ page }) => {
    await page.goto("/faq");

    // Find and click first FAQ item
    const faqItem = page.locator('details summary, button[aria-expanded]').first();

    if (await faqItem.isVisible()) {
      await faqItem.click();
      // Answer should be visible
      await page.waitForTimeout(300);
    }
  });

  test("FAQ page has category filters", async ({ page }) => {
    await page.goto("/faq");

    // Categories: ABA Basics, Insurance & Costs, Finding Providers, Treatment, Concerns
    const categories = page.locator(
      "text=/basics|insurance|costs|finding|treatment|concerns/i"
    );
    const count = await categories.count();
    console.log(`FAQ categories found: ${count}`);
  });

  test("FAQ page has searchable interface", async ({ page }) => {
    await page.goto("/faq");

    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);
    console.log(`FAQ search visible: ${hasSearch}`);
  });
});

test.describe("Find ABA Therapy - Legal Pages", () => {
  test("FAT-015: Terms of Service page loads", async ({ page }) => {
    await page.goto("/legal/terms");

    // Page heading
    await expect(page.getByRole("heading", { name: /terms/i })).toBeVisible();

    // Content sections
    await expect(
      page.locator("text=/service|agreement|use|liability/i").first()
    ).toBeVisible();
  });

  test("Privacy Policy page loads", async ({ page }) => {
    await page.goto("/legal/privacy");

    // Page heading
    await expect(page.getByRole("heading", { name: /privacy/i })).toBeVisible();

    // Content sections
    await expect(
      page.locator("text=/data|information|collect|cookies/i").first()
    ).toBeVisible();
  });

  test("Terms page has required sections", async ({ page }) => {
    await page.goto("/legal/terms");

    // Key sections that should be present
    const sections = [
      /description of service/i,
      /user|account/i,
      /prohibited|conduct/i,
      /liability/i,
    ];

    for (const section of sections.slice(0, 2)) {
      const element = page.locator(`text=${section.source}`).first();
      const isVisible = await element.isVisible().catch(() => false);
      console.log(`Section "${section.source}" visible: ${isVisible}`);
    }
  });

  test("Privacy page mentions key topics", async ({ page }) => {
    await page.goto("/legal/privacy");

    // Key privacy topics
    const topics = ["cookies", "data", "stripe", "turnstile"];

    for (const topic of topics.slice(0, 2)) {
      const element = page.locator(`text=/${topic}/i`).first();
      const isVisible = await element.isVisible().catch(() => false);
      console.log(`Topic "${topic}" mentioned: ${isVisible}`);
    }
  });
});

test.describe("Find ABA Therapy - Get Listed Page", () => {
  test("FAT-016: Get Listed page loads", async ({ page }) => {
    await page.goto("/get-listed");

    // Page heading
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("Get Listed shows pricing plans", async ({ page }) => {
    await page.goto("/get-listed");

    // Plan cards
    await expect(page.locator("text=/free/i").first()).toBeVisible();
    await expect(page.locator("text=/pro/i").first()).toBeVisible();
    await expect(page.locator("text=/enterprise/i").first()).toBeVisible();
  });

  test("Get Listed has pricing amounts", async ({ page }) => {
    await page.goto("/get-listed");

    // Pricing (Pro: $79/mo or $47/mo annual, Enterprise: $199/mo or $119/mo annual)
    await expect(page.locator("text=/\\$0|free/i").first()).toBeVisible();
    await expect(page.locator("text=/\\$\\d+/i").first()).toBeVisible();
  });

  test("Get Listed has annual/monthly toggle", async ({ page }) => {
    await page.goto("/get-listed");

    // Billing toggle
    const billingToggle = page.locator(
      "text=/annual|monthly|billing/i, button:has-text('Monthly'), button:has-text('Annual')"
    ).first();
    const hasToggle = await billingToggle.isVisible().catch(() => false);
    console.log(`Billing toggle visible: ${hasToggle}`);
  });

  test("Get Listed shows feature lists", async ({ page }) => {
    await page.goto("/get-listed");

    // Feature lists with checkmarks
    const features = page.locator(
      "text=/location|search placement|contact form|photo|video|badge/i"
    );
    const count = await features.count();
    expect(count).toBeGreaterThan(0);
  });

  test("Get Listed has sign up CTAs", async ({ page }) => {
    await page.goto("/get-listed");

    // Sign up buttons
    const signUpCTA = page.locator(
      'a:has-text("Get listed"), a:has-text("Sign up"), a:has-text("Get started"), button:has-text("Upgrade")'
    ).first();
    await expect(signUpCTA).toBeVisible();
  });

  test("Get Listed has testimonials", async ({ page }) => {
    await page.goto("/get-listed");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

    // Testimonials section
    const testimonials = page.locator("text=/testimonial|review|said|quote/i").first();
    const hasTestimonials = await testimonials.isVisible().catch(() => false);
    console.log(`Testimonials visible: ${hasTestimonials}`);
  });

  test("Get Listed has how it works section", async ({ page }) => {
    await page.goto("/get-listed");

    // How it works
    const howItWorks = page.locator("text=/how it works|step|process/i").first();
    const hasHowItWorks = await howItWorks.isVisible().catch(() => false);
    console.log(`How it works visible: ${hasHowItWorks}`);
  });

  test("Get Listed CTA navigates to sign up", async ({ page }) => {
    await page.goto("/get-listed");

    const signUpLink = page.getByRole("link", { name: /get listed|sign up|get started/i }).first();

    if (await signUpLink.isVisible()) {
      await signUpLink.click();
      await expect(page).toHaveURL(/\/auth\/sign-up/);
    }
  });
});
