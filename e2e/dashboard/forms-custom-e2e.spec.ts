import { writeFile } from "node:fs/promises";

import {
  test,
  expect,
  type Browser,
  type BrowserContextOptions,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";

import { api } from "../../convex/_generated/api";
import {
  createClerkTestUser,
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

test.describe("custom forms end-to-end", () => {
  test.setTimeout(900000);
  test.describe.configure({ mode: "serial" });

  test("covers provider builder, public generic link, client assignment, portal completion, notification, and review", async ({
    browser,
  }, testInfo) => {
    const { user, page: providerPage } = await createSessionUser(browser, testInfo);
    const timestamp = Date.now();
    const clientFirstName = `Forms${timestamp}`;
    const clientLastName = "Client";
    const guardianFirstName = "Hashem";
    const guardianLastName = `Guardian${timestamp}`;
    const guardianEmail = user.familyEmail;
    const formTitle = `E2E Custom Form ${timestamp}`;
    const formDescription = "Collect a compact family check-in with conditional follow-up.";
    const shortTextQuestion = "What is the child's preferred name?";
    const singleSelectQuestion = "What setting are you seeking support for?";
    const yesNoQuestion = "Do you want parent training included?";
    const seededQuestions = [
      {
        id: "question_short_text",
        type: "short_text",
        label: shortTextQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "",
        options: [],
        conditions: [],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: null,
        maxLength: null,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_single_select",
        type: "single_select",
        label: singleSelectQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "",
        options: [
          {
            id: "option_home",
            label: "Home",
            value: "",
            hint: "",
          },
          {
            id: "option_school",
            label: "School",
            value: "",
            hint: "",
          },
        ],
        conditions: [],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: null,
        maxLength: null,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_yes_no",
        type: "yes_no",
        label: yesNoQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "",
        options: [],
        conditions: [],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: null,
        maxLength: null,
        matrixRows: [],
        matrixColumns: [],
      },
    ];
    const seededDraftSchemaJson = JSON.stringify(seededQuestions);

    try {
      const clientId = await test.step("seed client and enable portal access", async () => {
        const seededClient = await seedMutation(
          api.seed.provisionE2ECommunicationFixtures,
          {
            secret: requireSeedSecret(),
            workspaceId: user.workspaceId,
            listingId: user.listingId,
            childFirstName: clientFirstName,
            childLastName: clientLastName,
            parentFirstName: guardianFirstName,
            parentLastName: guardianLastName,
            parentEmail: guardianEmail,
            parentClerkUserId: user.familyClerkUserId,
            packetSlug: `forms-e2e-${timestamp}`,
            portalEnabled: true,
          },
        );

        const createdClientId = seededClient.clientId;
        await providerPage.goto(`${BASE_URL}/dashboard/clients/${createdClientId}/portal`, {
          waitUntil: "domcontentloaded",
        });
        await expect(
          providerPage.getByRole("tab", { name: "Guardians", exact: true }),
        ).toBeVisible();
        await expect(providerPage.getByText("Live for family access", { exact: true })).toBeVisible();
        await providerPage.getByRole("tab", { name: "Guardians", exact: true }).click();
        await expect(providerPage.getByText(`${guardianFirstName} ${guardianLastName}`, { exact: true })).toBeVisible();
        return createdClientId;
      });

      const { familyPage, familySlug, familyPortalUrl, templateId } = await test.step("build and publish a reusable custom form", async () => {
        await gotoWithRecovery(
          providerPage,
          `${BASE_URL}/dashboard/forms/custom`,
          providerPage.getByRole("heading", { name: "Forms", exact: true }),
        );
        const seededTemplate = await seedMutation(api.seed.insertE2EFormTemplate, {
          secret: requireSeedSecret(),
          workspaceId: user.workspaceId,
          title: formTitle,
          description: formDescription,
          draftSchemaJson: seededDraftSchemaJson,
        });
        await providerPage.goto(`${BASE_URL}/dashboard/forms/custom/${seededTemplate.templateId}`, {
          waitUntil: "domcontentloaded",
        });
        await expect(providerPage.getByRole("heading", { name: "Form Builder", exact: true })).toBeVisible();
        await expect(providerPage.getByLabel("Form title", { exact: true })).toHaveValue(formTitle);
        await expect(providerPage.getByLabel("Description", { exact: true })).toHaveValue(formDescription);

        await expect(questionCardLocator(providerPage, 1)).toBeVisible();
        await expect(questionCardLocator(providerPage, 2)).toBeVisible();
        await expect(questionCardLocator(providerPage, 3)).toBeVisible();

        await providerPage.getByRole("button", { name: "Publish form", exact: true }).click();
        await expect(providerPage.getByRole("button", { name: "Open generic link", exact: true })).toBeVisible({ timeout: 30000 });
        await expect(providerPage.getByRole("button", { name: "Open generic link", exact: true })).toBeVisible();

        await gotoWithRecovery(
          providerPage,
          `${BASE_URL}/dashboard/clients/${clientId}/portal`,
          providerPage.getByRole("tab", { name: "Overview", exact: true }),
        );
        await providerPage.getByRole("tab", { name: "Overview", exact: true }).click();
        await providerPage.getByRole("button", { name: "Copy sign-in page link", exact: true }).click();
        const signInPageInput = providerPage.locator('input[readonly]').first();
        await expect(signInPageInput).toHaveValue(/\/portal\/.+\/sign-in/);
        const familyInviteUrl = await signInPageInput.inputValue();
        const familyContext = await browser.newContext({
          ...projectContextOptions(testInfo),
          storageState: { cookies: [], origins: [] },
          recordVideo: {
            dir: testInfo.outputDir,
            size: { width: 1440, height: 960 },
          },
        });
        const popup = await familyContext.newPage();
        await popup.goto(familyInviteUrl, { waitUntil: "domcontentloaded" });
        const familySlugValue = new URL(popup.url()).pathname.split("/")[2];
        const signInParams = new URLSearchParams({
          redirect: `/portal/${familySlugValue}`,
          auth_mode: "family",
          portal_slug: familySlugValue,
        });
        await signInViaClerkPath(
          popup,
          `/auth/sign-in?${signInParams.toString()}`,
          guardianEmail,
          E2E_PASSWORD,
          /\/portal\/[^?]+(\?client=.*)?$/,
        );
        await expect(popup.getByRole("heading", { name: "Client Portal", exact: true })).toBeVisible();
        return {
          familyPage: popup,
          familySlug: familySlugValue,
          familyPortalUrl: popup.url(),
          templateId: seededTemplate.templateId,
        };
      });

      await test.step("complete the generic public form flow and create an unassigned submission", async () => {
        await gotoWithRecovery(
          providerPage,
          `${BASE_URL}/dashboard/forms/custom/${templateId}`,
          providerPage.getByRole("heading", { name: "Form Builder", exact: true }),
        );
        const previousClipboardValue = await providerPage.evaluate(async () => navigator.clipboard.readText());
        await providerPage.getByRole("button", { name: "Copy generic link", exact: true }).click();
        await expect
          .poll(
            async () => providerPage.evaluate(async () => navigator.clipboard.readText()),
            { timeout: 15000 },
          )
          .not.toBe(previousClipboardValue);
        const genericLinkValue = await providerPage.evaluate(async () => navigator.clipboard.readText());
        expect(genericLinkValue).toMatch(/\/forms\/.+\/access\?token=/);
        const publicPage = await browser.newPage();
        await publicPage.goto(genericLinkValue, { waitUntil: "domcontentloaded" });

        await expect(publicPage.getByRole("heading", { name: formTitle, exact: true })).toBeVisible();
        await publicPage.getByRole("button", { name: "Submit form", exact: true }).click();
        await expect(publicPage.getByText("Please complete every required question before submitting.")).toBeVisible();

        await publicPage.getByLabel(shortTextQuestion, { exact: true }).fill("Milo");
        await openSelectByLabel(publicPage, singleSelectQuestion);
        await publicPage.getByRole("option", { name: "Home", exact: true }).click();
        await publicPage.getByLabel("Yes", { exact: true }).click();
        await publicPage.getByRole("button", { name: "Submit form", exact: true }).click();
        await publicPage.waitForURL(/\/submitted$/, { timeout: 30000, waitUntil: "domcontentloaded" });
        await expect(publicPage.getByRole("heading", { name: "Form submitted", exact: true })).toBeVisible();
        await expect(publicPage.getByText("Your answers were received and saved successfully.")).toBeVisible();
        await publicPage.close();

        await expect
          .poll(async () => {
            const state = await seedQuery(api.seed.inspectE2EWorkspaceFormsState, {
              secret: requireSeedSecret(),
              workspaceId: user.workspaceId,
            });
            return state.unassignedSubmissions.filter(
              (submission) => submission.templateTitle === formTitle,
            ).length;
          }, { timeout: 30000 })
          .toBe(1);

      });

      await test.step("assign the published form to the client and verify the portal task", async () => {
        await gotoWithRecovery(
          providerPage,
          `${BASE_URL}/dashboard/clients/${clientId}`,
          providerPage.getByRole("button", { name: "Assign forms", exact: true }),
        );
        const openAssignFormsButton = providerPage.getByRole("button", { name: "Assign forms", exact: true });
        await openAssignFormsButton.click({ timeout: 30000 });
        const dialog = providerPage.getByRole("dialog");
        await expect(dialog).toBeVisible();
        const formOption = dialog
          .locator('[role="button"][aria-pressed]')
          .filter({ hasText: formTitle })
          .first();
        await expect(formOption).toBeVisible();
        const formCheckbox = formOption.locator('[role="checkbox"]').first();
        await expect(formCheckbox).toBeVisible();
        await formCheckbox.evaluate((element) => {
          (element as HTMLButtonElement).click();
        });
        await expect(formCheckbox).toHaveAttribute("aria-checked", "true");
        await expect(formOption).toHaveAttribute("aria-pressed", "true");
        await dialog.getByLabel("Optional due date", { exact: true }).fill("2026-04-30");
        const assignButton = dialog.getByRole("button", { name: "Assign selected forms", exact: true });
        await expect(assignButton).toBeEnabled();
        await assignButton.evaluate((element) => {
          (element as HTMLButtonElement).click();
        });
        await expect(dialog).toBeHidden({ timeout: 30000 });
        await expect(providerPage.getByText(formTitle, { exact: true }).first()).toBeVisible();

        await expect
          .poll(async () => {
            const state = await seedQuery(api.seed.inspectE2EClientPortalState, {
              secret: requireSeedSecret(),
              workspaceId: user.workspaceId,
              clientId,
            });
            return state.tasks.filter(
              (task) =>
                task.status === "pending" &&
                typeof task.payload?.taskType === "string" &&
                task.payload.taskType === "form_completion" &&
                typeof task.payload?.title === "string" &&
                task.payload.title === formTitle,
            ).length;
          }, { timeout: 30000 })
          .toBe(1);

        await familyPage.goto(familyPortalUrl, { waitUntil: "domcontentloaded" });
        await expect(familyPage.getByText(formTitle, { exact: true }).first()).toBeVisible({ timeout: 30000 });
        await expect(familyPage.getByText("Form completion", { exact: true }).first()).toBeVisible();
        await expect(familyPage.getByText(/Assigned /, { exact: false }).first()).toBeVisible();
      });

      await test.step("attach the unassigned generic submission to the client", async () => {
        await gotoWithRecovery(
          providerPage,
          `${BASE_URL}/dashboard/clients/${clientId}`,
          providerPage.getByRole("button", { name: "Assign forms", exact: true }),
        );
        await expect(
          providerPage.getByRole("main").getByText("Unassigned submissions", { exact: true }),
        ).toBeVisible({
          timeout: 30000,
        });
        await providerPage.getByRole("button", { name: "Review and attach", exact: true }).first().click();
        await expect(providerPage.getByText("Unassigned submission", { exact: true })).toBeVisible({
          timeout: 30000,
        });
        const clientRecordSection = providerPage
          .getByText("Client record", { exact: true })
          .locator("xpath=ancestor::div[contains(@class,'space-y-2')][1]");
        const clientRecordCombobox = clientRecordSection.getByRole("combobox").first();
        const attachButton = clientRecordSection.getByRole("button", { name: "Attach", exact: true });
        const clientOption = providerPage.getByRole("option").first();
        await expect(clientRecordCombobox).toBeVisible();
        await clientRecordCombobox.click();
        if (!(await clientOption.isVisible().catch(() => false))) {
          await clientRecordCombobox.press("ArrowDown");
        }
        await expect(clientOption).toBeVisible({ timeout: 10000 });
        await expect(clientOption).toContainText(clientLastName);
        await clientOption.click();
        await expect(attachButton).toBeEnabled({ timeout: 30000 });
        await attachButton.click();
        await expect(clientRecordSection.getByText("Attached to", { exact: false })).toBeVisible({
          timeout: 30000,
        });
        await expect(clientRecordSection).toContainText(clientLastName);
        await providerPage.keyboard.press("Escape");
        const currentUnassignedRow = providerPage.locator("div").filter({
          has: providerPage.getByText(formTitle, { exact: true }),
          has: providerPage.getByRole("button", { name: "Review and attach", exact: true }),
        });
        await expect(currentUnassignedRow).toHaveCount(0);
        await expect(providerPage.getByText(formTitle, { exact: true })).toHaveCount(2);
      });

      await test.step("complete the assigned form from the client portal and verify read-only history", async () => {
        await familyPage.getByRole("button", { name: "Open form", exact: true }).first().click();
        await familyPage.waitForURL(/\/forms\/.+/, { timeout: 30000, waitUntil: "domcontentloaded" });
        await expect(familyPage.getByRole("heading", { name: formTitle, exact: true })).toBeVisible();

        await familyPage.getByLabel(shortTextQuestion, { exact: true }).fill("Aiden");
        await openSelectByLabel(familyPage, singleSelectQuestion);
        await familyPage.getByRole("option", { name: "School", exact: true }).click();
        await familyPage.getByLabel("No", { exact: true }).click();
        await familyPage.getByRole("button", { name: "Submit form", exact: true }).click();
        await familyPage.waitForURL(/\/submitted(\?portal=1)?$/, {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });
        await expect(familyPage.getByRole("heading", { name: "Form submitted", exact: true })).toBeVisible();
        await expect(familyPage.getByRole("link", { name: "Back to My Portal", exact: true })).toBeVisible();
        await familyPage.getByRole("link", { name: "Back to My Portal", exact: true }).click();
        await familyPage.waitForURL(portalUrlPattern(familySlug), {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });

        await expandCompletedTasks(familyPage);
        const completedTask = familyPage.locator("div").filter({
          has: familyPage.getByText(formTitle, { exact: true }),
          has: familyPage.getByRole("button", { name: "View submission", exact: true }),
        }).first();
        await expect(completedTask).toBeVisible({ timeout: 30000 });
        await expect(
          completedTask.locator("span").filter({ hasText: /Completed / }).first(),
        ).toBeVisible();
        await completedTask.getByRole("button", { name: "View submission", exact: true }).click();
        await familyPage.waitForURL(/\/submitted(\?portal=1)?$/, {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });
        await expect(familyPage.getByRole("heading", { name: "Form submitted", exact: true })).toBeVisible();
        await expect(familyPage.getByRole("button", { name: "Submit form", exact: true })).toHaveCount(0);
      });

      await test.step("assign the same form again and confirm a second independent task and submission", async () => {
        await gotoWithRecovery(
          providerPage,
          `${BASE_URL}/dashboard/clients/${clientId}`,
          providerPage.getByRole("button", { name: "Assign forms", exact: true }),
        );
        await providerPage.getByRole("button", { name: "Assign forms", exact: true }).click();
        const dialog = providerPage.getByRole("dialog");
        await expect(dialog).toBeVisible();
        const formOption = dialog
          .locator('[role="button"][aria-pressed]')
          .filter({ hasText: formTitle })
          .first();
        const formCheckbox = formOption.locator('[role="checkbox"]').first();
        await formCheckbox.evaluate((element) => {
          (element as HTMLButtonElement).click();
        });
        await expect(formCheckbox).toHaveAttribute("aria-checked", "true");
        const assignButton = dialog.getByRole("button", { name: "Assign selected forms", exact: true });
        await expect(assignButton).toBeEnabled();
        await assignButton.evaluate((element) => {
          (element as HTMLButtonElement).click();
        });
        await expect(dialog).toBeHidden({ timeout: 30000 });

        await familyPage.goto(familyPortalUrl, { waitUntil: "domcontentloaded" });
        const openFormButtons = familyPage.getByRole("button", { name: "Open form", exact: true });
        await expect(openFormButtons.first()).toBeVisible({ timeout: 30000 });
        await expect(openFormButtons).toHaveCount(1);
        await openFormButtons.first().click();
        await familyPage.waitForURL(/\/forms\/.+/, { timeout: 30000, waitUntil: "domcontentloaded" });
        await familyPage.getByLabel(shortTextQuestion, { exact: true }).fill("Aiden Second");
        await openSelectByLabel(familyPage, singleSelectQuestion);
        await familyPage.getByRole("option", { name: "Home", exact: true }).click();
        await familyPage.getByLabel("Yes", { exact: true }).click();
        await familyPage.getByRole("button", { name: "Submit form", exact: true }).click();
        await familyPage.waitForURL(/\/submitted(\?portal=1)?$/, {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });
        await familyPage.getByRole("link", { name: "Back to My Portal", exact: true }).click();
        await familyPage.waitForURL(portalUrlPattern(familySlug), {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });
        await expandCompletedTasks(familyPage);
        await expect(
          familyPage
            .getByRole("button", { name: "View submission", exact: true }),
        ).toHaveCount(2);

        await gotoWithRecovery(
          providerPage,
          `${BASE_URL}/dashboard/clients/${clientId}`,
          providerPage.getByRole("button", { name: "Assign forms", exact: true }),
        );
        await expect(
          providerPage.getByRole("button").filter({
            has: providerPage.getByText(formTitle, { exact: true }),
          }),
        ).toHaveCount(3);
      });

      await test.step("verify provider notification, submissions list, and client detail history", async () => {
        await providerPage.goto(`${BASE_URL}/dashboard/notifications`, {
          waitUntil: "domcontentloaded",
        });
        const notificationTitle = `${formTitle} submitted by ${clientFirstName} ${clientLastName}`;
        await expect(providerPage.getByText(notificationTitle, { exact: true }).first()).toBeVisible({ timeout: 30000 });
        await providerPage.getByText(notificationTitle, { exact: true }).first().click();
        await providerPage.waitForURL(/\/dashboard\/forms\/custom\?tab=submissions/, {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });
        await expect(providerPage.getByText(formTitle, { exact: true }).first()).toBeVisible();
        await expect(providerPage.getByText(`${clientFirstName} ${clientLastName}`, { exact: true }).first()).toBeVisible();
        await expect(providerPage.getByText("Provider review state", { exact: true })).toBeVisible({ timeout: 30000 });
      });

      await test.step("verify submission review from forms dashboard and client profile", async () => {
        await providerPage.goto(`${BASE_URL}/dashboard/forms/custom?tab=submissions`, {
          waitUntil: "domcontentloaded",
        });
        const submissionRow = providerPage.getByRole("row").filter({
          has: providerPage.getByText(formTitle, { exact: true }),
          has: providerPage.getByText(`${clientFirstName} ${clientLastName}`, { exact: true }),
        }).first();
        await expect(submissionRow).toBeVisible({ timeout: 30000 });
        await submissionRow.getByRole("button", { name: "Review submission", exact: true }).click();
        await expect(providerPage.getByText("Provider review state", { exact: true })).toBeVisible({ timeout: 30000 });
        await expect(providerPage.getByText(shortTextQuestion, { exact: true })).toBeVisible();
        await expect(
          providerPage.getByText(/Aiden|Aiden Second/, { exact: false }).first(),
        ).toBeVisible();

        await gotoWithRecovery(
          providerPage,
          `${BASE_URL}/dashboard/clients/${clientId}`,
          providerPage.getByRole("button", { name: "Assign forms", exact: true }),
        );
        const historyRow = providerPage.getByRole("button").filter({
          has: providerPage.getByText(formTitle, { exact: true }),
        }).first();
        await expect(historyRow).toBeVisible();
        await historyRow.click();
        await expect(providerPage.getByText("Provider review state", { exact: true })).toBeVisible({ timeout: 30000 });
        await expect(
          providerPage.getByText(/Milo|Aiden|Aiden Second/, { exact: false }).first(),
        ).toBeVisible();
      });
    } finally {
      await providerPage.context().close().catch(() => undefined);
      await resetWorkspaceFixtures(user.workspaceId);
    }
  });

  test("covers advanced fields, autosave recovery, and provider review rendering", async ({
    browser,
  }, testInfo) => {
    const { user, page: providerPage } = await createSessionUser(browser, testInfo);
    const timestamp = Date.now();
    const clientFirstName = `Advanced${timestamp}`;
    const clientLastName = "Client";
    const guardianFirstName = "Hashem";
    const guardianLastName = `Advanced${timestamp}`;
    const guardianEmail = user.familyEmail;
    const formTitle = `E2E Advanced Form ${timestamp}`;
    const formDescription = "Exercise autosave, uploads, signatures, initials, and matrix answers.";
    const introBlock = "Please complete every section before submitting.";
    const preferredNameQuestion = "What name should we use during sessions?";
    const familyEmailQuestion = "What is the best email for updates?";
    const phoneQuestion = "Best phone number";
    const ageQuestion = "Child age";
    const startDateQuestion = "Target start date";
    const prioritiesQuestion = "Which settings should we prioritize?";
    const recordsQuestion = "Do you have recent records to share?";
    const contextQuestion = "What should the team know before reviewing the records?";
    const uploadQuestion = "Upload recent records";
    const signatureQuestion = "Parent signature";
    const initialsQuestion = "Parent initials";
    const matrixQuestion = "Rate current support areas";
    const uploadFileName = "records-note.txt";
    const advancedQuestions = [
      {
        id: "question_intro",
        type: "static_text",
        label: "Before you begin",
        description: "",
        hint: "",
        required: false,
        placeholder: "",
        options: [],
        conditions: [],
        staticContent: introBlock,
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: null,
        maxLength: null,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_preferred_name",
        type: "short_text",
        label: preferredNameQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "Preferred name",
        options: [],
        conditions: [],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: 2,
        maxLength: 80,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_email",
        type: "email",
        label: familyEmailQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "family@example.com",
        options: [],
        conditions: [],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: null,
        maxLength: null,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_phone",
        type: "phone",
        label: phoneQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "(555) 555-5555",
        options: [],
        conditions: [],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: 10,
        maxLength: 20,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_age",
        type: "number",
        label: ageQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "8",
        options: [],
        conditions: [],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: 1,
        maxNumber: 18,
        minLength: null,
        maxLength: null,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_start_date",
        type: "date",
        label: startDateQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "",
        options: [],
        conditions: [],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: null,
        maxLength: null,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_priorities",
        type: "multi_select",
        label: prioritiesQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "",
        options: [
          { id: "option_home", label: "Home", value: "", hint: "" },
          { id: "option_school", label: "School", value: "", hint: "" },
          { id: "option_community", label: "Community", value: "", hint: "" },
        ],
        conditions: [],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: null,
        maxLength: null,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_records",
        type: "yes_no",
        label: recordsQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "",
        options: [],
        conditions: [],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: null,
        maxLength: null,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_context",
        type: "long_text",
        label: contextQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "Share context for the care team",
        options: [],
        conditions: [
          {
            id: "condition_records",
            sourceQuestionId: "question_records",
            operator: "equals",
            value: true,
          },
        ],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: 10,
        maxLength: 600,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_upload",
        type: "file_upload",
        label: uploadQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "",
        options: [],
        conditions: [
          {
            id: "condition_upload",
            sourceQuestionId: "question_records",
            operator: "equals",
            value: true,
          },
        ],
        staticContent: "",
        acceptedFileTypes: ["text/plain"],
        allowMultipleFiles: false,
        maxFiles: 1,
        minNumber: null,
        maxNumber: null,
        minLength: null,
        maxLength: null,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_signature",
        type: "signature",
        label: signatureQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "",
        options: [],
        conditions: [],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: null,
        maxLength: null,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_initials",
        type: "initials",
        label: initialsQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "",
        options: [],
        conditions: [],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: null,
        maxLength: null,
        matrixRows: [],
        matrixColumns: [],
      },
      {
        id: "question_matrix",
        type: "matrix",
        label: matrixQuestion,
        description: "",
        hint: "",
        required: true,
        placeholder: "",
        options: [],
        conditions: [],
        staticContent: "",
        acceptedFileTypes: [],
        allowMultipleFiles: false,
        maxFiles: null,
        minNumber: null,
        maxNumber: null,
        minLength: null,
        maxLength: null,
        matrixRows: [
          { id: "row_communication", label: "Communication", value: "", hint: "" },
          { id: "row_behavior", label: "Behavior", value: "", hint: "" },
        ],
        matrixColumns: [
          { id: "column_support", label: "Needs support", value: "support", hint: "" },
          { id: "column_progress", label: "Doing well", value: "doing_well", hint: "" },
        ],
      },
    ];
    const advancedDraftSchemaJson = JSON.stringify(advancedQuestions);

    try {
      const clientId = await test.step("seed client and enable portal access", async () => {
        const seededClient = await seedMutation(
          api.seed.provisionE2ECommunicationFixtures,
          {
            secret: requireSeedSecret(),
            workspaceId: user.workspaceId,
            listingId: user.listingId,
            childFirstName: clientFirstName,
            childLastName: clientLastName,
            parentFirstName: guardianFirstName,
            parentLastName: guardianLastName,
            parentEmail: guardianEmail,
            parentClerkUserId: user.familyClerkUserId,
            packetSlug: `forms-advanced-e2e-${timestamp}`,
            portalEnabled: true,
          },
        );

        return seededClient.clientId;
      });

      const { familyPage, familySlug, familyPortalUrl } = await test.step("seed, publish, and assign an advanced form", async () => {
        await gotoWithRecovery(
          providerPage,
          `${BASE_URL}/dashboard/forms/custom`,
          providerPage.getByRole("heading", { name: "Forms", exact: true }),
        );
        const seededTemplate = await seedMutation(api.seed.insertE2EFormTemplate, {
          secret: requireSeedSecret(),
          workspaceId: user.workspaceId,
          title: formTitle,
          description: formDescription,
          draftSchemaJson: advancedDraftSchemaJson,
        });

        await gotoWithRecovery(
          providerPage,
          `${BASE_URL}/dashboard/forms/custom/${seededTemplate.templateId}`,
          providerPage.getByRole("heading", { name: "Form Builder", exact: true }),
        );
        await expect(providerPage.getByRole("heading", { name: "Form Builder", exact: true })).toBeVisible();
        await providerPage.getByRole("button", { name: "Publish form", exact: true }).click();
        await expect(providerPage.getByRole("button", { name: "Open generic link", exact: true })).toBeVisible({ timeout: 30000 });

        await gotoWithRecovery(
          providerPage,
          `${BASE_URL}/dashboard/clients/${clientId}/portal`,
          providerPage.getByRole("tab", { name: "Overview", exact: true }),
        );
        await providerPage.getByRole("tab", { name: "Overview", exact: true }).click();
        await providerPage.getByRole("button", { name: "Copy sign-in page link", exact: true }).click();
        const signInPageInput = providerPage.locator('input[readonly]').first();
        await expect(signInPageInput).toHaveValue(/\/portal\/.+\/sign-in/);
        const familyInviteUrl = await signInPageInput.inputValue();
        const familyContext = await browser.newContext({
          storageState: { cookies: [], origins: [] },
          recordVideo: {
            dir: testInfo.outputDir,
            size: { width: 1440, height: 960 },
          },
        });
        const popup = await familyContext.newPage();
        await popup.goto(familyInviteUrl, { waitUntil: "domcontentloaded" });
        const familySlugValue = new URL(popup.url()).pathname.split("/")[2];
        const signInParams = new URLSearchParams({
          redirect: `/portal/${familySlugValue}`,
          auth_mode: "family",
          portal_slug: familySlugValue,
        });
        await signInViaClerkPath(
          popup,
          `/auth/sign-in?${signInParams.toString()}`,
          guardianEmail,
          E2E_PASSWORD,
          /\/portal\/[^?]+(\?client=.*)?$/,
        );
        await expect(popup.getByRole("heading", { name: "Client Portal", exact: true })).toBeVisible();

        await gotoWithRecovery(
          providerPage,
          `${BASE_URL}/dashboard/clients/${clientId}`,
          providerPage.getByRole("button", { name: "Assign forms", exact: true }),
        );
        await providerPage.getByRole("button", { name: "Assign forms", exact: true }).click();
        const dialog = providerPage.getByRole("dialog");
        await expect(dialog).toBeVisible();
        const formOption = dialog
          .locator('[role="button"][aria-pressed]')
          .filter({ hasText: formTitle })
          .first();
        const formCheckbox = formOption.locator('[role="checkbox"]').first();
        await formCheckbox.evaluate((element) => {
          (element as HTMLButtonElement).click();
        });
        await expect(formCheckbox).toHaveAttribute("aria-checked", "true");
        const assignButton = dialog.getByRole("button", { name: "Assign selected forms", exact: true });
        await expect(assignButton).toBeEnabled();
        await assignButton.evaluate((element) => {
          (element as HTMLButtonElement).click();
        });
        await expect(dialog).toBeHidden({ timeout: 30000 });

        return {
          familyPage: popup,
          familySlug: familySlugValue,
          familyPortalUrl: popup.url(),
        };
      });

      await test.step("recover draft autosave and complete advanced fields", async () => {
        await familyPage.goto(familyPortalUrl, { waitUntil: "domcontentloaded" });
        await expect(familyPage.getByText(formTitle, { exact: true }).first()).toBeVisible({ timeout: 30000 });
        await familyPage.getByRole("button", { name: "Open form", exact: true }).first().click();
        await familyPage.waitForURL(/\/forms\/.+/, { timeout: 30000, waitUntil: "domcontentloaded" });
        await expect(familyPage.getByRole("heading", { name: formTitle, exact: true })).toBeVisible();
        await expect(familyPage.getByText(introBlock, { exact: true })).toBeVisible();

        await familyPage.getByLabel(preferredNameQuestion, { exact: true }).fill("Nora");
        await familyPage.getByLabel(familyEmailQuestion, { exact: true }).fill("family.nora@example.com");
        await familyPage.getByLabel(phoneQuestion, { exact: true }).fill("555-010-2222");
        await familyPage.getByLabel(ageQuestion, { exact: true }).fill("8");
        await familyPage.getByLabel(startDateQuestion, { exact: true }).fill("2026-05-15");
        await questionBlockByText(familyPage, prioritiesQuestion).getByText("Home", { exact: true }).click();
        await questionBlockByText(familyPage, prioritiesQuestion).getByText("School", { exact: true }).click();
        await questionBlockByText(familyPage, recordsQuestion).getByLabel("Yes", { exact: true }).click();
        await expect(familyPage.getByLabel(contextQuestion, { exact: true })).toBeVisible();
        await familyPage.getByLabel(contextQuestion, { exact: true }).fill("Family shared updated school observations and home routines.");
        await familyPage.waitForTimeout(1800);
        await familyPage.reload({ waitUntil: "domcontentloaded" });

        await expect(familyPage.getByLabel(preferredNameQuestion, { exact: true })).toHaveValue("Nora");
        await expect(familyPage.getByLabel(familyEmailQuestion, { exact: true })).toHaveValue("family.nora@example.com");
        await expect(familyPage.getByLabel(phoneQuestion, { exact: true })).toHaveValue("555-010-2222");
        await expect(familyPage.getByLabel(ageQuestion, { exact: true })).toHaveValue("8");
        await expect(familyPage.getByLabel(startDateQuestion, { exact: true })).toHaveValue("2026-05-15");
        await expect(familyPage.getByLabel(contextQuestion, { exact: true })).toHaveValue(
          "Family shared updated school observations and home routines.",
        );

        const uploadPath = testInfo.outputPath(uploadFileName);
        await writeFile(uploadPath, "Recent records for the clinical team.");
        const uploadBlock = questionBlockByText(familyPage, uploadQuestion);
        await uploadBlock.locator('input[type="file"]').setInputFiles(uploadPath);
        await expect(uploadBlock.getByText(uploadFileName, { exact: true })).toBeVisible({ timeout: 30000 });

        await drawOnQuestionCanvas(familyPage, signatureQuestion);
        await drawOnQuestionCanvas(familyPage, initialsQuestion);

        await chooseMatrixOption(familyPage, matrixQuestion, "Communication", "Needs support");
        await chooseMatrixOption(familyPage, matrixQuestion, "Behavior", "Doing well");
        await familyPage.getByRole("button", { name: "Submit form", exact: true }).click();
        await familyPage.waitForURL(/\/submitted(\?portal=1)?$/, {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });

        await expect(familyPage.getByRole("heading", { name: "Form submitted", exact: true })).toBeVisible();
        await expect(familyPage.getByText("Nora", { exact: true })).toBeVisible();
        await expect(familyPage.getByText("family.nora@example.com", { exact: true })).toBeVisible();
        await expect(familyPage.getByText(uploadFileName, { exact: true })).toBeVisible();
        await expect(familyPage.getByAltText("Signature", { exact: true })).toBeVisible();
        await expect(familyPage.getByAltText("Initials", { exact: true })).toBeVisible();
        await expect(familyPage.getByText("Communication", { exact: true })).toBeVisible();
        await expect(familyPage.getByText("Needs support", { exact: true })).toBeVisible();
        await expect(familyPage.getByText("Doing well", { exact: true })).toBeVisible();
        await familyPage.getByRole("link", { name: "Back to My Portal", exact: true }).click();
        await familyPage.waitForURL(portalUrlPattern(familySlug), {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });
      });

      await test.step("verify completed task history remains read-only", async () => {
        await expandCompletedTasks(familyPage);
        const completedTask = familyPage.locator("div").filter({
          has: familyPage.getByText(formTitle, { exact: true }),
          has: familyPage.getByRole("button", { name: "View submission", exact: true }),
        }).first();
        await expect(completedTask).toBeVisible({ timeout: 30000 });
        await completedTask.getByRole("button", { name: "View submission", exact: true }).click();
        await familyPage.waitForURL(/\/submitted(\?portal=1)?$/, {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });
        await expect(familyPage.getByRole("button", { name: "Submit form", exact: true })).toHaveCount(0);
        await expect(familyPage.getByText(uploadFileName, { exact: true })).toBeVisible();
      });

      await test.step("verify provider review renders advanced answers", async () => {
        await providerPage.goto(`${BASE_URL}/dashboard/forms/custom?tab=submissions`, {
          waitUntil: "domcontentloaded",
        });
        const submissionRow = providerPage.getByRole("row").filter({
          has: providerPage.getByText(formTitle, { exact: true }),
          has: providerPage.getByText(`${clientFirstName} ${clientLastName}`, { exact: true }),
        }).first();
        await expect(submissionRow).toBeVisible({ timeout: 30000 });
        await submissionRow.getByRole("button", { name: "Review submission", exact: true }).click();
        await expect(providerPage.getByText("Provider review state", { exact: true })).toBeVisible({ timeout: 30000 });
        await expect(providerPage.getByText("Nora", { exact: true })).toBeVisible();
        await expect(providerPage.getByText("family.nora@example.com", { exact: true })).toBeVisible();
        await expect(providerPage.getByText(uploadFileName, { exact: true })).toBeVisible();
        await expect(providerPage.getByRole("button", { name: "Open file", exact: true })).toBeVisible();
        await expect(providerPage.getByAltText("Signature", { exact: true })).toBeVisible();
        await expect(providerPage.getByAltText("Initials", { exact: true })).toBeVisible();
        await expect(providerPage.getByText("Communication", { exact: true })).toBeVisible();
        await expect(providerPage.getByText("Needs support", { exact: true })).toBeVisible();
        await expect(providerPage.getByText("Doing well", { exact: true })).toBeVisible();

        await gotoWithRecovery(
          providerPage,
          `${BASE_URL}/dashboard/clients/${clientId}`,
          providerPage.getByRole("button", { name: "Assign forms", exact: true }),
        );
        const historyRow = providerPage.getByRole("button").filter({
          has: providerPage.getByText(formTitle, { exact: true }),
        }).first();
        await expect(historyRow).toBeVisible({ timeout: 30000 });
        await historyRow.click();
        await expect(providerPage.getByText(uploadFileName, { exact: true })).toBeVisible({ timeout: 30000 });
        await expect(providerPage.getByAltText("Signature", { exact: true })).toBeVisible();
      });

      await familyPage.context().close().catch(() => undefined);
    } finally {
      await providerPage.context().close().catch(() => undefined);
      await resetWorkspaceFixtures(user.workspaceId);
    }
  });
});

function questionCardLocator(page: Page, questionNumber: number) {
  return page
    .getByText(`Question ${questionNumber}`, { exact: true })
    .locator('xpath=ancestor::*[contains(@class,"overflow-hidden")][1]');
}

async function openSelectByLabel(page: Page, label: string) {
  const questionBlock = questionBlockByText(page, label).filter({
    has: page.getByRole("combobox"),
  }).first();

  await expect(questionBlock).toBeVisible();
  await questionBlock.getByRole("combobox").first().click();
}

function questionBlockByText(page: Page, label: string) {
  return page
    .locator("div")
    .filter({
      has: page.getByText(label, { exact: true }),
    })
    .filter({
      has: page.locator("label, h3, p"),
    })
    .first();
}

async function drawOnQuestionCanvas(page: Page, label: string) {
  const region = page.getByLabel(label, { exact: true }).first();
  const canvas = region.locator("canvas").first();
  await expect(canvas).toBeVisible();
  const beforeDataUrl = await canvas.evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL("image/png"),
  );
  await canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement;
    const rect = target.getBoundingClientRect();
    const pointerId = 1;
    const points = [
      { x: rect.left + rect.width * 0.2, y: rect.top + rect.height * 0.35 },
      { x: rect.left + rect.width * 0.45, y: rect.top + rect.height * 0.6 },
      { x: rect.left + rect.width * 0.72, y: rect.top + rect.height * 0.28 },
    ];

    target.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: points[0].x,
        clientY: points[0].y,
        pointerId,
        buttons: 1,
      }),
    );
    target.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: points[1].x,
        clientY: points[1].y,
        pointerId,
        buttons: 1,
      }),
    );
    target.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: points[2].x,
        clientY: points[2].y,
        pointerId,
        buttons: 1,
      }),
    );
    target.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        clientX: points[2].x,
        clientY: points[2].y,
        pointerId,
        buttons: 0,
      }),
    );
  });
  await expect
    .poll(async () =>
      canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL("image/png")),
    )
    .not.toBe(beforeDataUrl);
}

