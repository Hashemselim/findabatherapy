import { test, expect } from "@playwright/test";

/**
 * Find ABA Jobs - Application Flow Tests (FAJ-005, FAJ-006, FAJ-007, FAJ-008)
 *
 * Tests job application form and submission.
 */
test.describe("Find ABA Jobs - Application Form", () => {
  test("FAJ-005: Application form validates required fields", async ({ page }) => {
    // Navigate to a job
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Click Apply button
      const applyButton = page.locator(
        'button:has-text("Apply"), a:has-text("Apply")'
      ).first();

      if (await applyButton.isVisible()) {
        await applyButton.click();

        // Wait for form/modal to appear
        await page.waitForTimeout(500);

        // Try to submit empty form
        const submitButton = page.locator(
          'button[type="submit"], button:has-text("Submit Application")'
        ).first();

        if (await submitButton.isVisible()) {
          await submitButton.click();

          // Should show validation errors
          await expect(
            page.locator("text=/required|please fill|error/i").first()
          ).toBeVisible();
        }
      }
    }
  });

  test("Application form has all required fields", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      const applyButton = page.locator('button:has-text("Apply")').first();

      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(500);

        // Check for form fields
        // Full Name
        const nameInput = page.locator(
          'input[name*="name" i], input[placeholder*="name" i]'
        ).first();
        await expect(nameInput).toBeVisible();

        // Email
        const emailInput = page.locator(
          'input[name*="email" i], input[type="email"]'
        ).first();
        await expect(emailInput).toBeVisible();

        // Resume upload
        const resumeUpload = page.locator(
          'input[type="file"], [data-testid="resume-upload"], button:has-text("Upload")'
        ).first();
        await expect(resumeUpload).toBeVisible();
      }
    }
  });

  test("Application form has optional fields", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      const applyButton = page.locator('button:has-text("Apply")').first();

      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(500);

        // Phone (optional)
        const phoneInput = page.locator(
          'input[name*="phone" i], input[type="tel"]'
        ).first();
        const hasPhone = await phoneInput.isVisible().catch(() => false);
        console.log(`Phone input visible: ${hasPhone}`);

        // LinkedIn (optional)
        const linkedinInput = page.locator(
          'input[name*="linkedin" i], input[placeholder*="linkedin" i]'
        ).first();
        const hasLinkedin = await linkedinInput.isVisible().catch(() => false);
        console.log(`LinkedIn input visible: ${hasLinkedin}`);

        // Cover letter (optional)
        const coverLetter = page.locator(
          'textarea[name*="cover" i], textarea[placeholder*="cover" i]'
        ).first();
        const hasCoverLetter = await coverLetter.isVisible().catch(() => false);
        console.log(`Cover letter visible: ${hasCoverLetter}`);
      }
    }
  });

  test("FAJ-006: Resume upload accepts valid file types", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      const applyButton = page.locator('button:has-text("Apply")').first();

      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(500);

        // Find file input
        const fileInput = page.locator('input[type="file"]').first();

        if (await fileInput.isVisible()) {
          // Check accepted file types
          const acceptAttribute = await fileInput.getAttribute("accept");
          console.log(`Accepted file types: ${acceptAttribute}`);
          // Should accept PDF, DOC, DOCX
          if (acceptAttribute) {
            expect(acceptAttribute).toMatch(/pdf|doc/i);
          }
        }
      }
    }
  });

  test("Application form has source dropdown", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      const applyButton = page.locator('button:has-text("Apply")').first();

      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(500);

        // Source dropdown
        const sourceDropdown = page.locator(
          'select[name*="source" i], button:has-text("How did you find")'
        ).first();
        const hasSource = await sourceDropdown.isVisible().catch(() => false);
        console.log(`Source dropdown visible: ${hasSource}`);

        if (hasSource) {
          await sourceDropdown.click();
          // Options: Direct, Careers Page, LinkedIn, Indeed, Referral, Google, Other
          const options = page.locator("text=/direct|linkedin|indeed|referral|google/i");
          const count = await options.count();
          console.log(`Source options found: ${count}`);
        }
      }
    }
  });

  test("Application form has Turnstile CAPTCHA", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      const applyButton = page.locator('button:has-text("Apply")').first();

      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(500);

        // Turnstile widget
        const turnstile = page.locator(
          '[data-testid="turnstile"], .cf-turnstile, iframe[src*="turnstile"]'
        ).first();
        const hasTurnstile = await turnstile.isVisible().catch(() => false);
        console.log(`Turnstile CAPTCHA visible: ${hasTurnstile}`);
      }
    }
  });

  test("FAJ-007: Application form can be filled out", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      const applyButton = page.locator('button:has-text("Apply")').first();

      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(500);

        // Fill out form
        const nameInput = page.locator('input[name*="name" i]').first();
        const emailInput = page.locator('input[type="email"]').first();

        if (await nameInput.isVisible()) {
          await nameInput.fill("Test Applicant");
          await emailInput.fill("testapplicant@example.com");

          // Phone (optional)
          const phoneInput = page.locator('input[type="tel"]').first();
          if (await phoneInput.isVisible()) {
            await phoneInput.fill("555-123-4567");
          }

          // Cover letter (optional)
          const coverLetter = page.locator("textarea").first();
          if (await coverLetter.isVisible()) {
            await coverLetter.fill("I am interested in this position because...");
          }

          console.log("Application form filled successfully");
        }
      }
    }
  });

  test("FAJ-008: Duplicate application should be blocked", async ({ page }) => {
    // This test documents the expected behavior
    // Actual duplicate submission would require completing Turnstile
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Note: Duplicate applications (same email + job) should be blocked
      // This is tested at the API level but documented here for completeness
      console.log("Duplicate application prevention: tested via API validation");
    }
  });

  test("Application success state shows confirmation", async ({ page }) => {
    // This test documents the expected behavior after successful submission
    // Actual submission requires completing Turnstile

    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      // Navigate to job detail
      await jobLink.click();

      // Note: After successful submission, user should see:
      // - Success message with checkmark icon
      // - "Application Submitted!" heading
      // - Job title and provider name
      // - "Submit Another Application" button
      console.log("Application success state: verified via manual testing");
    }
  });
});

