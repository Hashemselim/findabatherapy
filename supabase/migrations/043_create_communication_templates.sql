-- Communication Templates & Client Communications
-- Phase 2 of Behavior Work lifecycle engine

-- ============================================================================
-- Table: communication_templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS communication_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  lifecycle_stage text NOT NULL DEFAULT 'any',
  subject text NOT NULL,
  body text NOT NULL,
  merge_fields text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, slug)
);

-- System templates have NULL profile_id; agency customs have profile_id set
CREATE INDEX idx_comm_templates_profile ON communication_templates(profile_id);
CREATE INDEX idx_comm_templates_stage ON communication_templates(lifecycle_stage);

-- RLS
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;

-- Users can read system defaults (profile_id IS NULL) plus their own
CREATE POLICY "Users can view system and own templates"
  ON communication_templates FOR SELECT
  USING (profile_id IS NULL OR profile_id = auth.uid());

-- Users can insert their own templates only
CREATE POLICY "Users can create own templates"
  ON communication_templates FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Users can update their own templates only
CREATE POLICY "Users can update own templates"
  ON communication_templates FOR UPDATE
  USING (profile_id = auth.uid());

-- Users can delete their own templates only
CREATE POLICY "Users can delete own templates"
  ON communication_templates FOR DELETE
  USING (profile_id = auth.uid());

-- ============================================================================
-- Table: client_communications
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_slug text,
  subject text NOT NULL,
  body text NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  sent_at timestamptz DEFAULT now(),
  sent_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_client_comms_client ON client_communications(client_id);
CREATE INDEX idx_client_comms_profile ON client_communications(profile_id);
CREATE INDEX idx_client_comms_sent_at ON client_communications(sent_at DESC);

-- RLS
ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own communications"
  ON client_communications FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can create own communications"
  ON client_communications FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- ============================================================================
-- Seed: 22 System Default Communication Templates
-- ============================================================================
INSERT INTO communication_templates (profile_id, name, slug, lifecycle_stage, subject, body, merge_fields, sort_order) VALUES

-- 1. Inquiry Received
(NULL, 'Inquiry Received', 'inquiry-received', 'inquiry',
 'We received your message, {parent_name}',
 '<p>Hi {parent_name},</p><p>Thank you for reaching out to {agency_name}. We''ve received your message and a member of our team will be in touch within 1-2 business days.</p><p>In the meantime, if you have any questions about our services or would like to learn more about ABA therapy, feel free to visit our resource page.</p><p>We look forward to connecting with your family.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'agency_name', 'agency_phone', 'agency_email'],
 1),

-- 2. Intake Received
(NULL, 'Intake Received', 'intake-received', 'inquiry',
 'Your intake form has been received — {agency_name}',
 '<p>Hi {parent_name},</p><p>Thank you for completing the intake form for {client_name}. We''ve received your information and our team is reviewing it now.</p><p><strong>What happens next:</strong></p><ul><li>Our intake coordinator will review the information you provided</li><li>We''ll verify insurance eligibility</li><li>You''ll hear from us within 2-3 business days with next steps</li></ul><p>If you have any questions in the meantime, don''t hesitate to reach out.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'agency_name', 'agency_phone', 'agency_email'],
 2),

-- 3. Request for Information
(NULL, 'Request for Information', 'request-for-information', 'intake_pending',
 'We need a bit more information — {agency_name}',
 '<p>Hi {parent_name},</p><p>Thank you for choosing {agency_name} for {client_name}''s care. To move forward with the intake process, we need a few additional pieces of information.</p><p>Could you please provide the following at your earliest convenience:</p><ul><li>A copy of your current insurance card (front and back)</li><li>Any relevant medical records or prior evaluations</li><li>A copy of the diagnosis or referral from your child''s physician</li></ul><p>You can reply to this email with the documents attached, or contact us to arrange another method of delivery.</p><p>We want to make this process as smooth as possible for your family.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'agency_name', 'agency_phone', 'agency_email'],
 3),

-- 4. Eligibility Check Update
(NULL, 'Eligibility Check Update', 'eligibility-check-update', 'intake_pending',
 'Insurance eligibility update for {client_name} — {agency_name}',
 '<p>Hi {parent_name},</p><p>We wanted to let you know that we are currently verifying insurance eligibility for {client_name} with {insurance_name}.</p><p>This process typically takes 3-5 business days. We''ll reach out as soon as we have an update.</p><p>No action is needed from you right now. If you have any questions, feel free to contact us.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'insurance_name', 'agency_name', 'agency_phone', 'agency_email'],
 4),

