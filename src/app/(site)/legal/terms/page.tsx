import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Find ABA Therapy",
  description: "Terms of Service for Find ABA Therapy - rules and guidelines for using our platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="container prose prose-slate max-w-4xl px-4 py-16 dark:prose-invert">
      <h1>Terms of Service</h1>
      <p className="lead">
        <strong>Effective Date:</strong> January 1, 2025
        <br />
        <strong>Last Updated:</strong> December 30, 2024
      </p>

      <p>
        Welcome to Find ABA Therapy. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the
        findabatherapy.org website (the &quot;Site&quot;) and all related services provided by Find ABA Therapy
        (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or using the Site, you agree to be bound by these Terms.
        If you do not agree, please do not use the Site.
      </p>

      <hr />

      <h2>1. Description of Service</h2>
      <p>
        Find ABA Therapy is an online directory connecting families seeking Applied Behavior Analysis (ABA) therapy
        services with licensed therapy providers. We provide:
      </p>
      <ul>
        <li>A searchable directory of ABA therapy providers</li>
        <li>Contact facilitation between families and providers</li>
        <li>Listing management tools for therapy providers</li>
        <li>Premium features including enhanced listings and analytics</li>
      </ul>
      <p>
        <strong>We are not a healthcare provider.</strong> We do not provide medical advice, diagnosis, treatment,
        or therapy services. We do not employ the providers listed on our Site. All therapy services are provided
        directly by independent third-party providers.
      </p>

      <hr />

      <h2>2. User Accounts</h2>

      <h3>2.1 Account Creation</h3>
      <p>
        To access certain features (such as creating a provider listing), you must create an account. You agree to:
      </p>
      <ul>
        <li>Provide accurate, current, and complete information</li>
        <li>Maintain and promptly update your account information</li>
        <li>Keep your password secure and confidential</li>
        <li>Accept responsibility for all activities under your account</li>
        <li>Notify us immediately of any unauthorized access</li>
      </ul>

      <h3>2.2 Account Eligibility</h3>
      <p>
        You must be at least 18 years old and have the legal authority to enter into these Terms. Provider accounts
        must be created by individuals authorized to represent the therapy practice.
      </p>

      <h3>2.3 Account Termination</h3>
      <p>
        We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity,
        or are inactive for extended periods. You may delete your account at any time through your dashboard settings
        or by contacting us.
      </p>

      <hr />

      <h2>3. Provider Listings</h2>

      <h3>3.1 Listing Requirements</h3>
      <p>Providers who create listings represent and warrant that:</p>
      <ul>
        <li>They are licensed to provide ABA therapy services in their stated jurisdiction(s)</li>
        <li>All information provided is accurate, current, and not misleading</li>
        <li>They have authority to represent the practice or organization listed</li>
        <li>They will maintain accurate information and update listings as needed</li>
        <li>They comply with all applicable laws, regulations, and professional standards</li>
      </ul>

      <h3>3.2 Prohibited Content</h3>
      <p>Listings may not contain:</p>
      <ul>
        <li>False, misleading, or deceptive information</li>
        <li>Claims that cannot be substantiated</li>
        <li>Discriminatory language or practices</li>
        <li>Content that violates intellectual property rights</li>
        <li>Spam, malware, or malicious links</li>
        <li>Services unrelated to ABA therapy</li>
      </ul>

      <h3>3.3 Content Moderation</h3>
      <p>
        We reserve the right to review, edit, or remove any listing content that violates these Terms or that we
        determine, in our sole discretion, is inappropriate, inaccurate, or harmful. We may request verification
        of credentials at any time.
      </p>

      <h3>3.4 Listing Visibility</h3>
      <p>
        Free listings are included in search results but have limited features. Paid subscriptions provide enhanced
        visibility, additional features, and priority placement as described in the subscription plan details.
      </p>

      <hr />

      <h2>4. Subscription Plans and Billing</h2>

      <h3>4.1 Subscription Tiers</h3>
      <p>We offer the following subscription plans for providers:</p>
      <ul>
        <li><strong>Free:</strong> Basic listing with limited features (no contact form access)</li>
        <li><strong>Pro:</strong> Enhanced listing with contact forms, analytics, and more</li>
        <li><strong>Enterprise:</strong> Premium features including multiple locations and priority support</li>
        <li><strong>Featured Placement:</strong> Add-on for premium search result positioning</li>
      </ul>
      <p>
        Current pricing and feature details are available on our pricing page. We reserve the right to modify
        pricing with 30 days notice to existing subscribers.
      </p>

      <h3>4.2 Billing and Payment</h3>
      <ul>
        <li>Subscriptions are billed in advance on a monthly or annual basis</li>
        <li>Payment is processed securely through Stripe</li>
        <li>You authorize us to charge your payment method for all fees</li>
        <li>Prices are in US dollars unless otherwise stated</li>
        <li>You are responsible for any applicable taxes</li>
      </ul>

      <h3>4.3 Automatic Renewal</h3>
      <p>
        Subscriptions automatically renew at the end of each billing period unless canceled. You may cancel at any
        time through your dashboard. Cancellation takes effect at the end of the current billing period.
      </p>

      <h3>4.4 Refund Policy</h3>
      <ul>
        <li>
          <strong>Monthly Subscriptions:</strong> No refunds for partial months. You retain access until the end
          of your current billing period.
        </li>
        <li>
          <strong>Annual Subscriptions:</strong> Refund requests within the first 14 days may be considered on a
          case-by-case basis. After 14 days, no refunds are provided, but you retain access for the full year.
        </li>
        <li>
          <strong>Featured Placements:</strong> Non-refundable once the placement period has begun.
        </li>
        <li>
          <strong>Service Issues:</strong> If you experience significant service issues, contact us to discuss
          potential credits or refunds.
        </li>
      </ul>
      <p>
        To request a refund, contact <a href="mailto:support@findabatherapy.org">support@findabatherapy.org</a> with
        your account details and reason for the request.
      </p>

      <h3>4.5 Failed Payments</h3>
      <p>
        If a payment fails, we will attempt to charge your payment method again. After multiple failed attempts,
        your subscription may be downgraded to the free tier, and premium features (including contact form access)
        will be disabled until payment is resolved.
      </p>

      <h3>4.6 Plan Changes</h3>
      <p>
        You may upgrade or downgrade your plan at any time. Upgrades take effect immediately with prorated billing.
        Downgrades take effect at the end of your current billing period.
      </p>

      <hr />

      <h2>5. Family/User Conduct</h2>

      <h3>5.1 Contact Form Usage</h3>
      <p>When contacting providers through our Site, you agree to:</p>
      <ul>
        <li>Provide accurate contact information</li>
        <li>Use the service only for legitimate inquiries about therapy services</li>
        <li>Not submit spam, solicitations, or unrelated communications</li>
        <li>Treat providers with respect and professionalism</li>
      </ul>

      <h3>5.2 No Guarantee of Response</h3>
      <p>
        We facilitate connections but cannot guarantee that providers will respond to inquiries or that services
        will meet your needs. Evaluation and selection of providers is your responsibility.
      </p>

      <hr />

      <h2>6. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Site for any unlawful purpose</li>
        <li>Impersonate any person or entity</li>
        <li>Interfere with or disrupt the Site or servers</li>
        <li>Attempt to gain unauthorized access to any part of the Site</li>
        <li>Use automated systems (bots, scrapers) without permission</li>
        <li>Harvest or collect user information without consent</li>
        <li>Post or transmit viruses, malware, or harmful code</li>
        <li>Engage in any activity that could damage our reputation or business</li>
      </ul>

      <hr />

      <h2>7. Intellectual Property</h2>

      <h3>7.1 Our Content</h3>
      <p>
        The Site, including its design, text, graphics, logos, and software, is owned by Find ABA Therapy and
        protected by copyright, trademark, and other intellectual property laws. You may not copy, modify,
        distribute, or create derivative works without our written permission.
      </p>

      <h3>7.2 Your Content</h3>
      <p>
        You retain ownership of content you submit (listing descriptions, photos, etc.). By submitting content,
        you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content
        in connection with our services. You represent that you have the right to grant this license.
      </p>

      <h3>7.3 Feedback</h3>
      <p>
        Any feedback, suggestions, or ideas you provide may be used by us without obligation or compensation to you.
      </p>

      <hr />

      <h2>8. Disclaimers</h2>

      <h3>8.1 No Healthcare Advice</h3>
      <p>
        <strong>
          Find ABA Therapy does not provide medical, therapeutic, or healthcare advice. We are a directory service only.
        </strong>{" "}
        Any information on this Site is for general informational purposes and should not be relied upon as a
        substitute for professional medical advice, diagnosis, or treatment.
      </p>

      <h3>8.2 Provider Independence</h3>
      <p>
        Providers listed on our Site are independent professionals and businesses. We do not employ, supervise,
        or control them. We do not verify credentials, conduct background checks, or guarantee the quality of
        services provided. You are responsible for evaluating and selecting providers.
      </p>

      <h3>8.3 &quot;As Is&quot; Service</h3>
      <p>
        The Site is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied,
        including warranties of merchantability, fitness for a particular purpose, and non-infringement. We do
        not warrant that the Site will be uninterrupted, error-free, or secure.
      </p>

      <h3>8.4 Third-Party Links</h3>
      <p>
        The Site may contain links to third-party websites. We are not responsible for the content, accuracy,
        or practices of these external sites.
      </p>

      <hr />

      <h2>9. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Find ABA Therapy, its officers, directors, employees, and agents
        shall not be liable for:
      </p>
      <ul>
        <li>Any indirect, incidental, special, consequential, or punitive damages</li>
        <li>Any loss of profits, revenue, data, or business opportunities</li>
        <li>Any damages arising from your use of or inability to use the Site</li>
        <li>Any conduct or content of any third party on the Site</li>
        <li>Any actions or omissions of providers listed on the Site</li>
        <li>Any unauthorized access to or alteration of your data</li>
      </ul>
      <p>
        Our total liability for any claims arising from these Terms or your use of the Site shall not exceed
        the amount you paid to us in the twelve (12) months preceding the claim, or $100, whichever is greater.
      </p>

      <hr />

      <h2>10. Indemnification</h2>
      <p>
        You agree to indemnify, defend, and hold harmless Find ABA Therapy and its officers, directors, employees,
        and agents from any claims, damages, losses, liabilities, and expenses (including attorney fees) arising
        from:
      </p>
      <ul>
        <li>Your use of the Site</li>
        <li>Your violation of these Terms</li>
        <li>Your violation of any third-party rights</li>
        <li>Content you submit to the Site</li>
        <li>Your interactions with other users or providers</li>
      </ul>

      <hr />

      <h2>11. Dispute Resolution</h2>

      <h3>11.1 Informal Resolution</h3>
      <p>
        Before filing any legal claim, you agree to contact us at{" "}
        <a href="mailto:support@findabatherapy.org">support@findabatherapy.org</a> and attempt to resolve the dispute
        informally for at least 30 days.
      </p>

      <h3>11.2 Governing Law</h3>
      <p>
        These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles.
      </p>

      <h3>11.3 Jurisdiction</h3>
      <p>
        Any legal action arising from these Terms shall be brought exclusively in the state or federal courts
        located in Delaware. You consent to the personal jurisdiction of these courts.
      </p>

      <hr />

      <h2>12. Changes to Terms</h2>
      <p>
        We may modify these Terms at any time. Material changes will be communicated via email or prominent notice
        on the Site at least 30 days before taking effect. Your continued use of the Site after changes become
        effective constitutes acceptance of the new Terms.
      </p>

      <hr />

      <h2>13. Termination</h2>
      <p>
        We may terminate or suspend your access to the Site immediately, without prior notice, for conduct that
        we believe violates these Terms, is harmful to other users or providers, or is harmful to our business
        interests.
      </p>
      <p>
        Upon termination, your right to use the Site ceases immediately. Provisions that by their nature should
        survive termination (including disclaimers, limitations of liability, and indemnification) will survive.
      </p>

      <hr />

      <h2>14. General Provisions</h2>

      <h3>14.1 Entire Agreement</h3>
      <p>
        These Terms, together with our Privacy Policy, constitute the entire agreement between you and Find ABA
        Therapy regarding the Site.
      </p>

      <h3>14.2 Severability</h3>
      <p>
        If any provision of these Terms is found unenforceable, the remaining provisions will continue in full
        force and effect.
      </p>

      <h3>14.3 Waiver</h3>
      <p>
        Our failure to enforce any right or provision of these Terms will not be considered a waiver of that
        right or provision.
      </p>

      <h3>14.4 Assignment</h3>
      <p>
        You may not assign or transfer your rights under these Terms without our written consent. We may assign
        our rights and obligations without restriction.
      </p>

      <hr />

      <h2>15. Contact Us</h2>
      <p>If you have questions about these Terms of Service, please contact us:</p>
      <ul>
        <li>
          <strong>Email:</strong> <a href="mailto:support@findabatherapy.org">support@findabatherapy.org</a>
        </li>
        <li>
          <strong>General Inquiries:</strong>{" "}
          <a href="https://www.findabatherapy.org/contact">findabatherapy.org/contact</a>
        </li>
        <li>
          <strong>Billing Questions:</strong>{" "}
          <a href="mailto:support@findabatherapy.org">support@findabatherapy.org</a>
        </li>
      </ul>

      <hr />

      <p className="text-sm text-muted-foreground">
        These Terms of Service are effective as of January 1, 2025 and apply to all users of findabatherapy.org.
      </p>
    </div>
  );
}
