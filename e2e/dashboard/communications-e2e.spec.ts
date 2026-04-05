import { test, expect, type Browser, type Page, type TestInfo } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import fs from "fs";
import path from "path";

import { api } from "../../convex/_generated/api";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const SEED_SECRET = process.env.CONVEX_SEED_IMPORT_SECRET;
const AUTH_STATE_FILE = path.join(__dirname, "../.auth/user.json");
const AUTH_USER_FILE = path.join(__dirname, "../.auth/user-meta.json");

type SessionUser = {
  clerkUserId: string;
  email: string;
  password: string;
  workspaceId: string;
  listingId: string;
};

type SeededClient = {
  listingId: string;
  clientId: string;
};

test.describe("communications end-to-end", () => {
  test.setTimeout(180000);

  test("reserves built-in slugs when creating a custom template with the same name", async ({
    browser,
  }, testInfo) => {
    const user = await createSessionUser("slug");
    const page = await openAuthedPage(browser, user, testInfo);

    try {
      await page.goto(`${BASE_URL}/dashboard/clients/communications`);
      await expect(page.getByRole("heading", { name: "Communications", exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Templates" }).click();
      await expect(page.getByRole("button", { name: "New Template" })).toBeVisible();

      await page.getByRole("button", { name: "New Template" }).click();
      await expect(page.getByRole("heading", { name: "New Template", exact: true })).toBeVisible();

      const subject = `Codex duplicate-name slug check ${Date.now()}`;
      await page.getByLabel("Template Name").fill("General Update");
      await fillSubjectEditor(page, subject);
      await fillBodyEditor(page, "This custom template should not override the built-in one.");

      await page.screenshot({ path: testInfo.outputPath("01-duplicate-template-sheet.png"), fullPage: true });
      await page.getByRole("button", { name: "Save Template" }).click();
      await expect.poll(async () => {
        const state = await inspectCommunicationState(user, {
          templateSubject: subject,
        });
        return state.templateCount;
      }, { timeout: 30000 }).toBe(1);
      await expect(page.getByRole("heading", { name: "New Template", exact: true })).not.toBeVisible({
        timeout: 30000,
      });

      const state = await inspectCommunicationState(user, {
        templateSubject: subject,
      });
      expect(state.latestTemplate).toBeTruthy();
      expect(state.latestTemplate?.slug).not.toBe("general-update");
      expect(state.latestTemplate?.slug.startsWith("general-update-")).toBeTruthy();
      expect(state.generalUpdateSlugCount).toBe(0);

      await page.screenshot({ path: testInfo.outputPath("02-duplicate-template-saved.png"), fullPage: true });
    } finally {
      await page.context().close();
      await deleteSessionUser(user);
    }
  });

  test("edits a custom template and persists subject, body, and CC", async ({
    browser,
  }, testInfo) => {
    const user = await createSessionUser("edit");
    const page = await openAuthedPage(browser, user, testInfo);

    try {
      await page.goto(`${BASE_URL}/dashboard/clients/communications`);
      await expect(page.getByRole("heading", { name: "Communications", exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Templates" }).click();

      await page.getByRole("button", { name: "New Template" }).click();
      await expect(page.getByRole("heading", { name: "New Template", exact: true })).toBeVisible();
      await page.getByLabel("Template Name").fill("Codex Editable Template");
      await fillSubjectEditor(page, "Original subject");
      await fillBodyEditor(page, "Original body");
      await page.getByRole("button", { name: "Save Template" }).click();
      await expect(page.getByRole("heading", { name: "New Template", exact: true })).not.toBeVisible({
        timeout: 10000,
      });
      await expect.poll(async () => {
        const state = await inspectCommunicationState(user, {
          templateName: "Codex Editable Template",
        });
        return state.templateCount;
      }).toBe(1);

      const row = page.locator("tr", { hasText: "Codex Editable Template" }).first();
      await expect(row).toBeVisible({ timeout: 15000 });
      await row.getByRole("button").click();
      await page.getByRole("menuitem", { name: "Edit" }).click();

      const updatedSubject = `Updated subject ${Date.now()}`;
      const updatedBody = "Updated body from the Codex E2E test.";
      await page.getByLabel("Template Name").fill("Codex Editable Template");
      await replaceSubjectEditor(page, updatedSubject);
      await replaceBodyEditor(page, updatedBody);
      await addCcEmail(page, "ops@example.com");

      await page.screenshot({ path: testInfo.outputPath("03-template-edit-sheet.png"), fullPage: true });
      await page.getByRole("button", { name: "Save Template" }).click();
      await expect(page.getByRole("heading", { name: "Edit Template", exact: true })).not.toBeVisible({
        timeout: 10000,
      });

      await expect.poll(async () => {
        const state = await inspectCommunicationState(user, {
          templateName: "Codex Editable Template",
        });
        return JSON.stringify(state.latestTemplate ?? null);
      }).toContain(updatedSubject);

      const state = await inspectCommunicationState(user, {
        templateName: "Codex Editable Template",
      });
      expect(state.latestTemplate?.subject).toContain(updatedSubject);
      expect(state.latestTemplate?.body).toContain(updatedBody);
      expect(state.latestTemplate?.cc || []).toContain("ops@example.com");

      await page.screenshot({ path: testInfo.outputPath("04-template-edit-saved.png"), fullPage: true });
    } finally {
      await page.context().close();
      await deleteSessionUser(user);
    }
  });

  test("does not mint live links during draft editing and creates them only on send", async ({
    browser,
  }, testInfo) => {
    const user = await createSessionUser("send");
    const page = await openAuthedPage(browser, user, testInfo);

    try {
      const seededClient = await seedListingAndClient(user, {
        listingId: user.listingId,
        childFirstName: "Token",
        childLastName: "Check",
        parentEmail: `parent+${Date.now()}@test.findabatherapy.com`,
        parentFirstName: "Hashem",
        parentLastName: "Selim",
      });

      const templateSubject = `Codex send proof for {client_name} ${Date.now()}`;
      const templateBody = [
        "<p>Hello {parent_first_name},</p>",
        "<p>Open your intake link: {intake_link}</p>",
        "<p>Review your agreement: {agreement_link}</p>",
      ].join("");

      await insertCommunicationTemplate(user, {
        name: "Codex Send Template",
        slug: `codex-send-template-${Date.now()}`,
        lifecycleStage: "any",
        subject: templateSubject,
        body: templateBody,
        cc: [],
        mergeFields: ["client_name", "parent_first_name", "intake_link", "agreement_link"],
      });

      const beforeCounts = await getDynamicLinkCounts(user, seededClient.clientId);

      await page.goto(`${BASE_URL}/dashboard/clients/${seededClient.clientId}`);
      await expect(page.getByRole("main").getByText("Communications", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Send", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      await page.getByRole("combobox", { name: "Template" }).click();
      await page.getByRole("option", { name: "Codex Send Template" }).click();

      await page.waitForTimeout(1200);
      const afterSelectCounts = await getDynamicLinkCounts(user, seededClient.clientId);
      expect(afterSelectCounts).toEqual(beforeCounts);

      await appendBodyEditor(page, " This extra draft text should not mint tokens.");
      await page.waitForTimeout(1200);
      const afterEditCounts = await getDynamicLinkCounts(user, seededClient.clientId);
      expect(afterEditCounts).toEqual(beforeCounts);

      await page.screenshot({ path: testInfo.outputPath("05-send-dialog-before-send.png"), fullPage: true });
      await page.getByRole("button", { name: "Send Email" }).click();

      await expect(page.getByText(/Email sent successfully!/)).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(2000);

      const afterSendCounts = await getDynamicLinkCounts(user, seededClient.clientId);
      expect(afterSendCounts.intakeTokens).toBe(beforeCounts.intakeTokens + 1);
      expect(afterSendCounts.agreementLinks).toBe(beforeCounts.agreementLinks + 1);

      await expect.poll(async () => {
        const state = await inspectCommunicationState(user, {
          clientId: seededClient.clientId,
        });
        return state.latestCommunication?.status ?? null;
      }, { timeout: 15000 }).toBe("sent");

      const state = await inspectCommunicationState(user, {
        clientId: seededClient.clientId,
      });
      const communication = state.latestCommunication;
      expect(communication?.status).toBe("sent");
      expect(communication?.recipientEmail).toBeTruthy();
      expect(communication?.subject).toContain("Token Check");
      expect(communication?.subject).not.toContain("{client_name}");
      expect(communication?.body).toContain("?token=");
      expect(communication?.body).not.toContain("{intake_link}");
      expect(communication?.body).not.toContain("{agreement_link}");

      await page.waitForTimeout(2000);
      await page.screenshot({ path: testInfo.outputPath("06-send-history-after-send.png"), fullPage: true });
    } finally {
      await page.context().close();
      await deleteSessionUser(user);
    }
  });
});

async function createSessionUser(prefix: string): Promise<SessionUser> {
  void prefix;
  const user = JSON.parse(fs.readFileSync(AUTH_USER_FILE, "utf8")) as SessionUser;
  await getConvexSeedClient().mutation(api.seed.resetE2ECommunicationFixtures, {
    secret: requireSeedSecret(),
    workspaceId: user.workspaceId,
  });

  return user;
}

async function deleteSessionUser(user: SessionUser) {
  await getConvexSeedClient().mutation(api.seed.resetE2ECommunicationFixtures, {
    secret: requireSeedSecret(),
    workspaceId: user.workspaceId,
  });
}

async function openAuthedPage(browser: Browser, user: SessionUser, testInfo: TestInfo): Promise<Page> {
  const context = await browser.newContext({
    storageState: AUTH_STATE_FILE,
    recordVideo: {
      dir: testInfo.outputDir,
      size: { width: 1440, height: 960 },
    },
  });

  void user;
  return context.newPage();
}

async function seedListingAndClient(
  user: SessionUser,
  params: {
    listingId: string;
    childFirstName: string;
    childLastName: string;
    parentEmail: string;
    parentFirstName: string;
    parentLastName: string;
  }
): Promise<SeededClient> {
  const { clientId } = await getConvexSeedClient().mutation(
    api.seed.provisionE2ECommunicationFixtures,
    {
      secret: requireSeedSecret(),
      workspaceId: user.workspaceId,
      listingId: params.listingId,
      childFirstName: params.childFirstName,
      childLastName: params.childLastName,
      parentFirstName: params.parentFirstName,
      parentLastName: params.parentLastName,
      parentEmail: params.parentEmail,
      packetSlug: `codex-agreement-${Date.now()}`,
    },
  );

  return {
    listingId: params.listingId,
    clientId,
  };
}

async function insertCommunicationTemplate(
  user: SessionUser,
  params: {
    name: string;
    slug: string;
    lifecycleStage: string;
    subject: string;
    body: string;
    cc?: string[];
    mergeFields?: string[];
  },
) {
  await getConvexSeedClient().mutation(api.seed.insertE2ECommunicationTemplate, {
    secret: requireSeedSecret(),
    workspaceId: user.workspaceId,
    name: params.name,
    slug: params.slug,
    lifecycleStage: params.lifecycleStage,
    subject: params.subject,
    body: params.body,
    cc: params.cc,
    mergeFields: params.mergeFields,
  });
}

async function getDynamicLinkCounts(
  user: SessionUser,
  clientId: string
) {
  const state = await inspectCommunicationState(user, { clientId });
  return {
    intakeTokens: state.intakeTokenCount,
    agreementLinks: state.agreementLinkCount,
  };
}

async function inspectCommunicationState(
  user: SessionUser,
  params: {
    clientId?: string;
    templateName?: string;
    templateSubject?: string;
  },
) {
  return getConvexSeedClient().query(api.seed.inspectE2ECommunicationState, {
    secret: requireSeedSecret(),
    workspaceId: user.workspaceId,
    clientId: params.clientId,
    templateName: params.templateName,
    templateSubject: params.templateSubject,
  });
}

function getConvexSeedClient() {
  if (!CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for communications E2E setup");
  }

  return new ConvexHttpClient(CONVEX_URL);
}

function requireSeedSecret() {
  if (!SEED_SECRET) {
    throw new Error("CONVEX_SEED_IMPORT_SECRET is required for communications E2E setup");
  }

  return SEED_SECRET;
}

async function fillSubjectEditor(page: Page, text: string) {
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await page.keyboard.type(text);
}

async function replaceSubjectEditor(page: Page, text: string) {
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(text);
}

async function fillBodyEditor(page: Page, text: string) {
  const editor = page.locator(".ProseMirror").nth(1);
  await editor.click();
  await page.keyboard.type(text);
}

async function replaceBodyEditor(page: Page, text: string) {
  const editor = page.locator(".ProseMirror").nth(1);
  await editor.click();
  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(text);
}

async function appendBodyEditor(page: Page, text: string) {
  const editor = page.locator(".ProseMirror").nth(1);
  await editor.click();
  await page.keyboard.press("End");
  await page.keyboard.type(text);
}

async function addCcEmail(page: Page, email: string) {
  const ccInput = page.getByPlaceholder("email@example.com").first();
  await ccInput.fill(email);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(email)).toBeVisible();
}