-- 5. Assessment Authorization Requested
(NULL, 'Assessment Authorization Requested', 'assessment-auth-requested', 'assessment',
 'Assessment authorization submitted for {client_name} — {agency_name}',
 '<p>Hi {parent_name},</p><p>Great news! We''ve submitted the initial assessment authorization request for {client_name} to {insurance_name}.</p><p><strong>What this means:</strong></p><ul><li>We''re requesting approval for an initial behavioral assessment</li><li>Insurance typically responds within 5-10 business days</li><li>Once approved, we''ll contact you to schedule the assessment</li></ul><p>We''ll keep you updated on the status. No action is needed from you right now.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'insurance_name', 'agency_name', 'agency_phone', 'agency_email'],
 5),

-- 6. Assessment Authorized
(NULL, 'Assessment Authorized', 'assessment-authorized', 'assessment',
 'Great news — Assessment approved for {client_name}!',
 '<p>Hi {parent_name},</p><p>We''re happy to let you know that {insurance_name} has approved the initial assessment for {client_name}!</p><p><strong>Next steps:</strong></p><ul><li>Our team will reach out to schedule the assessment</li><li>The assessment typically takes 2-3 hours</li><li>Please have your child well-rested and comfortable for the session</li></ul><p>We''ll be in touch soon to find a time that works for your family.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'insurance_name', 'agency_name', 'agency_phone', 'agency_email'],
 6),

-- 7. Assessment Authorization Denied
(NULL, 'Assessment Authorization Denied', 'assessment-auth-denied', 'assessment',
 'Assessment authorization update for {client_name} — {agency_name}',
 '<p>Hi {parent_name},</p><p>We wanted to let you know that {insurance_name} has denied the initial assessment authorization for {client_name}. We understand this is disappointing news, and we want to help.</p><p><strong>What we''re doing:</strong></p><ul><li>Our team is reviewing the denial reason</li><li>We''ll determine if an appeal is appropriate</li><li>We''ll discuss alternative options with you</li></ul><p>A member of our team will reach out within the next 1-2 business days to discuss next steps and options. Please don''t hesitate to contact us if you have immediate questions.</p><p>We''re committed to helping {client_name} get the care they need.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'insurance_name', 'agency_name', 'agency_phone', 'agency_email'],
 7),

-- 8. Schedule Your Assessment
(NULL, 'Schedule Your Assessment', 'schedule-assessment', 'assessment',
 'Let''s schedule {client_name}''s assessment — {agency_name}',
 '<p>Hi {parent_name},</p><p>It''s time to schedule {client_name}''s initial behavioral assessment! This is an exciting step forward.</p><p><strong>What to know about the assessment:</strong></p><ul><li>It typically takes 2-3 hours</li><li>A Board Certified Behavior Analyst (BCBA) will conduct the evaluation</li><li>Your child should be well-rested and comfortable</li><li>A parent or caregiver needs to be present</li></ul><p>Please reply to this email or call us at {agency_phone} to schedule a time that works for your family.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'agency_name', 'agency_phone', 'agency_email'],
 8),

-- 9. Assessment Appointment Confirmation
(NULL, 'Assessment Appointment Confirmation', 'assessment-confirmation', 'assessment',
 'Assessment confirmed for {client_name} — {assessment_date}',
 '<p>Hi {parent_name},</p><p>This email confirms {client_name}''s initial assessment appointment:</p><p><strong>Assessment Details:</strong></p><ul><li><strong>Date:</strong> {assessment_date}</li><li><strong>Time:</strong> {assessment_time}</li><li><strong>Location:</strong> {assessment_location}</li></ul><p><strong>Please bring:</strong></p><ul><li>Insurance card</li><li>Photo ID</li><li>Any prior evaluations or medical records</li><li>A favorite toy or comfort item for your child</li></ul><p>If you need to reschedule, please contact us at least 24 hours in advance at {agency_phone}.</p><p>We look forward to meeting {client_name}!</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'assessment_date', 'assessment_time', 'assessment_location', 'agency_name', 'agency_phone', 'agency_email'],
 9),

-- 10. Assessment Report in Progress
(NULL, 'Assessment Report in Progress', 'assessment-report-progress', 'assessment',
 'Assessment complete — Report in progress for {client_name}',
 '<p>Hi {parent_name},</p><p>Thank you for bringing {client_name} in for the assessment. Our BCBA is now preparing the assessment report and treatment recommendations.</p><p><strong>What happens next:</strong></p><ul><li>The report is typically completed within 1-2 weeks</li><li>We''ll submit the report to {insurance_name} for service authorization</li><li>We''ll schedule a time to review the findings with you</li></ul><p>No action is needed from you right now. We''ll be in touch once the report is ready.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'insurance_name', 'agency_name', 'agency_phone', 'agency_email'],
 10),

