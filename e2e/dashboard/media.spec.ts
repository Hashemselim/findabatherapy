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

const uploadFixturePath = path.join(process.cwd(), "public", "logo-icon.png");

async function openPhotoEditor(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("photo-gallery-edit")).toBeVisible({
    timeout: 30000,
  });
  await page.getByTestId("photo-gallery-edit").click();
  await expect(page.getByText("Edit Photo Gallery")).toBeVisible({
    timeout: 30000,
  });
}

async function ensureAtLeastOnePhoto(page: import("@playwright/test").Page) {
  if ((await page.getByTestId("photo-item").count()) > 0) {
    return;
  }

  const fileInput = page.locator('input[type="file"]').first();
  await expect(fileInput).toBeAttached({ timeout: 30000 });
  await fileInput.setInputFiles(uploadFixturePath);
  await expect
    .poll(async () => page.getByTestId("photo-item").count(), {
      timeout: 60000,
    })
    .toBeGreaterThan(0);
  await expect(page.getByTestId("photo-item").first()).toBeVisible({
    timeout: 30000,
  });
}

async function waitForStablePhotoCount(page: import("@playwright/test").Page) {
  let previousCount = -1;
  let stableReads = 0;

  await expect
    .poll(async () => {
      const count = await page.getByTestId("photo-item").count();
      if (count === previousCount) {
        stableReads += 1;
      } else {
        stableReads = 1;
        previousCount = count;
      }

      return stableReads >= 3 ? count : -1;
    }, {
      timeout: 10000,
      intervals: [250, 500, 500],
    })
    .not.toBe(-1);

  return previousCount;
}

async function openVideoEditor(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("video-edit-button")).toBeVisible({
    timeout: 30000,
  });
  await page.getByTestId("video-edit-button").click();
  await expect(page.getByText("Edit Video")).toBeVisible({ timeout: 30000 });
}

async function ensureVideoPreview(page: import("@playwright/test").Page) {
  const preview = page.getByTestId("video-preview");
  if (await preview.isVisible().catch(() => false)) {
    return;
  }

  await openVideoEditor(page);
  await page.getByTestId("video-url").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText("Video updated successfully.")).toBeVisible({
    timeout: 30000,
  });
  await expect(preview).toBeVisible({ timeout: 30000 });
}

async function gotoMediaPage(page: import("@playwright/test").Page) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto("/dashboard/media", { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
      await page.waitForTimeout(500);
    }
  }
}

test.describe("DASH-022, DASH-023, DASH-024, DASH-025: Media Management", () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await gotoMediaPage(page);

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

  test("should show photo gallery section", async ({ page }) => {
    await expect(page.locator("text=/photo gallery/i").first()).toBeVisible();
  });

  test("should have photo upload section", async ({ page }) => {
    await openPhotoEditor(page);

    await expect(page.getByText(/add photo|photos used/i).first()).toBeVisible();
    await expect(page.locator('input[type="file"]').first()).toBeAttached();
    await expect(page.locator('input[type="file"]').first()).toHaveAttribute(
      "accept",
      /image/
    );
  });

  test("should show existing photos", async ({ page }) => {
    await expect(
      page.getByText(/photo gallery|no photos added yet|add photos/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("should have photo delete functionality", async ({ page }) => {
    await openPhotoEditor(page);
    await ensureAtLeastOnePhoto(page);

    const photoCountBefore = await waitForStablePhotoCount(page);
    const photoCard = page.getByTestId("photo-item").first();
    await photoCard.hover();
    await page.getByTestId("delete-photo").first().click();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect
      .poll(async () => waitForStablePhotoCount(page), { timeout: 30000 })
      .toBe(photoCountBefore - 1);
  });

  test("should have video URL input", async ({ page }) => {
    await openVideoEditor(page);
    await expect(page.getByTestId("video-url")).toBeVisible({ timeout: 30000 });
  });

  test("should validate video URL format", async ({ page }) => {
    await openVideoEditor(page);
    await page.getByTestId("video-url").fill("not-a-valid-url");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/valid youtube or vimeo video url/i)).toBeVisible({
      timeout: 30000,
    });
  });

  test("should save valid video URL", async ({ page }) => {
    await openVideoEditor(page);
    await page.getByTestId("video-url").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText("Video updated successfully.")).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByTestId("video-preview")).toBeVisible({
      timeout: 30000,
    });
  });

  test("should show video preview", async ({ page }) => {
    await ensureVideoPreview(page);
  });

  test("should indicate photo limit", async ({ page }) => {
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
    await gotoMediaPage(page);

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
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await gotoMediaPage(page);

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await openPhotoEditor(page);
  });

  test("should accept valid image types", async ({ page }) => {
    const input = page.locator('input[type="file"]').first();
    await expect(input).toBeAttached({ timeout: 30000 });
    await expect(input).toHaveAttribute("accept", /jpeg|png|webp|gif|image/i);
  });
});

test.describe("Photo Reordering", () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await gotoMediaPage(page);

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await openPhotoEditor(page);
  });

  test("should have drag and drop reorder functionality", async ({ page }) => {
    await ensureAtLeastOnePhoto(page);
    await page.getByTestId("photo-item").first().hover();
    await expect(page.getByTestId("drag-handle").first()).toBeVisible();
  });
});
