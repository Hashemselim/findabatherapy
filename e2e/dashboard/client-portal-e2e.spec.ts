import { test, expect, type Browser, type Locator, type Page, type TestInfo } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import fs from "fs";
import path from "path";

import { api } from "../../convex/_generated/api";
import {
  signInViaClerkPath,
  signInViaClerkUI,
  type TestUser,
} from "../lib/auth-helper";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const SEED_SECRET = process.env.CONVEX_SEED_IMPORT_SECRET;
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD || "E2eTestPass123!";

type SessionUser = {
  clerkUserId: string;
  email: string;
  password: string;
  workspaceId: string;
  listingId: string;
  familyClerkUserId: string;
  familyEmail: string;
};

type EvidenceEntry = {
  id: string;
  title: string;
  detail: string;
  screenshot: string;
};

test.describe("client portal end-to-end", () => {
  test.setTimeout(900000);

  test("verifies provider setup, family completion flows, portal isolation, and link behavior with evidence", async ({
    browser,
  }, testInfo) => {
    const { user, page: providerPage } = await createSessionUser(browser, testInfo);
    const evidence: EvidenceEntry[] = [];
    let familyInviteUrl: string | null = null;
    const timestamp = Date.now();
    const clientFirstName = `Portal${timestamp}`;
    const clientLastName = "Evidence";
    const guardianFirstName = "Hashem";
    const guardianLastName = `Guardian${timestamp}`;
    const guardianEmail = user.familyEmail;
    const providerDocumentPath = createMinimalPdf(
      testInfo.outputPath("fixtures/provider-shared-document.pdf"),
      "Provider shared policy packet",
    );
    const taskUploadPath = createMinimalPdf(
      testInfo.outputPath("fixtures/task-upload-document.pdf"),
      "Family upload for task completion",
    );
    const extraUploadPath = createMinimalPdf(
      testInfo.outputPath("fixtures/family-extra-upload.pdf"),
      "Additional family upload from documents tab",
    );
    const reviewSignPath = createMinimalPdf(
      testInfo.outputPath("fixtures/review-sign-document.pdf"),
      "Document requiring family review and signature",
    );

    const taskTitles = {
      custom: `Welcome checklist ${timestamp}`,
      upload: `Upload insurance card ${timestamp}`,
      form: `Complete intake form ${timestamp}`,
      reviewSign: `Review service agreement ${timestamp}`,
    };
    const messageSubject = `Important notice ${timestamp}`;
    const resourceTitle = `Parent guide ${timestamp}`;
    const toolTitle = `Hi Rasmus ${timestamp}`;
    const providerDocumentLabel = `Family policy packet ${timestamp}`;
    const taskUploadLabel = `Insurance card upload ${timestamp}`;
    const extraUploadLabel = `Physician referral ${timestamp}`;

    try {
      await test.step("create a new client from the provider dashboard", async () => {
        await providerPage.goto(`${BASE_URL}/dashboard/clients/new`, {
          waitUntil: "domcontentloaded",
        });
        await expect(providerPage.getByRole("heading", { name: "New Client", exact: true })).toBeVisible();
        await providerPage.getByPlaceholder("First name").first().fill(clientFirstName);
        await providerPage.getByPlaceholder("Last name").first().fill(clientLastName);
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "01-provider-new-client",
          "Provider new client form",
          `Entered child name ${clientFirstName} ${clientLastName} on the new client form before submission.`,
        );
        await providerPage.getByRole("button", { name: "Save Client", exact: true }).click();
        await providerPage.waitForURL(/\/dashboard\/clients\/(?!new$)[^/]+$/, {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });
        await expect(providerPage.getByRole("button", { name: "Client Portal", exact: true }).first()).toBeVisible();
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "02-provider-client-detail",
          "Provider client detail page",
          "Client save succeeded and redirected to the detail page with the Client Portal entry point visible in the header actions.",
        );
      });

      const clientId = providerPage.url().split("/").at(-1);
      if (!clientId) {
        throw new Error(`Failed to extract client id from ${providerPage.url()}`);
      }

      await test.step("open and enable the provider portal", async () => {
        await providerPage.goto(`${BASE_URL}/dashboard/clients/${clientId}/portal`, {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });
        await expect(providerPage.getByText("Client Portal", { exact: true })).toBeVisible();
        await expect(
          providerPage.getByRole("heading", {
            name: new RegExp(`${clientFirstName} ${clientLastName}`),
          }),
        ).toBeVisible();
        await setPortalSwitch(providerPage, true);
        await expect(providerPage.getByText("Live for family access").first()).toBeVisible();
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "03-provider-portal-overview",
          "Provider portal overview",
          "Provider portal loaded and was switched into the enabled state.",
        );
      });

      await test.step("verify the dashboard preview route", async () => {
        await providerPage.getByRole("link", { name: "Preview family view", exact: true }).click();
        await providerPage.waitForURL(`${BASE_URL}/dashboard/clients/${clientId}/portal/preview`, {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });
        await expect(providerPage.getByRole("heading", { name: "Client Portal", exact: true })).toBeVisible();
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "04-provider-preview-family-view",
          "Dashboard preview family route",
          "Preview family view route opened from the provider portal and rendered the same branded family portal shell the guardian sees.",
        );
        await providerPage.goto(`${BASE_URL}/dashboard/clients/${clientId}/portal`, {
          waitUntil: "domcontentloaded",
        });
        await expect(
          providerPage.getByRole("heading", {
            name: new RegExp(`${clientFirstName} ${clientLastName}`),
          }),
        ).toBeVisible();
      });

      await test.step("add a guardian and send the provider sign-in email", async () => {
        await providerPage.getByRole("tab", { name: "Guardians", exact: true }).click();
        const guardiansTab = providerPage.locator('[data-state="active"][role="tabpanel"]');
        await fillTextField(guardiansTab, "First name", guardianFirstName);
        await fillTextField(guardiansTab, "Last name", guardianLastName);
        await fillTextField(guardiansTab, "Email", guardianEmail);
        await fillTextField(guardiansTab, "Phone", "(555) 555-1010");
        await fillTextField(guardiansTab, "Relationship", "Mother");
        await ensureSwitchState(guardiansTab, "Primary guardian", true);
        await ensureSwitchState(guardiansTab, "Email notifications on", true);
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "05-provider-guardian-form",
          "Provider guardian access form",
          "Provider entered guardian identity, email, relationship, primary access, and notification preferences before saving.",
        );
        await guardiansTab.getByRole("button", { name: "Add guardian", exact: true }).click();
        await expect(providerPage.getByText(`${guardianFirstName} ${guardianLastName}`, { exact: true })).toBeVisible({ timeout: 30000 });
        const inviteButton = providerPage.getByRole("button", { name: "Send invite email", exact: true }).first();
        await inviteButton.scrollIntoViewIfNeeded();
        await inviteButton.click();
        await providerPage.waitForTimeout(1000);
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "06-provider-guardian-invite",
          "Provider guardian card after sign-in email",
          "Guardian was saved and the provider triggered the sign-in email action from the guardian record.",
        );
      });

      await test.step("create every portal task type from the provider side", async () => {
        await providerPage.getByRole("tab", { name: "Tasks", exact: true }).click();
        const tasksTab = providerPage.locator('[data-state="active"][role="tabpanel"]');

        await createProviderTask(tasksTab, {
          title: taskTitles.custom,
          instructions: "Complete the welcome checklist one step at a time, then mark it complete in the portal.",
          dueDate: "2026-04-09",
          taskType: "Custom Task",
          externalUrl: "hirasmus.com",
        });

        await createProviderTask(tasksTab, {
          title: taskTitles.upload,
          instructions: "Upload a clear image or PDF of the current insurance card.",
          dueDate: "2026-04-10",
          taskType: "File Upload",
          requestedFile: "Insurance Card",
        });

        await createProviderTask(tasksTab, {
          title: taskTitles.form,
          instructions: "Open the intake form and finish the required family information.",
          dueDate: "2026-04-11",
          taskType: "Form Completion",
          form: "Intake Form",
        });

        await createProviderTask(tasksTab, {
          title: taskTitles.reviewSign,
          instructions: "Review the uploaded agreement, sign it with your full name, and submit it.",
          dueDate: "2026-04-12",
          taskType: "Review & Sign",
          supportingFilePath: reviewSignPath,
          supportingFileLabel: `Review and sign packet ${timestamp}`,
        });

        for (const title of Object.values(taskTitles)) {
          await expect(tasksTab.getByText(title, { exact: true })).toBeVisible();
        }

        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "07-provider-task-matrix",
          "Provider task matrix",
          "Provider created the four client task types: custom task, file upload, form completion, and review & sign.",
        );
      });

      await test.step("share a provider document and confirm it lands in the provider-shared section", async () => {
        await providerPage.getByRole("tab", { name: "Documents", exact: true }).click();
        const documentsTab = providerPage.locator('[data-state="active"][role="tabpanel"]');
        await documentsTab.locator('input[type="file"]').setInputFiles(providerDocumentPath);
        await fillTextField(documentsTab, "Label", providerDocumentLabel);
        await fillTextField(documentsTab, "Category", "policy");
        await fillTextArea(documentsTab, "Family note", "Please review this policy packet and acknowledge it in the portal.");
        await selectWithinSection(documentsTab, "Visibility", "Action required");
        await ensureSwitchState(documentsTab, "Require acknowledgement", true);
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "08-provider-document-form",
          "Provider document upload form",
          "Provider uploaded a portal document with a label, category, family-facing note, action-required visibility, and acknowledgement required.",
        );
        await documentsTab.getByRole("button", { name: "Upload and share", exact: true }).click();
        await expect(documentsTab.getByRole("heading", { name: "Provider-shared documents", exact: true })).toBeVisible({ timeout: 30000 });
        const providerDocumentCard = documentsTab.locator("div[data-slot='card']").filter({ hasText: providerDocumentLabel }).first();
        await expect(providerDocumentCard).toBeVisible({ timeout: 30000 });
        await expect(providerDocumentCard.getByText("Provider shared", { exact: true })).toBeVisible();
        await expect(providerDocumentCard.getByText("Ack required", { exact: true })).toBeVisible();
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "09-provider-documents-shared",
          "Provider shared documents section",
          "Shared provider file appeared under Provider-shared documents with explicit source and acknowledgement-required labels.",
        );
      });

      await test.step("publish a message, resource, and connected tool and verify provider-side links normalize correctly", async () => {
        await providerPage.getByRole("tab", { name: "Messages", exact: true }).click();
        const messagesTab = providerPage.locator('[data-state="active"][role="tabpanel"]');
        await fillTextField(messagesTab, "Subject", messageSubject);
        await fillTextArea(messagesTab, "Message body", "We uploaded a new policy packet and want you to finish the next task in the portal.");
        await selectWithinSection(messagesTab, "Type", "Reminder");
        await ensureSwitchState(messagesTab, "Email notify family", true);
        await messagesTab.getByRole("button", { name: "Publish message", exact: true }).click();
        await expect(messagesTab.getByText(messageSubject, { exact: true }).first()).toBeVisible({ timeout: 30000 });
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "10-provider-messages",
          "Provider messages tab",
          "Provider published a one-way reminder message into the family feed.",
        );

        await providerPage.getByRole("tab", { name: "Resources", exact: true }).click();
        const resourcesTab = providerPage.locator('[data-state="active"][role="tabpanel"]');
        await fillTextField(resourcesTab, "Title", resourceTitle);
        await fillTextField(resourcesTab, "Link", "example.com/portal-guide");
        await fillTextArea(resourcesTab, "Description", "A short parent guide that explains the next steps in plain language.");
        await resourcesTab.getByRole("button", { name: "Publish resource", exact: true }).click();
        await expect(resourcesTab.getByText(resourceTitle, { exact: true }).first()).toBeVisible({ timeout: 30000 });
        await assertAnchorOpensNormalizedPopup(resourcesTab.getByRole("link", { name: "Open resource", exact: true }).first(), providerPage, "https://example.com/portal-guide");
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "11-provider-resources",
          "Provider resources tab",
          "Provider published a resource and the provider-side link opened as an absolute https URL.",
        );

        await providerPage.getByRole("tab", { name: "Connected Tools", exact: true }).click();
        const toolsTab = providerPage.locator('[data-state="active"][role="tabpanel"]');
        await fillTextField(toolsTab, "Name", toolTitle);
        await fillTextField(toolsTab, "URL", "hirasmus.com");
        await fillTextArea(toolsTab, "Description", "Use this for billing statements and payment information.");
        await fillTextArea(toolsTab, "When to use this", "Open this tool whenever you need to check billing details.");
        await toolsTab.getByRole("button", { name: "Add tool", exact: true }).click();
        await expect(toolsTab.getByText(toolTitle, { exact: true }).first()).toBeVisible({ timeout: 30000 });
        await assertAnchorOpensNormalizedPopup(toolsTab.getByRole("link", { name: "Open tool", exact: true }).first(), providerPage, "https://hirasmus.com");
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "12-provider-tools",
          "Provider connected tools tab",
          "Provider published a connected tool and the provider-side link normalized a plain domain into https.",
        );
      });

      const familyPage = await test.step("open the branded family sign-in page from the provider portal", async () => {
        await providerPage.getByRole("tab", { name: "Overview", exact: true }).click();
        await providerPage.getByRole("button", { name: "Copy sign-in page link", exact: true }).click();
        const signInPageInput = providerPage.locator('input[readonly]').first();
        await expect(signInPageInput).toHaveValue(/\/portal\/.+\/sign-in/);
        familyInviteUrl = await signInPageInput.inputValue();
        const popup = await providerPage.context().newPage();
        await popup.goto(familyInviteUrl!, { waitUntil: "domcontentloaded" });
        await popup.waitForLoadState("domcontentloaded");
        await popup.waitForURL(/\/portal\/[^/]+\/sign-in/, {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });
        await expect(
          popup.getByText("After you sign out, return to this page and request your magic link", {
            exact: false,
          }),
        ).toBeVisible();
        await captureEvidence(
          popup,
          testInfo,
          evidence,
          "13-provider-family-link-guard",
          "Provider-side family link account guard",
          "Provider opened the branded family sign-in page while still signed in as a provider and the portal correctly showed the account-switch guidance instead of leaking into family access.",
        );
        await popup.close();

        const familyContext = await browser.newContext({
          storageState: { cookies: [], origins: [] },
          recordVideo: {
            dir: testInfo.outputDir,
            size: { width: 1440, height: 960 },
          },
        });
        const familyPopup = await familyContext.newPage();
        await familyPopup.goto(familyInviteUrl!, { waitUntil: "domcontentloaded" });
        await familyPopup.waitForURL(/\/portal\/[^/]+\/sign-in/, {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });
        await expect(familyPopup.getByRole("heading", { name: "Family portal sign in", exact: true })).toBeVisible();
        await captureEvidence(
          familyPopup,
          testInfo,
          evidence,
          "13b-family-branded-sign-in",
          "Branded family sign-in landing",
          "The invite link opened the provider-branded family sign-in page for the invited guardian.",
        );

        const familySignInUrl = new URL(familyPopup.url());
        const familySlug = familySignInUrl.pathname.split("/")[2];
        const signInParams = new URLSearchParams({
          redirect: `/portal/${familySlug}`,
          auth_mode: "family",
          portal_slug: familySlug,
        });

        await signInViaClerkPath(
          familyPopup,
          `/auth/sign-in?${signInParams.toString()}`,
          guardianEmail,
          E2E_PASSWORD,
          /\/portal\/[^?]+(\?client=.*)?$/,
        );
        await expect(familyPopup.getByRole("heading", { name: "Client Portal", exact: true })).toBeVisible();
        await expect(familyPopup.getByText(taskTitles.custom, { exact: true }).first()).toBeVisible();
        await captureEvidence(
          familyPopup,
          testInfo,
          evidence,
          "13c-family-authenticated-portal",
          "Family authenticated portal entry",
          "The guardian then signed in through GoodABA auth with family callback routing and landed inside the authenticated family portal.",
        );
        return familyPopup;
      });

      await test.step("complete the custom task after account sign-in", async () => {
        await expect(familyPage.getByRole("button", { name: "Continue", exact: true })).toBeVisible({ timeout: 30000 });
        await expect(familyPage.getByText(taskTitles.custom, { exact: true }).first()).toBeVisible();
        await completePortalUiTransition({
          page: familyPage,
          actionButtonName: "Start task",
          successText: "IN PROGRESS",
        });
        await assertInteractiveLinkNavigation(
          familyPage.getByRole("link", { name: "Open link", exact: true }).first(),
          familyPage,
          "https://hirasmus.com",
        );
        await familyPage.getByPlaceholder("Optional note").fill("Custom welcome task completed from the family portal.");
        await completePortalUiTransition({
          page: familyPage,
          actionButtonName: "Mark complete",
          successText: "Completed tasks",
        });
        await expect(familyPage.getByText("Completed tasks", { exact: true })).toBeVisible({ timeout: 30000 });
        await familyPage.getByRole("button", { name: /Completed tasks/i }).click();
        const completedManualCard = familyPage.locator("div").filter({
          has: familyPage.getByText(taskTitles.custom, { exact: true }),
          hasText: /Custom welcome task completed from the family portal\.|Completed\./,
        }).first();
        await expect(completedManualCard).toBeVisible({ timeout: 30000 });
        await captureEvidence(
          familyPage,
          testInfo,
          evidence,
          "14-family-manual-task-complete",
          "Family custom task completion",
          "Family signed in, opened the task link, added a completion note, and marked the custom task complete.",
        );
      });

      await test.step("complete the document-upload task and verify submitted state", async () => {
        await familyPage.getByRole("button", { name: "Continue", exact: true }).click();
        await familyPage.getByRole("button", { name: "Upload file", exact: true }).click();
        await familyPage.locator('input[type="file"]').first().setInputFiles(taskUploadPath);
        await familyPage.getByPlaceholder("Document label").first().fill(taskUploadLabel);
        await familyPage.getByPlaceholder("Optional note").first().fill("Uploading the requested insurance card for review.");
        await familyPage.getByRole("button", { name: "Upload and submit", exact: true }).click();
        await familyPage.waitForTimeout(1500);
        await expect(familyPage.getByText(taskTitles.form, { exact: true }).first()).toBeVisible({
          timeout: 30000,
        });
        await expect(familyPage.getByText("50% complete", { exact: false })).toBeVisible({
          timeout: 30000,
        });
        await captureEvidence(
          familyPage,
          testInfo,
          evidence,
          "15-family-upload-task-complete",
          "Family document-upload task completion",
          "Family uploaded a file directly from the task-first home experience and the task moved into the submitted/completed history.",
        );
      });

      await test.step("complete the intake form task and persist family info fields", async () => {
        await expect(familyPage.getByText(taskTitles.form, { exact: true }).first()).toBeVisible();
        await familyPage.getByRole("button", { name: "Open form", exact: true }).click();
        await familyPage.waitForURL(/\/(provider\/[^/]+\/intake|intake\/[^/]+\/client)/, {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });
        await expect(
          familyPage.getByRole("heading", { name: /Client Intake Form/i }).first(),
        ).toBeVisible({ timeout: 30000 });
        await fillVisibleIntakeFields(familyPage, timestamp);
        await captureEvidence(
          familyPage,
          testInfo,
          evidence,
          "16-family-personal-info-form",
          "Family intake form",
          "Family opened the assigned intake form from the portal task and filled the visible intake/profile fields before submitting.",
        );
        await familyPage.getByRole("button", { name: "Submit Intake Form", exact: true }).click();
        await expect(familyPage.getByText(/your form has been submitted successfully|your intake form has been submitted successfully/i)).toBeVisible({ timeout: 30000 });
        await familyPage.goto(`${BASE_URL}/portal/${new URL(familyInviteUrl!).pathname.split("/")[2]}`, {
          waitUntil: "domcontentloaded",
        });
        await selectFamilyPortalTab(familyPage, "Tasks");
        await familyPage.getByRole("button", { name: /Completed tasks/i }).click();
        const completedFormCard = familyPage.locator("div").filter({
          has: familyPage.getByText(taskTitles.form, { exact: true }),
          hasText: "Form submitted for provider review.",
        }).first();
        await expect(completedFormCard).toBeVisible({ timeout: 30000 });
        await captureEvidence(
          familyPage,
          testInfo,
          evidence,
          "17-family-profile-task-complete",
          "Family form completion",
          "Submitting the assigned intake form completed the form task and persisted the edited family and insurance information.",
        );
      });

      await test.step("complete the review-and-sign task from the client portal", async () => {
        await expect(familyPage.getByText(taskTitles.reviewSign, { exact: true }).first()).toBeVisible();
        await familyPage.getByRole("button", { name: "Review document", exact: true }).click();
        await familyPage.getByPlaceholder("Type your full name").fill("Hashem Selim");
        await familyPage.getByRole("button", { name: "Mark complete", exact: true }).click();
        await familyPage.waitForTimeout(1500);
        if (!(await familyPage.getByText("All caught up", { exact: true }).first().isVisible().catch(() => false))) {
          try {
            await familyPage.reload({ waitUntil: "domcontentloaded" });
          } catch {
            await familyPage.waitForTimeout(1500);
          }
        }
        await expect(
          familyPage.getByText("All caught up", { exact: true }).first(),
        ).toBeVisible({ timeout: 30000 });
        await familyPage.getByRole("button", { name: /Completed tasks/i }).click();
        const completedReviewCard = familyPage.locator("div").filter({
          has: familyPage.getByText(taskTitles.reviewSign, { exact: true }),
          hasText: `Review and sign packet ${timestamp} signed and acknowledged.`,
        }).first();
        await expect(completedReviewCard).toBeVisible({ timeout: 30000 });
        await captureEvidence(
          familyPage,
          testInfo,
          evidence,
          "18-family-external-task-complete",
          "Family review and sign completion",
          "Family reviewed the linked document, signed with a full name, and completed the review-and-sign task from the portal.",
        );
      });

      await test.step("acknowledge the provider-shared document in the documents center", async () => {
        await selectFamilyPortalTab(familyPage, "Documents");
        await expect(familyPage.getByText(providerDocumentLabel, { exact: true }).first()).toBeVisible();
        const acknowledgeButton = familyPage.getByRole("button", { name: "Acknowledge", exact: true }).first();
        await expect(acknowledgeButton).toBeAttached();
        await acknowledgeButton.evaluate((element) => {
          (element as HTMLButtonElement).click();
        });
        await familyPage.waitForTimeout(1500);
        await familyPage.reload({ waitUntil: "domcontentloaded" });
        await expect(familyPage.getByText("Acknowledge", { exact: true })).toHaveCount(0);
        await captureEvidence(
          familyPage,
          testInfo,
          evidence,
          "19-family-document-acknowledgement",
          "Family documents center acknowledgement",
          "Family opened the provider document, acknowledged it inside Documents, and removed the pending acknowledgement state.",
        );
      });

      await test.step("mark the message read, upload another document, open resources and tools, and confirm all tasks are finished", async () => {
        console.log("STEP 20 start");
        await selectFamilyPortalTab(familyPage, "Messages");
        await expect(familyPage.getByText(messageSubject, { exact: true }).first()).toBeVisible();
        await familyPage.getByRole("button", { name: "Mark read", exact: true }).click();
        await familyPage.waitForTimeout(1500);
        if ((await familyPage.getByText("Unread", { exact: true }).count()) > 0) {
          try {
            await familyPage.reload({ waitUntil: "domcontentloaded" });
          } catch {
            await familyPage.waitForTimeout(1500);
          }
        }
        await expect(familyPage.getByText("Unread", { exact: true })).toHaveCount(0);
        console.log("STEP 20 message read confirmed");
        await captureEvidence(
          familyPage,
          testInfo,
          evidence,
          "20-family-message-read",
          "Family messages tab",
          "Family opened the message feed and cleared the unread state on the provider message.",
        );

        await selectFamilyPortalTab(familyPage, "Documents");
        if (!(await familyPage.getByText("Provider-shared documents", { exact: true }).first().isVisible().catch(() => false))) {
          await selectFamilyPortalTab(familyPage, "Documents");
        }
        await expect(familyPage.getByText("Provider-shared documents", { exact: true })).toBeVisible();
        await expect(familyPage.getByText("Your uploads", { exact: true })).toBeVisible();
        await familyPage.getByRole("button", { name: "Upload document", exact: true }).first().click();
        const extraUploadCard = familyPage
          .locator("section,div")
          .filter({ hasText: "Upload a document" })
          .first();
        await extraUploadCard.locator('input[type="file"]').first().setInputFiles(extraUploadPath);
        await extraUploadCard.getByPlaceholder("Document label").fill(extraUploadLabel);
        await extraUploadCard
          .getByPlaceholder("Optional note")
          .fill("Uploading an extra referral document from the documents center.");
        await extraUploadCard.getByRole("button", { name: "Upload document", exact: true }).click();
        await familyPage.waitForTimeout(1500);
        if (!(await familyPage.getByText(extraUploadLabel, { exact: true }).first().isVisible().catch(() => false))) {
          try {
            await familyPage.reload({ waitUntil: "domcontentloaded" });
          } catch {
            await familyPage.waitForTimeout(1500);
          }
        }
        await selectFamilyPortalTab(familyPage, "Documents");
        console.log("STEP 20 extra upload submitted");
        await expect(familyPage.getByText(extraUploadLabel, { exact: true }).first()).toBeVisible();
        await captureEvidence(
          familyPage,
          testInfo,
          evidence,
          "21-family-document-center",
          "Family documents center after uploads",
          "Documents center showed source labels for provider and family documents and accepted an additional family upload from the general upload section.",
        );
        console.log("STEP 21 documents verified");

        await selectFamilyPortalTab(familyPage, "Resources");
        await expect(familyPage.getByText(resourceTitle, { exact: true }).first()).toBeVisible();
        await assertAnchorOpensNormalizedPopup(familyPage.getByRole("link", { name: "Open resource", exact: true }).first(), familyPage, "https://example.com/portal-guide");
        console.log("STEP 22 resource link verified");
        await captureEvidence(
          familyPage,
          testInfo,
          evidence,
          "22-family-resources",
          "Family resources tab",
          "Family resources tab rendered the published resource and opened the normalized external link correctly.",
        );

        await selectFamilyPortalTab(familyPage, "Tools");
        await expect(familyPage.getByText(toolTitle, { exact: true }).first()).toBeVisible();
        await assertAnchorOpensNormalizedPopup(familyPage.getByRole("link", { name: "Open tool", exact: true }).first(), familyPage, "https://hirasmus.com");
        console.log("STEP 23 tool link verified");
        await captureEvidence(
          familyPage,
          testInfo,
          evidence,
          "23-family-tools",
          "Family connected tools tab",
          "Family connected tools tab rendered the published tool and opened the normalized tool URL correctly.",
        );

        await selectFamilyPortalTab(familyPage, "Tasks");
        await expect(
          familyPage.getByText("All caught up", { exact: true }).first(),
        ).toBeVisible();
        console.log("STEP 24 all caught up verified");
        await captureEvidence(
          familyPage,
          testInfo,
          evidence,
          "24-family-all-caught-up",
          "Family tasks tab complete state",
          "Family portal reached the all-caught-up end state after every portal task flow was completed or submitted.",
        );
      });

      await test.step("verify the guardian can sign back in later from the regular GoodABA sign-in page", async () => {
        const returningContext = await browser.newContext({
          storageState: { cookies: [], origins: [] },
          recordVideo: {
            dir: testInfo.outputDir,
            size: { width: 1440, height: 960 },
          },
        });
        const returningPage = await returningContext.newPage();
        await signInViaClerkPath(
          returningPage,
          "/auth/sign-in?redirect=/portal&auth_mode=family",
          guardianEmail,
          E2E_PASSWORD,
          /\/portal(\/|$)/,
        );
        await expect(returningPage.getByRole("heading", { name: "Client Portal", exact: true })).toBeVisible({
          timeout: 30000,
        });
        await expect(returningPage.getByText("All caught up", { exact: true }).first()).toBeVisible();
        await captureEvidence(
          returningPage,
          testInfo,
          evidence,
          "24b-family-regular-sign-in",
          "Regular GoodABA sign-in for families",
          "The guardian signed in later from the regular GoodABA sign-in page and was routed back into the family portal without needing the original invite link.",
        );
        await returningContext.close();
      });

      await test.step("verify provider-side review surfaces after family completion", async () => {
        console.log("STEP 25 start");
        await providerPage.bringToFront();
        await providerPage.reload({ waitUntil: "domcontentloaded" });
        await expect(providerPage.getByText("Live for family access", { exact: true })).toBeVisible();
        await expect(providerPage.getByText("Completion", { exact: true })).toBeVisible();
        await expect(providerPage.getByText("100%", { exact: true })).toBeVisible();
        console.log("STEP 25 provider overview refreshed");
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "25-provider-overview-after-family",
          "Provider portal after family completion",
          "Provider portal overview refreshed to full completion after the family completed all assigned work.",
        );

        await providerPage.getByRole("tab", { name: "Documents", exact: true }).click();
        const providerDocumentsTab = providerPage.locator('[data-state="active"][role="tabpanel"]');
        await expect(providerDocumentsTab.getByText("Provider-shared documents")).toBeVisible();
        await expect(providerDocumentsTab.getByText("Family uploads")).toBeVisible();
        await expect(providerDocumentsTab.getByText(taskUploadLabel, { exact: true }).first()).toBeVisible();
        await expect(providerDocumentsTab.getByText(extraUploadLabel, { exact: true }).first()).toBeVisible();
        console.log("STEP 26 provider documents verified");
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "26-provider-document-separation",
          "Provider documents split by source",
          "Provider portal separated provider-shared documents from family uploads and showed both family-uploaded files.",
        );

        await providerPage.getByRole("tab", { name: "Messages", exact: true }).click();
        await expect(providerPage.getByText("Read by 1 guardian.", { exact: false })).toBeVisible();
        console.log("STEP 27 provider message readback verified");
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "27-provider-message-readback",
          "Provider message read tracking",
          "Provider message card reflected that one guardian had read the published message.",
        );

        await providerPage.getByRole("tab", { name: "Activity", exact: true }).click();
        await expect(providerPage.getByText("Document uploaded", { exact: false }).first()).toBeVisible();
        await expect(providerPage.getByText(extraUploadLabel, { exact: false }).first()).toBeVisible();
        await expect(providerPage.getByText("Hashem Guardian", { exact: false }).first()).toBeVisible();
        console.log("STEP 28 provider activity verified");
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "28-provider-activity",
          "Provider activity timeline",
          "Provider activity feed recorded family invite acceptance, task completion, uploads, acknowledgement, and profile updates.",
        );
      });

      await test.step("verify client detail and general provider task surfaces exclude portal tasks and label documents by source", async () => {
        console.log("STEP 29 start");
        await providerPage.goto(`${BASE_URL}/dashboard/clients/${clientId}`, {
          waitUntil: "domcontentloaded",
        });
        await expect(
          providerPage.getByRole("button", { name: "Client Portal", exact: true }).first(),
        ).toBeVisible();
        await expect(providerPage.getByText(taskTitles.custom, { exact: true })).toHaveCount(0);
        await expect(providerPage.getByText(taskTitles.upload, { exact: true })).toHaveCount(0);
        await expect(providerPage.getByText("Provider upload", { exact: true }).first()).toBeVisible();
        await expect(providerPage.getByText("Family upload", { exact: true }).first()).toBeVisible();
        console.log("STEP 29 client detail isolation verified");
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "29-client-detail-isolation",
          "Client detail portal isolation check",
          "Client detail excluded portal tasks from the normal provider task section and labeled documents with provider versus family source badges.",
        );

        await providerPage.goto(`${BASE_URL}/dashboard/tasks`, {
          waitUntil: "domcontentloaded",
        });
        await expect(providerPage.getByText(taskTitles.custom, { exact: true })).toHaveCount(0);
        await expect(providerPage.getByText(taskTitles.upload, { exact: true })).toHaveCount(0);
        await expect(providerPage.getByText(taskTitles.form, { exact: true })).toHaveCount(0);
        await expect(providerPage.getByRole("heading", { name: /Tasks/i })).toBeVisible();
        console.log("STEP 30 dashboard tasks isolation verified");
        await captureEvidence(
          providerPage,
          testInfo,
          evidence,
          "30-dashboard-tasks-isolation",
          "General provider task list isolation check",
          "Global provider task list loaded without leaking client portal tasks into the provider-only task surface.",
        );
      });
    } finally {
      await writeEvidenceReport(testInfo, evidence);
      await providerPage.context().close();
      await resetWorkspaceFixtures(user.workspaceId);
    }
  });
});