-- 11. Report Submitted to Insurance
(NULL, 'Report Submitted to Insurance', 'report-submitted', 'assessment',
 '{client_name}''s report has been submitted to insurance — {agency_name}',
 '<p>Hi {parent_name},</p><p>We''ve completed {client_name}''s assessment report and submitted it to {insurance_name} for authorization of ongoing ABA services.</p><p><strong>What to expect:</strong></p><ul><li>Insurance review typically takes 5-15 business days</li><li>We''ll notify you as soon as we receive a response</li><li>If approved, we''ll begin planning {client_name}''s therapy program</li></ul><p>We''re confident in the recommendations and hopeful for a positive outcome. We''ll keep you updated every step of the way.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'insurance_name', 'agency_name', 'agency_phone', 'agency_email'],
 11),

-- 12. Services Approved
(NULL, 'Services Approved', 'services-approved', 'active',
 'ABA services approved for {client_name}! — {agency_name}',
 '<p>Hi {parent_name},</p><p>Wonderful news! {insurance_name} has approved ABA therapy services for {client_name}. This is a significant milestone, and we''re excited to begin this journey together.</p><p><strong>Next steps:</strong></p><ul><li>Our clinical team will develop {client_name}''s individualized treatment plan</li><li>We''ll match {client_name} with the best therapist for their needs</li><li>We''ll contact you to discuss scheduling and answer any questions</li></ul><p>A member of our team will reach out within the next few days to get started.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'insurance_name', 'agency_name', 'agency_phone', 'agency_email'],
 12),

-- 13. Services Denied
(NULL, 'Services Denied', 'services-denied', 'assessment',
 'Service authorization update for {client_name} — {agency_name}',
 '<p>Hi {parent_name},</p><p>We''re sorry to share that {insurance_name} has denied the authorization for ongoing ABA services for {client_name}. We know this is not the news you were hoping for.</p><p><strong>What we''re doing about it:</strong></p><ul><li>Our team is reviewing the denial reason in detail</li><li>We''ll prepare an appeal if appropriate (most denials can be appealed)</li><li>We''ll explore alternative funding options</li></ul><p>Please know that a denial is not the end of the road. Our team has experience navigating the appeals process, and we''re here to support you. We''ll be in touch within 1-2 business days to discuss options.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'insurance_name', 'agency_name', 'agency_phone', 'agency_email'],
 13),

-- 14. Therapy Start Planning
(NULL, 'Therapy Start Planning', 'therapy-start-planning', 'active',
 'Getting ready to start therapy for {client_name} — {agency_name}',
 '<p>Hi {parent_name},</p><p>We''re preparing to begin ABA therapy for {client_name}. Here''s what you can expect as we get started:</p><p><strong>Your therapy team:</strong></p><ul><li>A Board Certified Behavior Analyst (BCBA) will oversee {client_name}''s program</li><li>A Registered Behavior Technician (RBT) will work directly with {client_name} during sessions</li></ul><p><strong>What to expect:</strong></p><ul><li>We''re working on finalizing the schedule</li><li>Sessions will take place at the location discussed during intake</li><li>The first few sessions focus on building rapport with {client_name}</li></ul><p>We''ll reach out soon with the finalized schedule and team introductions. In the meantime, feel free to contact us with any questions.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'agency_name', 'agency_phone', 'agency_email'],
 14),

-- 15. Welcome to Services
(NULL, 'Welcome to Services', 'welcome-to-services', 'active',
 'Welcome to {agency_name} — {client_name}''s therapy begins!',
 '<p>Hi {parent_name},</p><p>Welcome to {agency_name}! We''re thrilled to officially begin ABA therapy with {client_name}.</p><p><strong>Important information:</strong></p><ul><li>Your primary point of contact is our clinical team at {agency_email}</li><li>If you ever need to reach us quickly, call {agency_phone}</li><li>Parent resources and guides are available on our website</li></ul><p><strong>Tips for getting started:</strong></p><ul><li>Consistency is key — regular attendance leads to the best outcomes</li><li>Communicate openly with the therapy team about your goals and concerns</li><li>Celebrate small wins — progress in ABA is incremental and meaningful</li></ul><p>We''re honored to be part of {client_name}''s journey and your family''s team.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'agency_name', 'agency_phone', 'agency_email'],
 15),

