import { test, expect, type Browser, type Page, type TestInfo } from "@playwright/test";
import { getAdminClient } from "../lib/auth-helper";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

type SessionUser = {
  id: string;
  email: string;
  password: string;
  listingId: string;
};

type SeededClient = {
  listingId: string;
  clientId: string;
};

type AgreementSeed = {
  packetId: string;
  versionId: string;
};

test.describe("communications end-to-end", () => {
  test.setTimeout(180000);

  test("reserves built-in slugs when creating a custom template with the same name", async ({
    browser,
  }, testInfo) => {
    const user = await createSessionUser("slug");
    const page = await openAuthedPage(browser, user, testInfo);
    const admin = getAdminClient();

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
      await expect(page.getByRole("heading", { name: "New Template", exact: true })).not.toBeVisible({
        timeout: 10000,
      });
      await expect.poll(async () => {
        const { data } = await admin
          .from("communication_templates")
          .select("id")
          .eq("profile_id", user.id)
          .eq("subject", subject);
        return data?.length || 0;
      }).toBe(1);

      const { data: createdTemplate, error } = await admin
        .from("communication_templates")
        .select("slug, base_template_id, profile_id")
        .eq("profile_id", user.id)
        .eq("subject", subject)
        .single();

      expect(error).toBeNull();
      expect(createdTemplate).toBeTruthy();
      expect(createdTemplate?.base_template_id).toBeNull();
      expect(createdTemplate?.profile_id).toBe(user.id);
      expect(createdTemplate?.slug).not.toBe("general-update");
      expect(createdTemplate?.slug.startsWith("general-update-")).toBeTruthy();

      const { data: accidentalOverride } = await admin
        .from("communication_templates")
        .select("id")
        .eq("profile_id", user.id)
        .eq("slug", "general-update");

      expect(accidentalOverride || []).toHaveLength(0);

      await page.screenshot({ path: testInfo.outputPath("02-duplicate-template-saved.png"), fullPage: true });
    } finally {
      await page.context().close();
      await deleteSessionUser(user.id);
    }
  });

  test("edits a custom template and persists subject, body, and CC", async ({
    browser,
  }, testInfo) => {
    const user = await createSessionUser("edit");
    const page = await openAuthedPage(browser, user, testInfo);
    const admin = getAdminClient();

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
        const { data } = await admin
          .from("communication_templates")
          .select("id")
          .eq("profile_id", user.id)
          .eq("name", "Codex Editable Template");
        return data?.length || 0;
      }).toBe(1);

      const row = page.locator("tr", { hasText: "Codex Editable Template" }).first();
      await expect(row).toBeVisible();
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
        const { data } = await admin
          .from("communication_templates")
          .select("subject, body, cc")
          .eq("profile_id", user.id)
          .eq("name", "Codex Editable Template")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return JSON.stringify(data ?? null);
      }).toContain(updatedSubject);

      const { data: updatedTemplate, error: fetchError } = await admin
        .from("communication_templates")
        .select("subject, body, cc")
        .eq("profile_id", user.id)
        .eq("name", "Codex Editable Template")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      expect(fetchError).toBeNull();

      expect(updatedTemplate?.subject).toContain(updatedSubject);
      expect(updatedTemplate?.body).toContain(updatedBody);
      expect(updatedTemplate?.cc || []).toContain("ops@example.com");

      await page.screenshot({ path: testInfo.outputPath("04-template-edit-saved.png"), fullPage: true });
    } finally {
      await page.context().close();
      await deleteSessionUser(user.id);
    }
  });

  test("does not mint live links during draft editing and creates them only on send", async ({
    browser,
  }, testInfo) => {
    const user = await createSessionUser("send");
    const page = await openAuthedPage(browser, user, testInfo);
    const admin = getAdminClient();

    try {
      const seededClient = await seedListingAndClient(admin, user.id, {
        listingId: user.listingId,
        childFirstName: "Token",
        childLastName: "Check",
        parentEmail: "hashem.selim@gmail.com",
        parentFirstName: "Hashem",
        parentLastName: "Selim",
      });
      await seedAgreementPacket(admin, user.id, "codex-agreement");

      const templateSubject = `Codex send proof for {client_name} ${Date.now()}`;
      const templateBody = [
        "<p>Hello {parent_first_name},</p>",
        "<p>Open your intake link: {intake_link}</p>",
        "<p>Review your agreement: {agreement_link}</p>",
      ].join("");

      const { error: templateError } = await admin.from("communication_templates").insert({
        profile_id: user.id,
        name: "Codex Send Template",
        slug: `codex-send-template-${Date.now()}`,
        lifecycle_stage: "any",
        subject: templateSubject,
        body: templateBody,
        cc: [],
        merge_fields: ["client_name", "parent_first_name", "intake_link", "agreement_link"],
        sort_order: 1000,
        is_active: true,
      });

      expect(templateError).toBeNull();

      const beforeCounts = await getDynamicLinkCounts(admin, user.id, seededClient.clientId);

      await page.goto(`${BASE_URL}/dashboard/clients/${seededClient.clientId}`);
      await expect(page.getByRole("main").getByText("Communications", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Send", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      await page.getByRole("combobox", { name: "Template" }).click();
      await page.getByRole("option", { name: "Codex Send Template" }).click();

      await page.waitForTimeout(1200);
      const afterSelectCounts = await getDynamicLinkCounts(admin, user.id, seededClient.clientId);
      expect(afterSelectCounts).toEqual(beforeCounts);

      await appendBodyEditor(page, " This extra draft text should not mint tokens.");
      await page.waitForTimeout(1200);
      const afterEditCounts = await getDynamicLinkCounts(admin, user.id, seededClient.clientId);
      expect(afterEditCounts).toEqual(beforeCounts);

      await page.screenshot({ path: testInfo.outputPath("05-send-dialog-before-send.png"), fullPage: true });
      await page.getByRole("button", { name: "Send Email" }).click();

      await expect(page.getByText(/Email sent successfully!/)).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(2000);

      const afterSendCounts = await getDynamicLinkCounts(admin, user.id, seededClient.clientId);
      expect(afterSendCounts.intakeTokens).toBe(beforeCounts.intakeTokens + 1);
      expect(afterSendCounts.agreementLinks).toBe(beforeCounts.agreementLinks + 1);

      await expect.poll(async () => {
        const { data } = await admin
          .from("client_communications")
          .select("status")
          .eq("profile_id", user.id)
          .eq("client_id", seededClient.clientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data?.status ?? null;
      }, { timeout: 15000 }).toBe("sent");

      const { data: communication, error: communicationError } = await admin
        .from("client_communications")
        .select("status, subject, body, recipient_email")
        .eq("profile_id", user.id)
        .eq("client_id", seededClient.clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      expect(communicationError).toBeNull();
      expect(communication?.status).toBe("sent");
      expect(communication?.recipient_email).toBe("hashem.selim@gmail.com");
      expect(communication?.subject).toContain("Token Check");
      expect(communication?.subject).not.toContain("{client_name}");
      expect(communication?.body).toContain("?token=");
      expect(communication?.body).not.toContain("{intake_link}");
      expect(communication?.body).not.toContain("{agreement_link}");

      await page.waitForTimeout(2000);
      await page.screenshot({ path: testInfo.outputPath("06-send-history-after-send.png"), fullPage: true });
    } finally {
      await page.context().close();
      await deleteSessionUser(user.id);
    }
  });
});

async function createSessionUser(prefix: string): Promise<SessionUser> {
  const admin = getAdminClient();
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-${prefix}-${uniqueId}@test.findabatherapy.com`;
  const password = `TestPass-${uniqueId}!`;

  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      agency_name: `E2E ${prefix} Agency`,
      selected_plan: "pro",
      billing_interval: "month",
      selected_intent: "both",
    },
  });

  if (createError || !data.user) {
    throw new Error(`Failed to create auth user: ${createError?.message}`);
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    agency_name: `E2E ${prefix} Agency`,
    contact_email: email,
    plan_tier: "pro",
    billing_interval: "month",
    subscription_status: "active",
    primary_intent: "both",
    onboarding_completed_at: new Date().toISOString(),
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  const { error: membershipError } = await admin.from("profile_memberships").insert({
    profile_id: data.user.id,
    user_id: data.user.id,
    email,
    role: "owner",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  if (membershipError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(`Failed to create workspace membership: ${membershipError.message}`);
  }

  try {
    const listingId = await seedCompletedOnboardingWorkspace(admin, data.user.id, prefix);
    return { id: data.user.id, email, password, listingId };
  } catch (error) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw error;
  }
}

async function deleteSessionUser(userId: string) {
  const admin = getAdminClient();
  await admin.auth.admin.deleteUser(userId);
}

async function openAuthedPage(browser: Browser, user: SessionUser, testInfo: TestInfo): Promise<Page> {
  const context = await browser.newContext({
    storageState: undefined,
    recordVideo: {
      dir: testInfo.outputDir,
      size: { width: 1440, height: 960 },
    },
  });

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/auth/sign-in`);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL(/\/dashboard\//, { timeout: 30000 });
  return page;
}

async function seedListingAndClient(
  admin: ReturnType<typeof getAdminClient>,
  profileId: string,
  params: {
    listingId: string;
    childFirstName: string;
    childLastName: string;
    parentEmail: string;
    parentFirstName: string;
    parentLastName: string;
  }
): Promise<SeededClient> {
  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({
      profile_id: profileId,
      listing_id: params.listingId,
      status: "inquiry",
      child_first_name: params.childFirstName,
      child_last_name: params.childLastName,
    })
    .select("id")
    .single();

  if (clientError || !client?.id) {
    throw new Error(`Failed to create client: ${clientError?.message}`);
  }

  const { error: parentError } = await admin.from("client_parents").insert({
    client_id: client.id,
    first_name: params.parentFirstName,
    last_name: params.parentLastName,
    relationship: "mother",
    email: params.parentEmail,
    is_primary: true,
  });

  if (parentError) {
    throw new Error(`Failed to create client parent: ${parentError.message}`);
  }

  return {
    listingId: params.listingId,
    clientId: client.id,
  };
}

async function seedCompletedOnboardingWorkspace(
  admin: ReturnType<typeof getAdminClient>,
  profileId: string,
  prefix: string
): Promise<string> {
  const slug = `e2e-${prefix}-agency-${Date.now()}`;
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .insert({
      profile_id: profileId,
      slug,
      headline: `E2E ${prefix} Agency`,
      description: "End-to-end seeded listing description for middleware onboarding completion.",
      service_modes: ["in_home", "in_center"],
      plan_tier: "pro",
      status: "published",
      is_accepting_clients: true,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (listingError || !listing?.id) {
    throw new Error(`Failed to create onboarding listing: ${listingError?.message}`);
  }

  const { error: locationError } = await admin.from("locations").insert({
    listing_id: listing.id,
    label: "Primary Location",
    street: "100 Main St",
    city: "Austin",
    state: "TX",
    postal_code: "78701",
    service_radius_miles: 25,
    service_mode: "both",
    service_types: ["in_home", "in_center"],
    is_accepting_clients: true,
    is_primary: true,
  });

  if (locationError) {
    throw new Error(`Failed to create onboarding location: ${locationError.message}`);
  }

  const { error: attrError } = await admin.from("listing_attribute_values").insert({
    listing_id: listing.id,
    attribute_key: "services_offered",
    value_json: ["aba"],
  });

  if (attrError) {
    throw new Error(`Failed to create onboarding services attribute: ${attrError.message}`);
  }

  return listing.id;
}

async function seedAgreementPacket(
  admin: ReturnType<typeof getAdminClient>,
  profileId: string,
  slugPrefix: string
): Promise<AgreementSeed> {
  const slug = `${slugPrefix}-${Date.now()}`;
  const { data: packet, error: packetError } = await admin
    .from("agreement_packets")
    .insert({
      profile_id: profileId,
      title: "Codex Agreement Packet",
      slug,
      created_by: profileId,
    })
    .select("id")
    .single();

  if (packetError || !packet?.id) {
    throw new Error(`Failed to create agreement packet: ${packetError?.message}`);
  }

  const { data: version, error: versionError } = await admin
    .from("agreement_packet_versions")
    .insert({
      packet_id: packet.id,
      profile_id: profileId,
      version_number: 1,
      title: "Codex Agreement Packet v1",
      created_by: profileId,
    })
    .select("id")
    .single();

  if (versionError || !version?.id) {
    throw new Error(`Failed to create agreement packet version: ${versionError?.message}`);
  }

  return { packetId: packet.id, versionId: version.id };
}

async function getDynamicLinkCounts(
  admin: ReturnType<typeof getAdminClient>,
  profileId: string,
  clientId: string
) {
  const [{ count: intakeTokens }, { count: agreementLinks }] = await Promise.all([
    admin
      .from("intake_tokens")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .eq("client_id", clientId),
    admin
      .from("agreement_links")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .eq("client_id", clientId),
  ]);

  return {
    intakeTokens: intakeTokens || 0,
    agreementLinks: agreementLinks || 0,
  };
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