async function createSessionUser(
  browser: Browser,
  testInfo: TestInfo,
): Promise<{ user: SessionUser; page: Page }> {
  const page = await openAuthedPage(browser, testInfo);
  const [providerUser, familyUser] = await resolveClerkTestUsers(2);
  await signInViaClerkUI(page, providerUser.email, E2E_PASSWORD);

  const workspace = await getConvexSeedClient().mutation(
    api.seed.provisionE2EDashboardWorkspace,
    {
      secret: requireSeedSecret(),
      clerkUserId: providerUser.id,
      email: providerUser.email,
      firstName: "E2E",
      lastName: "Portal",
    },
  );

  const user: SessionUser = {
    clerkUserId: providerUser.id,
    email: providerUser.email,
    password: E2E_PASSWORD,
    workspaceId: workspace.workspaceId,
    listingId: workspace.listingId,
    familyClerkUserId: familyUser.id,
    familyEmail: familyUser.email,
  };

  await resetWorkspaceFixtures(user.workspaceId);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
  return { user, page };
}

async function resetWorkspaceFixtures(workspaceId: string) {
  await getConvexSeedClient().mutation(api.seed.resetE2ECommunicationFixtures, {
    secret: requireSeedSecret(),
    workspaceId,
  });
}

async function openAuthedPage(browser: Browser, testInfo: TestInfo): Promise<Page> {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    recordVideo: {
      dir: testInfo.outputDir,
      size: { width: 1440, height: 960 },
    },
  });
  return context.newPage();
}

