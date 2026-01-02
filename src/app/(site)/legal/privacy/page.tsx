import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Find ABA Therapy",
  description: "Privacy Policy for Find ABA Therapy - how we collect, use, and protect your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container prose prose-slate max-w-4xl px-4 py-16 dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p className="lead">
        <strong>Effective Date:</strong> January 1, 2025
        <br />
        <strong>Last Updated:</strong> December 30, 2024
      </p>

      <p>
        Find ABA Therapy (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website findabatherapy.org (the &quot;Site&quot;).
        This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our Site
        or use our services. Please read this policy carefully. By using the Site, you consent to the practices described herein.
      </p>

      <hr />

      <h2>1. Information We Collect</h2>

      <h3>1.1 Information You Provide Directly</h3>
      <ul>
        <li>
          <strong>Account Information:</strong> When you create an account as a therapy provider, we collect your name,
          email address, phone number, and business information (practice name, address, services offered).
        </li>
        <li>
          <strong>Contact Form Submissions:</strong> When families submit inquiries through provider contact forms, we collect
          the information provided (name, email, phone number, message content, and any details about care needs).
        </li>
        <li>
          <strong>Payment Information:</strong> When you subscribe to a paid plan, payment is processed by Stripe, Inc.
          We do not store your full credit card number. We receive only the last four digits, card type, and billing address
          for record-keeping purposes.
        </li>
      </ul>

      <h3>1.2 Information Collected Automatically</h3>
      <ul>
        <li>
          <strong>Usage Data:</strong> We collect information about how you interact with the Site, including pages visited,
          search queries, clicks on listings, and time spent on pages.
        </li>
        <li>
          <strong>Device Information:</strong> We collect browser type, operating system, device type, and screen resolution.
        </li>
        <li>
          <strong>IP Address:</strong> We collect IP addresses for security purposes, fraud prevention, and to provide
          location-relevant search results.
        </li>
        <li>
          <strong>Cookies and Similar Technologies:</strong> We use essential cookies to maintain session state and
          remember your preferences. We do not use third-party advertising cookies.
        </li>
      </ul>

      <h3>1.3 Information from Third Parties</h3>
      <ul>
        <li>
          <strong>Google Maps/Places API:</strong> When you use address autocomplete features, Google may collect usage data
          subject to Google&apos;s Privacy Policy.
        </li>
        <li>
          <strong>Stripe:</strong> Our payment processor provides us with transaction confirmations and subscription status.
        </li>
      </ul>

      <hr />

      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Operate, maintain, and improve the Site and our services</li>
        <li>Process transactions and send related information (confirmations, invoices, renewal notices)</li>
        <li>Connect families with ABA therapy providers through our directory and contact forms</li>
        <li>Send administrative communications (service updates, security alerts, support messages)</li>
        <li>Respond to your comments, questions, and customer service requests</li>
        <li>Monitor and analyze usage patterns and trends to improve user experience</li>
        <li>Detect, prevent, and address fraud, spam, and security issues</li>
        <li>Comply with legal obligations and enforce our Terms of Service</li>
      </ul>

      <hr />

      <h2>3. How We Share Your Information</h2>
      <p>We do not sell your personal information. We may share information in the following circumstances:</p>

      <h3>3.1 With Therapy Providers</h3>
      <p>
        When you submit a contact form inquiry, your provided information (name, contact details, message) is shared with
        the therapy provider you are contacting. Providers may use this information to respond to your inquiry.
      </p>

      <h3>3.2 With Service Providers</h3>
      <p>We share information with third-party vendors who perform services on our behalf:</p>
      <ul>
        <li><strong>Stripe:</strong> Payment processing</li>
        <li><strong>Supabase:</strong> Database hosting and authentication</li>
        <li><strong>Vercel:</strong> Website hosting</li>
        <li><strong>Resend:</strong> Transactional email delivery</li>
        <li><strong>Cloudflare:</strong> Security and spam protection (Turnstile)</li>
        <li><strong>Google:</strong> Maps and address autocomplete services</li>
      </ul>

      <h3>3.3 For Legal Reasons</h3>
      <p>We may disclose information if required by law, court order, or governmental request, or when we believe
      disclosure is necessary to protect our rights, your safety, or the safety of others.</p>

      <h3>3.4 Business Transfers</h3>
      <p>If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part
      of that transaction. We will notify you of any change in ownership or uses of your personal information.</p>

      <hr />

      <h2>4. Data Retention</h2>
      <ul>
        <li>
          <strong>Account Data:</strong> We retain your account information for as long as your account is active.
          You may request deletion at any time.
        </li>
        <li>
          <strong>Contact Form Inquiries:</strong> Inquiry data is retained for up to 2 years to allow providers to
          reference past communications, unless earlier deletion is requested.
        </li>
        <li>
          <strong>Payment Records:</strong> Transaction records are retained for 7 years as required for tax and
          accounting purposes.
        </li>
        <li>
          <strong>Usage Analytics:</strong> Anonymized analytics data may be retained indefinitely for aggregate
          statistical analysis.
        </li>
      </ul>

      <hr />

      <h2>5. Your Rights and Choices</h2>

      <h3>5.1 Access and Correction</h3>
      <p>You may access and update your account information at any time by logging into your dashboard.</p>

      <h3>5.2 Deletion</h3>
      <p>
        You may request deletion of your account and personal data by contacting us at{" "}
        <a href="mailto:support@findabatherapy.org">support@findabatherapy.org</a>. We will process your request
        within 30 days, subject to any legal retention requirements.
      </p>

      <h3>5.3 Opt-Out of Communications</h3>
      <p>
        You may opt out of promotional emails by clicking the &quot;unsubscribe&quot; link in any email. You cannot opt out
        of transactional emails related to your account or subscriptions.
      </p>

      <h3>5.4 Cookie Preferences</h3>
      <p>
        Most web browsers allow you to control cookies through settings. Disabling cookies may affect Site functionality.
      </p>

      <hr />

      <h2>6. Data Security</h2>
      <p>
        We implement appropriate technical and organizational measures to protect your personal information, including:
      </p>
      <ul>
        <li>Encryption of data in transit (HTTPS/TLS)</li>
        <li>Encryption of sensitive data at rest</li>
        <li>Regular security assessments</li>
        <li>Access controls limiting employee access to personal data</li>
        <li>Secure authentication practices</li>
      </ul>
      <p>
        However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee
        absolute security.
      </p>

      <hr />

      <h2>7. Children&apos;s Privacy</h2>
      <p>
        Our Site is not directed to children under 13 years of age. We do not knowingly collect personal information from
        children under 13. If you believe we have inadvertently collected such information, please contact us immediately
        at <a href="mailto:support@findabatherapy.org">support@findabatherapy.org</a>.
      </p>

      <hr />

      <h2>8. Health Information Disclaimer</h2>
      <p>
        Find ABA Therapy is a directory service connecting families with therapy providers. We are not a healthcare provider
        and do not provide medical advice, diagnosis, or treatment. Information shared through contact forms is for
        scheduling and inquiry purposes only.
      </p>
      <p>
        While our contact forms may collect general information about care needs, we are not a HIPAA-covered entity.
        Providers listed on our platform are responsible for their own HIPAA compliance when handling protected health
        information outside of our platform.
      </p>

      <hr />

      <h2>9. Third-Party Links</h2>
      <p>
        The Site may contain links to third-party websites, including provider websites. We are not responsible for
        the privacy practices of these external sites. We encourage you to review the privacy policies of any site
        you visit.
      </p>

      <hr />

      <h2>10. Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes by posting the
        updated policy on this page with a new &quot;Last Updated&quot; date. Your continued use of the Site after changes
        constitutes acceptance of the updated policy.
      </p>

      <hr />

      <h2>11. Contact Us</h2>
      <p>If you have questions about this Privacy Policy or our data practices, please contact us:</p>
      <ul>
        <li>
          <strong>Email:</strong> <a href="mailto:support@findabatherapy.org">support@findabatherapy.org</a>
        </li>
        <li>
          <strong>Website:</strong> <a href="https://www.findabatherapy.org/contact">findabatherapy.org/contact</a>
        </li>
      </ul>

      <hr />

      <p className="text-sm text-muted-foreground">
        This Privacy Policy is effective as of January 1, 2025 and applies to all users of findabatherapy.org.
      </p>
    </div>
  );
}