-- 16. Parent Resources
(NULL, 'Parent Resources', 'parent-resources', 'any',
 'Helpful resources for your family — {agency_name}',
 '<p>Hi {parent_name},</p><p>We wanted to share some helpful resources for families navigating ABA therapy. Whether you''re just getting started or have been with us for a while, we hope these are useful.</p><p><strong>Resources for parents:</strong></p><ul><li>Understanding ABA therapy and what to expect</li><li>Tips for supporting your child''s progress at home</li><li>Frequently asked questions about the therapy process</li><li>Local support groups and community resources</li></ul><p>Visit our resource page for the full collection of guides and information.</p><p>If you have any questions or need additional support, we''re always here to help.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'agency_name', 'agency_phone', 'agency_email'],
 16),

-- 17. Waitlist Update
(NULL, 'Waitlist Update', 'waitlist-update', 'waitlist',
 'Waitlist update for {client_name} — {agency_name}',
 '<p>Hi {parent_name},</p><p>We wanted to give you an update on {client_name}''s position on our waitlist. We understand that waiting can be difficult, and we appreciate your patience.</p><p>While we work to find the right opening for {client_name}, here are some things you can do:</p><ul><li>Review our parent resources for information about ABA therapy</li><li>Keep us updated if your contact information or insurance changes</li><li>Let us know if {client_name}''s needs or circumstances have changed</li></ul><p>We''re committed to getting {client_name} started as soon as possible. We''ll be in touch as soon as an opening becomes available.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'agency_name', 'agency_phone', 'agency_email'],
 17),

-- 18. Reassessment Notice
(NULL, 'Reassessment Notice', 'reassessment-notice', 'active',
 'Upcoming reassessment for {client_name} — {agency_name}',
 '<p>Hi {parent_name},</p><p>It''s time for {client_name}''s periodic reassessment. Regular reassessments help us track progress, update goals, and ensure {client_name}''s therapy program continues to meet their needs.</p><p><strong>What this involves:</strong></p><ul><li>Updated skills assessment by the BCBA</li><li>Review of current goals and progress</li><li>Updated treatment recommendations</li><li>Submission to insurance for continued authorization</li></ul><p>Our team will reach out to schedule the reassessment. If you have any observations about {client_name}''s progress or new goals you''d like to discuss, please let us know.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'agency_name', 'agency_phone', 'agency_email'],
 18),

-- 19. Reauthorization Update
(NULL, 'Reauthorization Update', 'reauthorization-update', 'active',
 'Reauthorization update for {client_name} — {agency_name}',
 '<p>Hi {parent_name},</p><p>We wanted to let you know that we''ve submitted the reauthorization request for {client_name}''s continued ABA services to {insurance_name}.</p><p><strong>What this means:</strong></p><ul><li>We''re requesting approval to continue {client_name}''s current therapy program</li><li>Insurance typically responds within 5-15 business days</li><li>Services will continue as usual during the review period</li></ul><p>We''ll notify you as soon as we receive the authorization decision. No action is needed from you.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'insurance_name', 'agency_name', 'agency_phone', 'agency_email'],
 19),

-- 20. Invoice Available
(NULL, 'Invoice Available', 'invoice-available', 'active',
 'Invoice available for {client_name} — {agency_name}',
 '<p>Hi {parent_name},</p><p>An invoice is available for {client_name}''s ABA therapy services.</p><p>If you have any questions about the charges or would like to discuss payment arrangements, please don''t hesitate to contact our billing team.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'agency_name', 'agency_phone', 'agency_email'],
 20),

-- 21. Discharge / End of Services
(NULL, 'Discharge / End of Services', 'discharge-end-of-services', 'discharged',
 'Transition information for {client_name} — {agency_name}',
 '<p>Hi {parent_name},</p><p>As {client_name}''s ABA services with {agency_name} come to a close, we want to ensure a smooth transition for your family.</p><p><strong>What we''ve prepared:</strong></p><ul><li>A summary of {client_name}''s progress and achievements</li><li>Recommendations for continued support at home</li><li>Referrals to other providers or services if needed</li></ul><p><strong>Important to know:</strong></p><ul><li>You can request copies of {client_name}''s records at any time</li><li>Our door is always open if you need to return to services in the future</li></ul><p>It''s been a privilege to work with {client_name} and your family. We wish you all the best.</p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'client_name', 'agency_name', 'agency_phone', 'agency_email'],
 21),

-- 22. General Update
(NULL, 'General Update', 'general-update', 'any',
 'Update from {agency_name}',
 '<p>Hi {parent_name},</p><p></p><p>Warm regards,<br>The {agency_name} Team<br>{agency_phone} | {agency_email}</p>',
 ARRAY['parent_name', 'agency_name', 'agency_phone', 'agency_email'],
 22);