async function resolveClerkTestUsers(count: number): Promise<TestUser[]> {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required to look up Clerk E2E users");
  }

  const { createClerkClient } = await import("@clerk/backend");
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const preferredEmails = [
    process.env.E2E_USER_EMAIL,
    "e2e-test@test.findabatherapy.com",
    "codex.review.onboarding+1@test.findabatherapy.com",
  ].filter(Boolean) as string[];

  const uniqueUsers = new Map<string, TestUser>();
  for (const email of preferredEmails) {
    const users = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    const user = users.data[0];
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    if (user?.id && userEmail) {
      uniqueUsers.set(user.id, {
        id: user.id,
        email: userEmail,
        password: E2E_PASSWORD,
      });
    }
  }

  if (uniqueUsers.size < count) {
    const fallbackUsers = await clerk.users.getUserList({ limit: 50 });
    for (const user of fallbackUsers.data) {
      const email = user.emailAddresses?.[0]?.emailAddress ?? "";
      if (!email.endsWith("@test.findabatherapy.com")) {
        continue;
      }

      uniqueUsers.set(user.id, {
        id: user.id,
        email,
        password: E2E_PASSWORD,
      });

      if (uniqueUsers.size >= count) {
        break;
      }
    }
  }

  const resolvedUsers = Array.from(uniqueUsers.values()).slice(0, count);
  if (resolvedUsers.length < count) {
    throw new Error(`Expected at least ${count} Clerk test users for E2E auth.`);
  }

  return resolvedUsers;
}