async function chooseMatrixOption(
  page: Page,
  questionLabel: string,
  rowLabel: string,
  optionLabel: string,
) {
  const questionBlock = questionBlockByText(page, questionLabel);
  const row = questionBlock
    .getByText(rowLabel, { exact: true })
    .first()
    .locator("xpath=ancestor::div[.//*[@role='radiogroup']][1]");
  await expect(row).toBeVisible();
  await row
    .getByRole("radio", { name: optionLabel, exact: true })
    .first()
    .click();
}

async function expandCompletedTasks(page: Page) {
  const trigger = page.getByRole("button", { name: /Completed tasks/i }).first();
  await expect(trigger).toBeVisible();
  const expanded = await trigger.getAttribute("aria-expanded");
  if (expanded !== "true") {
    await trigger.click();
  }
}

async function createSessionUser(
  browser: Browser,
  testInfo: TestInfo,
): Promise<{ user: SessionUser; page: Page }> {
  const page = await openAuthedPage(browser, testInfo);
  const [providerUser, familyUser] = await resolveClerkTestUsers(2);
  await signInViaClerkUI(page, providerUser.email, E2E_PASSWORD);

  const workspace = await seedMutation(
    api.seed.provisionE2EDashboardWorkspace,
    {
      secret: requireSeedSecret(),
      clerkUserId: providerUser.id,
      email: providerUser.email,
      firstName: "E2E",
      lastName: "Forms",
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
  await seedMutation(api.seed.resetE2ECommunicationFixtures, {
    secret: requireSeedSecret(),
    workspaceId,
  });
}

async function openAuthedPage(browser: Browser, testInfo: TestInfo): Promise<Page> {
  const context = await browser.newContext({
    ...projectContextOptions(testInfo),
    storageState: { cookies: [], origins: [] },
    recordVideo: {
      dir: testInfo.outputDir,
      size: { width: 1440, height: 960 },
    },
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: BASE_URL,
  });
  return context.newPage();
}

function projectContextOptions(testInfo: TestInfo): BrowserContextOptions {
  const use = testInfo.project.use as Record<string, unknown>;
  return {
    colorScheme: (use.colorScheme as BrowserContextOptions["colorScheme"]) ?? "light",
    deviceScaleFactor: typeof use.deviceScaleFactor === "number" ? use.deviceScaleFactor : undefined,
    hasTouch: typeof use.hasTouch === "boolean" ? use.hasTouch : undefined,
    isMobile: typeof use.isMobile === "boolean" ? use.isMobile : undefined,
    locale: typeof use.locale === "string" ? use.locale : undefined,
    timezoneId: typeof use.timezoneId === "string" ? use.timezoneId : undefined,
    userAgent: typeof use.userAgent === "string" ? use.userAgent : undefined,
    viewport:
      use.viewport && typeof use.viewport === "object"
        ? (use.viewport as BrowserContextOptions["viewport"])
        : undefined,
  };
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
  while (resolvedUsers.length < count) {
    const timestamp = Date.now() + resolvedUsers.length;
    const generated = await createClerkTestUser(
      `e2e-forms-${timestamp}@test.findabatherapy.com`,
      E2E_PASSWORD,
    );
    resolvedUsers.push(generated);
  }

  if (resolvedUsers.length < count) {
    throw new Error(`Expected at least ${count} Clerk test users for E2E auth.`);
  }

  return resolvedUsers;
}

async function gotoWithRecovery(page: Page, url: string, readyLocator: Locator) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const temporaryErrorHeading = page.getByText("Something went wrong", { exact: true });
    if (await temporaryErrorHeading.isVisible().catch(() => false)) {
      const tryAgainButton = page.getByRole("button", { name: "Try again", exact: true });
      if (await tryAgainButton.isVisible().catch(() => false)) {
        await tryAgainButton.click();
      } else {
        await page.reload({ waitUntil: "domcontentloaded" });
      }
    }

    try {
      await expect(readyLocator).toBeVisible({ timeout: 10000 });
      return;
    } catch (error) {
      if (attempt === 2) {
        const visibleBodyText = await page.locator("body").innerText().catch(() => "");
        throw new Error(
          `Navigation recovery failed for ${url}. Final URL: ${page.url()}. ` +
            `Visible text: ${visibleBodyText.slice(0, 800)}`,
          { cause: error instanceof Error ? error : undefined },
        );
      }
      await page.waitForTimeout(1500);
    }
  }
}

function portalUrlPattern(portalSlug: string) {
  return new RegExp(`/portal/${escapeRegExp(portalSlug)}(?:\\?client=.*)?$`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getConvexSeedClient() {
  if (!CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for forms E2E setup");
  }

  return new ConvexHttpClient(CONVEX_URL);
}

async function seedMutation<TArgs extends Record<string, unknown>, TResult>(
  mutationRef: Parameters<ConvexHttpClient["mutation"]>[0],
  args: TArgs,
): Promise<TResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getConvexSeedClient().mutation<TResult>(mutationRef, args);
    } catch (error) {
      lastError = error;
      if (attempt === 2) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw lastError;
}

async function seedQuery<TArgs extends Record<string, unknown>, TResult>(
  queryRef: Parameters<ConvexHttpClient["query"]>[0],
  args: TArgs,
): Promise<TResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getConvexSeedClient().query<TResult>(queryRef, args);
    } catch (error) {
      lastError = error;
      if (attempt === 2) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw lastError;
}

function requireSeedSecret() {
  if (!SEED_SECRET) {
    throw new Error("CONVEX_SEED_IMPORT_SECRET is required for forms E2E setup");
  }

  return SEED_SECRET;
}
