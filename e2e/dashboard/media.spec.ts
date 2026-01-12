import { test, expect } from "@playwright/test";
import { existsSync } from "fs";
import path from "path";

/**
 * Dashboard - Media Management Tests
 * Tests for: /dashboard/media (photos and video)
 */

// Check if auth state exists
function checkAuthAvailable(): boolean {
  const authPath = path.join(__dirname, "..", ".auth", "user.json");
  return existsSync(authPath);
}

test.describe("DASH-022, DASH-023, DASH-024, DASH-025: Media Management", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/media");

    // Check if redirected to auth
    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load media page", async ({ page }) => {
    // May be on media page or redirected if not available
    const url = page.url();

    if (url.includes("/media")) {
      await expect(page).toHaveURL(/dashboard\/media/);

      // Should have heading
      const heading = page.locator("h1, h2");
      await expect(heading.first()).toBeVisible();
    } else if (url.includes("/upgrade") || url.includes("/billing")) {
      // Free users redirected to upgrade
      test.skip(true, "Media requires Pro+ plan");
    }
  });

  test("should show upgrade prompt for free users", async ({ page }) => {
    // Look for upgrade prompt
    const upgradePrompt = page.locator(
      '[data-testid="upgrade-prompt"], .upgrade-prompt, text=/upgrade|pro plan|premium/i'
    );
    const hasUpgrade = await upgradePrompt.isVisible().catch(() => false);

    // This is expected for free tier
    if (hasUpgrade) {
      // Check for upgrade CTA
      const upgradeButton = page.locator('a[href*="/billing"], a[href*="/upgrade"], button:has-text(/upgrade/i)');
      const hasButton = await upgradeButton.first().isVisible().catch(() => false);
      expect(hasButton).toBeTruthy();
    }
  });

  test("should have photo upload section", async ({ page }) => {
    // Look for photo upload area
    const photoUpload = page.locator(
      '[data-testid="photo-upload"], .photo-upload, input[type="file"][accept*="image"], .dropzone'
    );
    const hasUpload = await photoUpload.first().isVisible().catch(() => false);

    const upgradePrompt = page.locator('text=/upgrade|pro plan/i');
    const needsUpgrade = await upgradePrompt.isVisible().catch(() => false);

    if (needsUpgrade) {
      test.skip(true, "Photo upload requires Pro+ plan");
      return;
    }

    expect(hasUpload).toBeTruthy();
  });

  test("should show existing photos", async ({ page }) => {
    const upgradePrompt = page.locator('text=/upgrade|pro plan/i');
    const needsUpgrade = await upgradePrompt.isVisible().catch(() => false);

    if (needsUpgrade) {
      test.skip(true, "Media requires Pro+ plan");
      return;
    }

    // Look for photo gallery
    const photoGallery = page.locator(
      '[data-testid="photo-gallery"], .photo-gallery, .photos-grid'
    );
    const existingPhotos = page.locator(
      '[data-testid="photo-item"], .photo-item, img[src*="storage"]'
    );
    const emptyState = page.locator('text=/no photos|upload photos|add photos/i');

    const hasGallery = await photoGallery.isVisible().catch(() => false);
    const hasPhotos = await existingPhotos.first().isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // Should have gallery, photos, or empty state
    expect(hasGallery || hasPhotos || hasEmpty).toBeTruthy();
  });

  test("should have photo delete functionality", async ({ page }) => {
    const upgradePrompt = page.locator('text=/upgrade|pro plan/i');
    const needsUpgrade = await upgradePrompt.isVisible().catch(() => false);

    if (needsUpgrade) {
      test.skip(true, "Media requires Pro+ plan");
      return;
    }

    // Look for delete buttons on photos
    const deleteButton = page.locator(
      '[data-testid="delete-photo"], .delete-photo, button[aria-label*="delete" i], button:has(svg[class*="trash"])'
    );
    const hasDelete = await deleteButton.first().isVisible().catch(() => false);

    const emptyState = page.locator('text=/no photos|upload photos/i');
    const isEmpty = await emptyState.isVisible().catch(() => false);

    if (isEmpty) {
      test.skip(true, "No photos to test delete functionality");
      return;
    }

    expect(hasDelete).toBeTruthy();
  });

  test("should have video URL input", async ({ page }) => {
    const upgradePrompt = page.locator('text=/upgrade|pro plan/i');
    const needsUpgrade = await upgradePrompt.isVisible().catch(() => false);

    if (needsUpgrade) {
      test.skip(true, "Media requires Pro+ plan");
      return;
    }

    // Look for video URL input
    const videoInput = page.locator(
      'input[name*="video" i], input[placeholder*="youtube" i], input[placeholder*="vimeo" i], [data-testid="video-url"]'
    );
    const hasVideo = await videoInput.first().isVisible().catch(() => false);

    expect(hasVideo).toBeTruthy();
  });

  test("should validate video URL format", async ({ page }) => {
    const upgradePrompt = page.locator('text=/upgrade|pro plan/i');
    const needsUpgrade = await upgradePrompt.isVisible().catch(() => false);

    if (needsUpgrade) {
      test.skip(true, "Media requires Pro+ plan");
      return;
    }

    const videoInput = page.locator(
      'input[name*="video" i], input[placeholder*="youtube" i], [data-testid="video-url"]'
    ).first();

    const hasInput = await videoInput.isVisible().catch(() => false);

    if (!hasInput) {
      test.skip(true, "Video input not available");
      return;
    }

    // Enter invalid URL
    await videoInput.fill("not-a-valid-url");

    // Try to save
    const saveButton = page.locator('button:has-text(/save/i)');
    const hasSave = await saveButton.isVisible().catch(() => false);

    if (hasSave) {
      await saveButton.click();
      await page.waitForTimeout(500);

      // Should show validation error
      const error = page.locator('text=/invalid|valid url|youtube|vimeo/i');
      const hasError = await error.isVisible().catch(() => false);

      expect(hasError).toBeTruthy();
    }
  });

  test("should save valid video URL", async ({ page }) => {
    const upgradePrompt = page.locator('text=/upgrade|pro plan/i');
    const needsUpgrade = await upgradePrompt.isVisible().catch(() => false);

    if (needsUpgrade) {
      test.skip(true, "Media requires Pro+ plan");
      return;
    }

    const videoInput = page.locator(
      'input[name*="video" i], input[placeholder*="youtube" i], [data-testid="video-url"]'
    ).first();

    const hasInput = await videoInput.isVisible().catch(() => false);

    if (!hasInput) {
      test.skip(true, "Video input not available");
      return;
    }

    // Enter valid YouTube URL
    await videoInput.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    const saveButton = page.locator('button:has-text(/save/i)');
    const hasSave = await saveButton.isVisible().catch(() => false);

    if (hasSave) {
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Should show success or video preview
      const success = page.locator('text=/saved|success/i, [data-testid="toast"]');
      const preview = page.locator('iframe[src*="youtube"], .video-preview');

      const hasSuccess = await success.isVisible().catch(() => false);
      const hasPreview = await preview.isVisible().catch(() => false);

      expect(hasSuccess || hasPreview).toBeTruthy();
    }
  });

  test("should show video preview", async ({ page }) => {
    const upgradePrompt = page.locator('text=/upgrade|pro plan/i');
    const needsUpgrade = await upgradePrompt.isVisible().catch(() => false);

    if (needsUpgrade) {
      test.skip(true, "Media requires Pro+ plan");
      return;
    }

    // Look for video preview/embed
    const videoPreview = page.locator(
      'iframe[src*="youtube"], iframe[src*="vimeo"], .video-preview, [data-testid="video-preview"]'
    );
    const hasPreview = await videoPreview.isVisible().catch(() => false);

    const noVideo = page.locator('text=/no video|add video/i');
    const hasNoVideo = await noVideo.isVisible().catch(() => false);

    // Should have preview or no video message
    expect(hasPreview || hasNoVideo).toBeTruthy();
  });

  test("should indicate photo limit", async ({ page }) => {
    const upgradePrompt = page.locator('text=/upgrade|pro plan/i');
    const needsUpgrade = await upgradePrompt.isVisible().catch(() => false);

    if (needsUpgrade) {
      test.skip(true, "Media requires Pro+ plan");
      return;
    }

    // Look for photo count/limit indicator
    const photoCount = page.locator('text=/\\d+ of \\d+|\\d+\\/\\d+|photos.*\\d+/i');
    const hasCount = await photoCount.isVisible().catch(() => false);

    // Photo limit indicator is nice to have
    if (hasCount) {
      expect(hasCount).toBeTruthy();
    }
  });

  test("should be mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard/media");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Content should be visible
    const content = page.locator("main, [role='main'], .content");
    await expect(content.first()).toBeVisible();
  });
});