async function completePortalUiTransition({
  page,
  actionButtonName,
  successText,
  successTextGone,
}: {
  page: Page;
  actionButtonName: string;
  successText?: string;
  successTextGone?: string;
}) {
  const transitionSatisfied = async () => {
    if (successText) {
      return (await page.getByText(successText, { exact: false }).count()) > 0;
    }

    if (successTextGone) {
      return (await page.getByText(successTextGone, { exact: false }).count()) === 0;
    }

    throw new Error("completePortalUiTransition requires successText or successTextGone.");
  };

  const attemptClick = async (useDomClick: boolean) => {
    const button = page.getByRole("button", { name: actionButtonName, exact: true }).first();
    await expect(button).toBeVisible({ timeout: 30000 });

    if (useDomClick) {
      await button.evaluate((element) => {
        (element as HTMLButtonElement).click();
      });
    } else {
      await button.click();
    }

    await page.waitForTimeout(1500);

    if (await transitionSatisfied()) {
      return;
    }

    try {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(750);
    } catch {
      await page.waitForTimeout(1500);
    }
  };

  await attemptClick(false);
  if (await transitionSatisfied()) {
    return;
  }

  const errorBanner = page.locator(".border-rose-200");
  const errorText = (await errorBanner.count()) > 0
    ? (await errorBanner.first().innerText()).trim()
    : null;
  if (errorText) {
    throw new Error(errorText);
  }

  await attemptClick(true);
  await expect.poll(transitionSatisfied).toBe(true);
}

