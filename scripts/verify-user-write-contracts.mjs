#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";

import { createClient } from "@supabase/supabase-js";

function readEnv(key) {
  const envText = fs.readFileSync(".env.local", "utf8");
  const prefix = `${key}=`;
  const line = envText.split("\n").find((entry) => entry.startsWith(prefix));
  return line ? line.slice(prefix.length) : undefined;
}

const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const userClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function expectOk(label, operation) {
  const result = await operation();
  if (result?.error) {
    throw new Error(`${label} failed: ${result.error.code || "unknown"} ${result.error.message}`);
  }
  return result?.data;
}

async function main() {
  const nonce = crypto.randomBytes(6).toString("hex");
  const email = `codex-contract-${nonce}@example.com`;
  const password = "TempPass!123456";
  const slug = `contract-${nonce}`;
  let userId = null;

  try {
    const { data: created, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        agency_name: `Contract Test ${nonce}`,
        selected_plan: "free",
        billing_interval: "month",
        selected_intent: "both",
      },
    });
    if (createUserError || !created.user) {
      throw createUserError || new Error("Failed to create disposable user");
    }

    userId = created.user.id;

    await expectOk("seed profile", () =>
      admin.from("profiles").insert({
        id: userId,
        agency_name: `Contract Test ${nonce}`,
        contact_email: email,
        plan_tier: "free",
        billing_interval: "month",
        primary_intent: "both",
      })
    );

    await expectOk("seed membership", () =>
      admin.from("profile_memberships").insert({
        profile_id: userId,
        user_id: userId,
        email,
        role: "owner",
        status: "active",
        joined_at: new Date().toISOString(),
      })
    );

    const { error: signInError } = await userClient.auth.signInWithPassword({ email, password });
    if (signInError) {
      throw signInError;
    }

    await expectOk("update profile", () =>
      userClient
        .from("profiles")
        .update({
          agency_name: `Contract Test Updated ${nonce}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
    );

    const listingRows = await expectOk("insert listing", () =>
      userClient
        .from("listings")
        .insert({
          profile_id: userId,
          slug,
          headline: "Contract test listing",
          description: "Contract test listing description",
          service_modes: ["in_home"],
          status: "draft",
        })
        .select("id")
    );
    const listingId = listingRows[0].id;

    await expectOk("update listing", () =>
      userClient
        .from("listings")
        .update({
          headline: "Updated contract listing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", listingId)
    );

    const locationRows = await expectOk("insert location", () =>
      userClient
        .from("locations")
        .insert({
          listing_id: listingId,
          label: "Primary",
          city: "Kansas City",
          state: "KS",
          is_primary: true,
          service_types: ["in_home"],
          service_mode: "in_home",
          insurances: ["aetna"],
        })
        .select("id")
    );
    const locationId = locationRows[0].id;

    await expectOk("update location", () =>
      userClient
        .from("locations")
        .update({
          city: "Overland Park",
        })
        .eq("id", locationId)
    );

    await expectOk("insert listing attribute", () =>
      userClient.from("listing_attribute_values").insert({
        listing_id: listingId,
        attribute_key: "languages",
        value_json: ["english"],
      })
    );

    await expectOk("delete listing attribute", () =>
      userClient
        .from("listing_attribute_values")
        .delete()
        .eq("listing_id", listingId)
        .eq("attribute_key", "languages")
    );

    const jobRows = await expectOk("insert job posting", () =>
      userClient
        .from("job_postings")
        .insert({
          profile_id: userId,
          location_id: locationId,
          title: "BCBA",
          slug: `bcba-${nonce}`,
          position_type: "bcba",
          employment_type: ["full_time"],
          status: "draft",
        })
        .select("id")
    );
    const jobId = jobRows[0].id;

    await expectOk("update job posting", () =>
      userClient.from("job_postings").update({ title: "Senior BCBA" }).eq("id", jobId)
    );

    const applicantEmail = `applicant-${nonce}@example.com`;
    await expectOk("public insert job application", () =>
      publicClient
        .from("job_applications")
        .insert({
          job_posting_id: jobId,
          applicant_name: "Applicant Test",
          applicant_email: applicantEmail,
        })
    );

    const applicationRows = await expectOk("lookup inserted job application", () =>
      admin
        .from("job_applications")
        .select("id")
        .eq("job_posting_id", jobId)
        .eq("applicant_email", applicantEmail)
        .limit(1)
    );
    const applicationId = applicationRows[0].id;

    await expectOk("provider update job application", () =>
      userClient
        .from("job_applications")
        .update({ status: "reviewed" })
        .eq("id", applicationId)
    );

    await expectOk("delete job posting", () =>
      userClient.from("job_postings").delete().eq("id", jobId)
    );

    const teamRows = await expectOk("insert team member", () =>
      userClient
        .from("team_members")
        .insert({
          profile_id: userId,
          first_name: "Ari",
          last_name: "Tester",
        })
        .select("id")
    );
    const teamMemberId = teamRows[0].id;

    await expectOk("update team member", () =>
      userClient.from("team_members").update({ role: "BCBA" }).eq("id", teamMemberId)
    );

    const credentialRows = await expectOk("insert employee credential", () =>
      userClient
        .from("employee_credentials")
        .insert({
          profile_id: userId,
          employee_name: "Ari Tester",
          credential_name: "BCBA",
        })
        .select("id")
    );
    const credentialId = credentialRows[0].id;

    await expectOk("update employee credential", () =>
      userClient
        .from("employee_credentials")
        .update({ notes: "Verified" })
        .eq("id", credentialId)
    );

    const employeeDocumentRows = await expectOk("insert employee document", () =>
      userClient
        .from("employee_documents")
        .insert({
          team_member_id: teamMemberId,
          label: "License",
        })
        .select("id")
    );
    const employeeDocumentId = employeeDocumentRows[0].id;

    await expectOk("update employee document", () =>
      userClient
        .from("employee_documents")
        .update({ notes: "Stored" })
        .eq("id", employeeDocumentId)
    );

    const clientRows = await expectOk("insert client", () =>
      userClient
        .from("clients")
        .insert({
          profile_id: userId,
          listing_id: listingId,
          status: "inquiry",
        })
        .select("id")
    );
    const clientId = clientRows[0].id;

    await expectOk("update client", () =>
      userClient
        .from("clients")
        .update({ child_first_name: "Jamie" })
        .eq("id", clientId)
    );

    await expectOk("insert client parent", () =>
      userClient.from("client_parents").insert({
        client_id: clientId,
        first_name: "Parent",
      })
    );

    await expectOk("insert client location", () =>
      userClient.from("client_locations").insert({
        client_id: clientId,
        label: "Home",
      })
    );

    const insuranceRows = await expectOk("insert client insurance", () =>
      userClient
        .from("client_insurances")
        .insert({
          client_id: clientId,
          insurance_name: "Aetna",
        })
        .select("id")
    );
    const insuranceId = insuranceRows[0].id;

    await expectOk("insert client authorization", () =>
      userClient.from("client_authorizations").insert({
        client_id: clientId,
        insurance_id: insuranceId,
      })
    );

    await expectOk("insert client document", () =>
      userClient.from("client_documents").insert({
        client_id: clientId,
        label: "Assessment",
      })
    );

    const taskRows = await expectOk("insert client task", () =>
      userClient
        .from("client_tasks")
        .insert({
          client_id: clientId,
          profile_id: userId,
          title: "Follow up",
        })
        .select("id")
    );
    const taskId = taskRows[0].id;

    await expectOk("update client task", () =>
      userClient.from("client_tasks").update({ status: "completed" }).eq("id", taskId)
    );

    await expectOk("insert client contact", () =>
      userClient.from("client_contacts").insert({
        client_id: clientId,
        label: "School",
        value: "school@example.com",
      })
    );

    const sourceRows = await expectOk("insert referral source", () =>
      userClient
        .from("referral_sources")
        .insert({
          profile_id: userId,
          location_id: locationId,
          name: "Referral Source",
        })
        .select("id")
    );
    const sourceId = sourceRows[0].id;

    await expectOk("update referral source", () =>
      userClient
        .from("referral_sources")
        .update({ stage: "qualified" })
        .eq("id", sourceId)
    );

    const referralContactRows = await expectOk("insert referral contact", () =>
      userClient
        .from("referral_contacts")
        .insert({
          source_id: sourceId,
          name: "Dr. Referral",
        })
        .select("id")
    );
    const referralContactId = referralContactRows[0].id;

    await expectOk("update referral contact", () =>
      userClient
        .from("referral_contacts")
        .update({ email: "dr@example.com" })
        .eq("id", referralContactId)
    );

    await expectOk("insert referral note", () =>
      userClient.from("referral_notes").insert({
        source_id: sourceId,
        profile_id: userId,
        note: "Initial note",
      })
    );

    const referralTaskRows = await expectOk("insert referral task", () =>
      userClient
        .from("referral_tasks")
        .insert({
          source_id: sourceId,
          profile_id: userId,
          title: "Call office",
        })
        .select("id")
    );
    const referralTaskId = referralTaskRows[0].id;

    await expectOk("update referral task", () =>
      userClient
        .from("referral_tasks")
        .update({ status: "completed" })
        .eq("id", referralTaskId)
    );

    const templateRows = await expectOk("insert referral template", () =>
      userClient
        .from("referral_templates")
        .insert({
          profile_id: userId,
          name: "Intro",
          subject: "Hello",
          body: "Body",
        })
        .select("id")
    );
    const templateId = templateRows[0].id;

    await expectOk("update referral template", () =>
      userClient
        .from("referral_templates")
        .update({ subject: "Updated Hello" })
        .eq("id", templateId)
    );

    const campaignRows = await expectOk("insert referral campaign", () =>
      userClient
        .from("referral_campaigns")
        .insert({
          profile_id: userId,
          template_id: templateId,
          name: "Campaign",
          subject: "Campaign subject",
          body: "Campaign body",
        })
        .select("id")
    );
    const campaignId = campaignRows[0].id;

    await expectOk("update referral campaign", () =>
      userClient
        .from("referral_campaigns")
        .update({ status: "queued" })
        .eq("id", campaignId)
    );

    const importJobRows = await expectOk("insert referral import job", () =>
      userClient
        .from("referral_import_jobs")
        .insert({
          profile_id: userId,
          location_id: locationId,
        })
        .select("id")
    );
    const importJobId = importJobRows[0].id;

    await expectOk("update referral import job", () =>
      userClient
        .from("referral_import_jobs")
        .update({ status: "running" })
        .eq("id", importJobId)
    );

    await expectOk("insert referral touchpoint", () =>
      userClient.from("referral_touchpoints").insert({
        source_id: sourceId,
        contact_id: referralContactId,
        profile_id: userId,
        campaign_id: campaignId,
        template_id: templateId,
        touchpoint_type: "email",
      })
    );

    console.log("User write contract verification passed.");
  } finally {
    if (userId) {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
