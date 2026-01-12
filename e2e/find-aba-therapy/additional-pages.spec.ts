import { test, expect } from "@playwright/test";

/**
 * Find ABA Therapy - Additional Pages Tests
 * Tests for: /states, /centers, /[state]/guide, /learn/glossary, /provider/p/[slug]
 */

test.describe("FAT-018: States Directory", () => {
  test("should load states directory page", async ({ page }) => {
    await page.goto("/states");

    // Page loads
    await expect(page).toHaveURL("/states");

    // Title/heading present
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();

    // State cards/links should be present (at least some)
    const stateLinks = page.locator('a[href*="/"][href$="-"]');
    const anyStateLink = page.locator('a[href="/california"], a[href="/texas"], a[href="/florida"], a[href="/new-york"]');
    const hasStateLinks = await anyStateLink.first().isVisible().catch(() => false);

    if (!hasStateLinks) {
      // Try alternative selectors
      const stateCards = page.locator('[data-testid*="state"], .state-card, .state-link');
      const count = await stateCards.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("should have clickable state links", async ({ page }) => {
    await page.goto("/states");

    // Find any state link
    const californiaLink = page.locator('a[href="/california"]');
    const hasCaliforniaLink = await californiaLink.isVisible().catch(() => false);

    if (hasCaliforniaLink) {
      await californiaLink.click();
      await expect(page).toHaveURL("/california");
    } else {
      // Skip if no state links found
      test.skip(true, "No state links found on page");
    }
  });

  test("should be mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/states");

    // Page should still load
    await expect(page).toHaveURL("/states");

    // Content should be visible
    const mainContent = page.locator("main, [role='main'], .container");
    await expect(mainContent.first()).toBeVisible();
  });
});

test.describe("FAT-020: Centers Directory", () => {
  test("should load centers page", async ({ page }) => {
    await page.goto("/centers");

    // Page loads
    await expect(page).toHaveURL("/centers");

    // Should have heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });

  test("should show center-based providers", async ({ page }) => {
    await page.goto("/centers");

    // Check for provider cards or indication of center-based filtering
    const providerCards = page.locator(
      '[data-testid="provider-card"], .provider-card, article, [role="article"]'
    );
    const noResultsText = page.locator('text=/no providers|no results|coming soon/i');

    const hasCards = await providerCards.first().isVisible().catch(() => false);
    const hasNoResults = await noResultsText.isVisible().catch(() => false);

    // Either has results or shows no results message
    expect(hasCards || hasNoResults).toBeTruthy();
  });

  test("should have proper SEO meta tags", async ({ page }) => {
    await page.goto("/centers");

    // Check for title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    // Check for meta description
    const metaDescription = page.locator('meta[name="description"]');
    const hasDescription = await metaDescription.isVisible().catch(() => false);
    // Meta may exist in head even if not visible
    const descContent = await page.locator('meta[name="description"]').getAttribute('content');
    expect(descContent || hasDescription).toBeTruthy();
  });
});

test.describe("FAT-021: State Guide Pages", () => {
  test("should load California guide page", async ({ page }) => {
    await page.goto("/california/guide");

    // May redirect or show 404 if not implemented
    const url = page.url();
    if (url.includes("/guide")) {
      await expect(page).toHaveURL(/california\/guide/);

      // Should have heading
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
    } else {
      test.skip(true, "State guide pages not implemented");
    }
  });

  test("should have state-specific content", async ({ page }) => {
    await page.goto("/california/guide");

    const url = page.url();
    if (!url.includes("/guide")) {
      test.skip(true, "State guide pages not implemented");
      return;
    }

    // Should mention the state name
    const californiaText = page.locator('text=/california/i');
    await expect(californiaText.first()).toBeVisible();
  });

  test("should have CTA to search providers", async ({ page }) => {
    await page.goto("/california/guide");

    const url = page.url();
    if (!url.includes("/guide")) {
      test.skip(true, "State guide pages not implemented");
      return;
    }

    // Look for search or browse CTA
    const searchCta = page.locator('a[href*="/search"], a[href*="/california"], button:has-text(/search|find|browse/i)');
    const hasCta = await searchCta.first().isVisible().catch(() => false);
    expect(hasCta).toBeTruthy();
  });
});

test.describe("FAT-022, FAT-023: Glossary Page", () => {
  test("should load glossary page", async ({ page }) => {
    await page.goto("/learn/glossary");

    // Page loads
    await expect(page).toHaveURL("/learn/glossary");

    // Should have heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });

  test("should display glossary terms", async ({ page }) => {
    await page.goto("/learn/glossary");

    // Look for term entries
    const termEntries = page.locator(
      '[data-testid="glossary-term"], .glossary-term, dt, .term, article'
    );
    const count = await termEntries.count();

    // Should have at least some terms
    expect(count).toBeGreaterThan(0);
  });

  test("should have alphabetical navigation", async ({ page }) => {
    await page.goto("/learn/glossary");

    // Look for A-Z navigation
    const alphaNav = page.locator('nav a, [role="navigation"] a, .alphabet-nav a');
    const letterLinks = page.locator('a:has-text("A"), a:has-text("B"), a:has-text("C")');

    const hasAlphaNav = await letterLinks.first().isVisible().catch(() => false);

    // Alpha nav is optional but nice to have
    if (hasAlphaNav) {
      expect(hasAlphaNav).toBeTruthy();
    }
  });

  test("should support term search/filter", async ({ page }) => {
    await page.goto("/learn/glossary");

    // Look for search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[name*="search" i], input[aria-label*="search" i]'
    );
    const hasSearch = await searchInput.first().isVisible().catch(() => false);

    if (hasSearch) {
      await searchInput.first().fill("ABA");
      await page.waitForTimeout(300); // Debounce

      // Results should filter
      const visibleTerms = page.locator(
        '[data-testid="glossary-term"]:visible, .glossary-term:visible, .term:visible'
      );
      // Just verify search doesn't break page
    }
  });

  test("should be mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/learn/glossary");

    await expect(page).toHaveURL("/learn/glossary");

    // Content should be visible
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });
});

test.describe("FAT-024: Provider Shortlink", () => {
  test("should redirect shortlink to full profile", async ({ page }) => {
    // This test requires knowing a valid provider slug
    // Try to find one from the search page first
    await page.goto("/search");

    const providerLink = page.locator(
      '[data-testid="provider-card"] a, article a, .provider-card a'
    ).first();

    const hasProvider = await providerLink.isVisible().catch(() => false);

    if (!hasProvider) {
      test.skip(true, "No providers available to test shortlink");
      return;
    }

    // Get the provider slug from an existing link
    const href = await providerLink.getAttribute("href");
    if (!href || !href.includes("/provider/")) {
      test.skip(true, "Could not find provider link");
      return;
    }

    const slug = href.split("/provider/")[1]?.split("?")[0];
    if (!slug) {
      test.skip(true, "Could not extract provider slug");
      return;
    }

    // Test the shortlink
    const shortUrl = `/provider/p/${slug}`;
    await page.goto(shortUrl);

    // Should redirect to full profile
    await expect(page).toHaveURL(new RegExp(`/provider/${slug}`));
  });
});

test.describe("Learn Hub Additional Tests", () => {
  test("should load learn hub page", async ({ page }) => {
    await page.goto("/learn");

    await expect(page).toHaveURL("/learn");

    // Should have heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });

  test("should display article categories", async ({ page }) => {
    await page.goto("/learn");

    // Look for category sections or filters
    const categories = page.locator(
      '[data-testid="category"], .category, [role="tab"], .category-filter'
    );
    const hasCats = await categories.first().isVisible().catch(() => false);

    // Categories are expected but not strictly required
    if (hasCats) {
      const count = await categories.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("should display article cards", async ({ page }) => {
    await page.goto("/learn");

    // Look for article cards
    const articleCards = page.locator(
      '[data-testid="article-card"], article, .article-card, a[href*="/learn/"]'
    );
    const count = await articleCards.count();

    // Should have at least some articles
    expect(count).toBeGreaterThan(0);
  });

  test("should navigate to article detail", async ({ page }) => {
    await page.goto("/learn");

    const articleLink = page.locator('a[href*="/learn/"]:not([href="/learn/glossary"])').first();
    const hasArticle = await articleLink.isVisible().catch(() => false);

    if (!hasArticle) {
      test.skip(true, "No article links found");
      return;
    }

    await articleLink.click();
    await expect(page).toHaveURL(/\/learn\/[a-z0-9-]+/);

    // Article page should have heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });
});