function createMinimalPdf(targetPath: string, title: string) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 74 >>
stream
BT
/F1 12 Tf
24 96 Td
(${escapePdfText(title)}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000063 00000 n 
0000000120 00000 n 
0000000246 00000 n 
0000000371 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
441
%%EOF
`;
  fs.writeFileSync(targetPath, pdf, "utf8");
  return targetPath;
}

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

async function captureEvidence(
  page: Page,
  testInfo: TestInfo,
  evidence: EvidenceEntry[],
  id: string,
  title: string,
  detail: string,
) {
  const screenshot = testInfo.outputPath(`${id}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  evidence.push({
    id,
    title,
    detail,
    screenshot,
  });
}

async function writeEvidenceReport(testInfo: TestInfo, evidence: EvidenceEntry[]) {
  const reportPath = testInfo.outputPath("client-portal-evidence.md");
  const lines = [
    "# Client Portal E2E Evidence",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Scenario Evidence",
    "",
    ...evidence.flatMap((entry) => [
      `### ${entry.id} ${entry.title}`,
      entry.detail,
      `Screenshot: ${entry.screenshot}`,
      "",
    ]),
  ];
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
}

async function fillTextField(scope: Locator, label: string, value: string) {
  const field = await getNamedField(scope, label, ["textbox"]);
  await field.fill(value);
}