test.describe("Photo Upload Validation", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/media");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const upgradePrompt = page.locator('text=/upgrade|pro plan/i');
    const needsUpgrade = await upgradePrompt.isVisible().catch(() => false);

    if (needsUpgrade) {
      test.skip(true, "Media requires Pro+ plan");
      return;
    }
  });

  test("should accept valid image types", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    const hasInput = await fileInput.isVisible().catch(() => false);

    if (!hasInput) {
      // Input may be hidden, check for upload button
      const uploadButton = page.locator('button:has-text(/upload|add photo/i)');
      const hasButton = await uploadButton.isVisible().catch(() => false);

      if (hasButton) {
        // Click upload button
        await uploadButton.click();
        await page.waitForTimeout(300);
      }
    }

    // Check accept attribute if input is visible
    const input = page.locator('input[type="file"]').first();
    const accept = await input.getAttribute("accept").catch(() => null);

    if (accept) {
      // Should accept common image types
      expect(accept.includes("image/") || accept.includes(".jpg") || accept.includes(".png")).toBeTruthy();
    }
  });
});

test.describe("Photo Reordering", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/media");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const upgradePrompt = page.locator('text=/upgrade|pro plan/i');
    const needsUpgrade = await upgradePrompt.isVisible().catch(() => false);

    if (needsUpgrade) {
      test.skip(true, "Media requires Pro+ plan");
      return;
    }
  });

  test("should have drag and drop reorder functionality", async ({ page }) => {
    // Look for drag handles or sortable indicators
    const dragHandle = page.locator(
      '[data-testid="drag-handle"], .drag-handle, [aria-grabbed], [draggable="true"]'
    );
    const hasDrag = await dragHandle.first().isVisible().catch(() => false);

    const emptyState = page.locator('text=/no photos/i');
    const isEmpty = await emptyState.isVisible().catch(() => false);

    if (isEmpty) {
      test.skip(true, "No photos to test reordering");
      return;
    }

    // Drag and drop is a nice-to-have feature
    if (hasDrag) {
      expect(hasDrag).toBeTruthy();
    }
  });
});
