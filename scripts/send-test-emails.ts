/**
 * Script to send test emails for all email templates
 * Run with: npx tsx scripts/send-test-emails.ts [email]
 *
 * Note: Requires RESEND_API_KEY and a verified domain in Resend.
 * If your domain isn't verified, you can test with Resend's sandbox:
 *   EMAIL_FROM=onboarding@resend.dev npx tsx scripts/send-test-emails.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { sendTestEmail, type TestEmailType } from "../src/lib/email/notifications";

const EMAIL = process.argv[2] || "hashem.selim@gmail.com";

// All email types organized by brand
const emailTypes: { type: TestEmailType; brand: "therapy" | "jobs"; description: string }[] = [
  // Therapy brand emails (Blue #5788FF)
  // From: "Find ABA Therapy <noreply@behaviorwork.com>"
  { type: "inquiry", brand: "therapy", description: "Provider receives new inquiry" },
  { type: "family_inquiry", brand: "therapy", description: "Family confirmation after inquiry" },
  { type: "payment_failure", brand: "therapy", description: "Payment failed notification" },
  { type: "subscription", brand: "therapy", description: "Pro subscription welcome" },
  { type: "subscription_enterprise", brand: "therapy", description: "Enterprise subscription welcome" },
  { type: "feedback", brand: "therapy", description: "Admin receives feedback" },
  { type: "admin_signup", brand: "therapy", description: "Admin: new provider signup" },
  { type: "admin_first_payment", brand: "therapy", description: "Admin: first payment received" },

  // Jobs brand emails (Emerald #059669)
  // From: "Find ABA Jobs <noreply@behaviorwork.com>"
  { type: "jobs_application_confirmation", brand: "jobs", description: "Applicant confirmation" },
  { type: "jobs_new_application", brand: "jobs", description: "Employer receives application" },
];

async function main() {
  console.log(`\n📧 Sending ${emailTypes.length} test emails to ${EMAIL}...\n`);
  console.log("=" .repeat(60));

  let therapyCount = 0;
  let jobsCount = 0;
  let successCount = 0;
  let failCount = 0;

  for (const { type, brand, description } of emailTypes) {
    const brandEmoji = brand === "therapy" ? "🔵" : "🟢";
    const brandLabel = brand === "therapy" ? "THERAPY" : "JOBS";

    console.log(`\n${brandEmoji} [${brandLabel}] ${type}`);
    console.log(`   ${description}`);

    const result = await sendTestEmail(EMAIL, type);

    if (result.success) {
      console.log(`   ✓ Sent successfully`);
      successCount++;
      if (brand === "therapy") therapyCount++;
      else jobsCount++;
    } else {
      console.log(`   ✗ Failed: ${result.error}`);
      failCount++;
    }

    // Small delay between emails to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n" + "=" .repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   🔵 Therapy emails: ${therapyCount}/${emailTypes.filter(e => e.brand === "therapy").length}`);
  console.log(`   🟢 Jobs emails: ${jobsCount}/${emailTypes.filter(e => e.brand === "jobs").length}`);
  console.log(`   ✓ Total sent: ${successCount}/${emailTypes.length}`);
  if (failCount > 0) {
    console.log(`   ✗ Failed: ${failCount}`);
  }
  console.log(`\n✅ Done! Check your inbox at ${EMAIL}\n`);
}

main().catch(console.error);