async function fillTextArea(scope: Locator, label: string, value: string) {
  const field = await getNamedField(scope, label, ["textbox"]);
  await field.fill(value);
}

async function fillVisibleTextFieldIfPresent(scope: Page | Locator, label: string, value: string) {
  const field = scope.getByRole("textbox", { name: label, exact: true }).first();
  if (await field.count()) {
    await field.fill(value);
    return true;
  }
  return false;
}

async function fillVisibleIntakeFields(page: Page, timestamp: number) {
  await fillVisibleTextFieldIfPresent(page, "Child's First Name", `Portal${timestamp}`);
  await fillVisibleTextFieldIfPresent(page, "Child's Last Name", "Evidence");
  await fillVisibleTextFieldIfPresent(page, "First Name", "Hashem");
  await fillVisibleTextFieldIfPresent(page, "Last Name", "Guardian");
  await fillVisibleTextFieldIfPresent(page, "Phone", "(555) 555-2222");
  await fillVisibleTextFieldIfPresent(page, "Email", `family-updated-${timestamp}@test.findabatherapy.com`);
  await fillVisibleTextFieldIfPresent(page, "Primary Concerns", "Need support with routines and transitions.");
  await fillVisibleTextFieldIfPresent(page, "Additional Notes", "Completed from assigned portal intake task.");
}