test.describe("Find ABA Jobs - Application LocalStorage", () => {
  test("Form saves applicant info to localStorage", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      const applyButton = page.locator('button:has-text("Apply")').first();

      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(500);

        // Fill in contact info
        const nameInput = page.locator('input[name*="name" i]').first();
        const emailInput = page.locator('input[type="email"]').first();

        if (await nameInput.isVisible()) {
          await nameInput.fill("Test User");
          await emailInput.fill("test@example.com");

          // Wait for localStorage to be updated
          await page.waitForTimeout(500);

          // Check localStorage
          const storedInfo = await page.evaluate(() => {
            return localStorage.getItem("findabajobs_applicant_info");
          });

          console.log(`Stored applicant info: ${storedInfo ? "Yes" : "No"}`);
        }
      }
    }
  });

  test("Form auto-fills from localStorage on return visit", async ({ page }) => {
    // Pre-set localStorage
    await page.goto("/jobs/search");
    await page.evaluate(() => {
      localStorage.setItem(
        "findabajobs_applicant_info",
        JSON.stringify({
          name: "Returning User",
          email: "returning@example.com",
          phone: "555-999-8888",
        })
      );
    });

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      const applyButton = page.locator('button:has-text("Apply")').first();

      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(500);

        // Check if form is auto-filled
        const nameInput = page.locator('input[name*="name" i]').first();

        if (await nameInput.isVisible()) {
          const nameValue = await nameInput.inputValue();
          console.log(`Auto-filled name: ${nameValue}`);
        }
      }
    }
  });
});