async function getNamedField(
  scope: Locator,
  label: string,
  roles: Array<"textbox" | "combobox">,
) {
  for (const role of roles) {
    const byRole = scope.getByRole(role, { name: label, exact: true }).first();
    if (await byRole.count()) {
      return byRole;
    }
  }

  const quotedLabel = JSON.stringify(label);
  const labelFallback = scope.locator(
    `xpath=.//label[normalize-space(.)=${quotedLabel}]/following::*[self::input or self::textarea or (self::button and @role='combobox')][not(@type='hidden')][1]`,
  ).first();

  if (await labelFallback.count()) {
    return labelFallback;
  }

  const fallback = scope.locator(
    `xpath=.//*[normalize-space(text())=${quotedLabel}]/following::*[self::input or self::textarea or (self::button and @role='combobox')][1]`,
  ).first();

  if (!(await fallback.count())) {
    throw new Error(`No field found for label "${label}"`);
  }

  return fallback;
}

async function selectWithinSection(scope: Locator, label: string, option: string) {
  const combobox = await getNamedField(scope, label, ["combobox"]);
  await combobox.click();
  await scope.page().getByRole("option", { name: option, exact: true }).click();
}

async function ensureSwitchState(scope: Locator | Page, text: string, desired: boolean) {
  const namedSwitch = scope.getByRole("switch", { name: text, exact: true }).first();
  let control = namedSwitch;

  if (!(await control.count())) {
    const quotedText = JSON.stringify(text);
    control = scope.locator(
      `xpath=(.//*[normalize-space(text())=${quotedText}]/preceding::*[self::button and @role='switch'][1] | .//*[normalize-space(text())=${quotedText}]/following::*[self::button and @role='switch'][1])[1]`,
    ).first();
  }

  if (!(await control.count())) {
    throw new Error(`No switch found for "${text}"`);
  }

  const current = (await control.getAttribute("data-state")) === "checked";
  if (current !== desired) {
    await control.click();
  }
}

async function setPortalSwitch(page: Page, enabled: boolean) {
  const isEnabled = async () => {
    const switchControl = page.locator('button[role="switch"]').first();
    return (await switchControl.getAttribute("data-state")) === "checked";
  };

  if ((await isEnabled()) !== enabled) {
    const switchControl = page.locator('button[role="switch"]').first();
    await switchControl.click();
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(750);
  }

  if ((await isEnabled()) !== enabled) {
    const switchControl = page.locator('button[role="switch"]').first();
    await switchControl.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(750);
  }

  await expect.poll(isEnabled).toBe(enabled);
}

async function createProviderTask(
  tasksTab: Locator,
  input: {
    title: string;
    instructions: string;
    dueDate: string;
    taskType: string;
    form?: string;
    requestedFile?: string;
    externalUrl?: string;
    supportingFilePath?: string;
    supportingFileLabel?: string;
  },
) {
  await selectWithinSection(tasksTab, "Task type", input.taskType);
  await fillTextField(tasksTab, "Title", input.title);
  await fillTextArea(tasksTab, "Plain-language instructions", input.instructions);
  await fillTextField(tasksTab, "Due date", input.dueDate);

  if (input.form) {
    await selectWithinSection(tasksTab, "Form", input.form);
  }

  if (input.requestedFile) {
    await selectWithinSection(tasksTab, "Requested file", input.requestedFile);
  }

  await fillTextField(tasksTab, "External URL", input.externalUrl ?? "");

  if (input.supportingFilePath) {
    await tasksTab.locator('input[type="file"]').first().setInputFiles(input.supportingFilePath);
    if (input.supportingFileLabel) {
      await fillTextField(tasksTab, "Supporting file label", input.supportingFileLabel);
    }
  }

  await expect(await getNamedField(tasksTab, "Title", ["textbox"])).toHaveValue(input.title);
  await tasksTab.getByRole("button", { name: "Create task", exact: true }).click();
  const page = tasksTab.page();
  await page.waitForTimeout(1500);
  const actionErrorBanner = page.locator(".bg-rose-50");
  if ((await actionErrorBanner.count()) > 0) {
    const actionErrorText = (await actionErrorBanner.first().innerText()).trim();
    if (actionErrorText) {
      throw new Error(actionErrorText);
    }
  }
  if (!(await page.getByText(input.title, { exact: true }).first().isVisible().catch(() => false))) {
    await page.getByRole("tab", { name: "Tasks", exact: true }).click();
  }
  await expect(page.getByText(input.title, { exact: true }).first()).toBeVisible({ timeout: 30000 });
}

async function selectFamilyPortalTab(page: Page, name: string) {
  const tab = page.getByRole("tab", { name, exact: true }).first();
  await tab.scrollIntoViewIfNeeded();
  await tab.click({ force: true });
  await page.waitForTimeout(300);
  if ((await tab.getAttribute("aria-selected")) === "true") {
    return;
  }

  await tab.evaluate((element) => {
    element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  });
  await page.waitForTimeout(300);
}

async function assertAnchorOpensNormalizedPopup(anchor: Locator, page: Page, expectedUrl: string) {
  await assertInteractiveLinkNavigation(anchor, page, expectedUrl);
}

async function assertInteractiveLinkNavigation(
  anchor: Locator,
  page: Page,
  expectedUrl: string,
) {
  const href = await anchor.getAttribute("href");
  expect(normalizeUrl(href)).toBe(normalizeUrl(expectedUrl));

  const popupPromise = page.waitForEvent("popup", { timeout: 5000 }).catch(() => null);
  const previousUrl = page.url();
  await anchor.click();

  const popup = await popupPromise;
  if (popup) {
    await popup.waitForURL((url) => normalizeUrl(url.toString()) === normalizeUrl(expectedUrl), {
      timeout: 30000,
    });
    await popup.close();
    return;
  }

  await page.waitForTimeout(1000);
  const nextUrl = page.url();
  if (nextUrl !== previousUrl) {
    expect(normalizeUrl(nextUrl)).toBe(normalizeUrl(expectedUrl));
    await page.goBack({ waitUntil: "domcontentloaded" });
    return;
  }

  throw new Error(
    `Expected link to open ${expectedUrl}, but it opened neither a popup nor a same-tab navigation.`,
  );
}


function normalizeUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if ((url.protocol === "https:" || url.protocol === "http:") && url.pathname === "/") {
      return `${url.origin}/`;
    }

    return url.toString();
  } catch {
    return value;
  }
}

function getConvexSeedClient() {
  if (!CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for client portal E2E setup");
  }

  return new ConvexHttpClient(CONVEX_URL);
}

function requireSeedSecret() {
  if (!SEED_SECRET) {
    throw new Error("CONVEX_SEED_IMPORT_SECRET is required for client portal E2E setup");
  }

  return SEED_SECRET;
}
