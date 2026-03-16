/**
 * Hardcoded policy content for the three sign-up checkboxes.
 * Slug values must match backend user_policy_consents.policy_slug.
 */

export const POLICY_SLUGS = [
  "acceptable_use",
  "user_content_disclaimer",
  "console_tos",
] as const;

export type PolicySlug = (typeof POLICY_SLUGS)[number];

export interface PolicyContent {
  title: string;
  slug: PolicySlug;
  effectiveDate: string;
  lastUpdated: string;
  checkboxLabel: string;
  confirmLabel: string;
  content: string;
  /** Pre-formatted HTML for rich display in the modal */
  htmlContent: string;
}

export const POLICIES: Record<PolicySlug, PolicyContent> = {
  acceptable_use: {
    title: "Acceptable Use Policy",
    slug: "acceptable_use",
    effectiveDate: "March 16, 2026",
    lastUpdated: "March 16, 2026",
    checkboxLabel: "I agree with LaaS's Policy",
    confirmLabel: "I have read and agree to the Acceptable Use Policy",
    content: `Introduction

This Acceptable Use Policy ("Policy") governs the use of LaaS's services, systems, and resources ("Services"). All users must comply with this Policy to ensure a safe, respectful, and lawful environment.

General Use

Users must use the Services lawfully, ethically, and responsibly. Prohibited activities include, but are not limited to:

• Posting or sharing prohibited Not Safe For Work content or language, including hate speech, explicit illegal activities, sexually explicit content, pornography, graphic violence, or content targeting protected groups for harm or discrimination;
• Conducting any activity that involves abuse, harassment, offensive remarks based on race or ethnicity, defamation, violations of personal privacy or publicity rights, bullying, or libel;
• Discriminating against, inciting, promoting discrimination, or otherwise engaging in abusive behavior toward others based on sex, ethnicity, race, religion, sexual orientation, age, disability, ancestry, national origin, appearance, or any other basis;
• Inciting, encouraging, or creating a risk of death, violence, disability, physical or mental harm, emotional distress or disfigurement to anyone;
• Perpetrating child sexual abuse, exploitation, grooming, or harm;
• Involving the promotion of illegal activities, including sale of illegal products or services;
• Violating intellectual property rights, data privacy rights or other rights of any third party;
• Engaging in or promoting any fraudulent activity or sharing false, deceptive, or misleading information;
• Posting or sharing political opinions, advertisements, or materials that do not comply with any applicable law or regulation or could disrupt the safe and respectful environment established by LaaS.

GPU Resource Usage

• GPU compute resources must be used exclusively for legitimate AI research, development, and educational purposes;
• Cryptocurrency mining, blockchain operations, or any non-sanctioned compute-intensive operations are strictly prohibited.

Enforcement and Amendment

LaaS reserves the right to monitor, moderate, and remove content or suspend users that violate this Policy. Users are encouraged to report violations to LaaS support teams. Violations may result in temporary suspension or permanent termination of Service access.`,
    htmlContent: `<h3>Introduction</h3>
<p>This Acceptable Use Policy ("Policy") governs the use of LaaS's services, systems, and resources ("Services"). All users must comply with this Policy to ensure a safe, respectful, and lawful environment.</p>

<h3>General Use</h3>
<p>Users must use the Services lawfully, ethically, and responsibly. Prohibited activities include, but are not limited to:</p>
<ul>
<li>Posting or sharing prohibited Not Safe For Work content or language, including hate speech, explicit illegal activities, sexually explicit content, pornography, graphic violence, or content targeting protected groups for harm or discrimination;</li>
<li>Conducting any activity that involves abuse, harassment, offensive remarks based on race or ethnicity, defamation, violations of personal privacy or publicity rights, bullying, or libel;</li>
<li>Discriminating against, inciting, promoting discrimination, or otherwise engaging in abusive behavior toward others based on sex, ethnicity, race, religion, sexual orientation, age, disability, ancestry, national origin, appearance, or any other basis;</li>
<li>Inciting, encouraging, or creating a risk of death, violence, disability, physical or mental harm, emotional distress or disfigurement to anyone;</li>
<li>Perpetrating child sexual abuse, exploitation, grooming, or harm;</li>
<li>Involving the promotion of illegal activities, including sale of illegal products or services;</li>
<li>Violating intellectual property rights, data privacy rights or other rights of any third party;</li>
<li>Engaging in or promoting any fraudulent activity or sharing false, deceptive, or misleading information;</li>
<li>Posting or sharing political opinions, advertisements, or materials that do not comply with any applicable law or regulation or could disrupt the safe and respectful environment established by LaaS.</li>
</ul>

<h3>GPU Resource Usage</h3>
<ul>
<li>GPU compute resources must be used exclusively for legitimate AI research, development, and educational purposes;</li>
<li>Cryptocurrency mining, blockchain operations, or any non-sanctioned compute-intensive operations are strictly prohibited.</li>
</ul>

<h3>Enforcement and Amendment</h3>
<p>LaaS reserves the right to monitor, moderate, and remove content or suspend users that violate this Policy.</p>
<p>Users are encouraged to report violations to LaaS support teams.</p>
<p>Violations may result in temporary suspension or permanent termination of Service access.</p>`,
  },

  user_content_disclaimer: {
    title: "User Content Disclaimer",
    slug: "user_content_disclaimer",
    effectiveDate: "March 16, 2026",
    lastUpdated: "March 16, 2026",
    checkboxLabel: "I agree with the User Content Disclaimer",
    confirmLabel: "I have read and agree to the User Content Disclaimer",
    content: `User Content Disclaimer

This User Content Disclaimer ("Disclaimer") applies to all content generated, uploaded, shared, or otherwise made available by users through the LaaS platform ("Services").

Ownership and Responsibility

Users retain ownership of all content they create, upload, or generate using the Services. LaaS does not claim any ownership rights over user-generated content. Users are solely responsible for ensuring their content complies with all applicable laws, regulations, and the LaaS Acceptable Use Policy.

Content Storage and Persistence

• Stateful desktop sessions include persistent storage (15GB per user) on network-attached storage;
• Ephemeral session data is not persisted after session termination;
• LaaS reserves the right to delete user data after account termination or prolonged inactivity as defined in the Terms of Service;
• Users are responsible for backing up their own data.

Prohibited Content

Users must not use the Services to create, store, or distribute content that violates any applicable law, infringes on intellectual property rights of third parties, contains malware or harmful code, or constitutes academic fraud or plagiarism.

Limitation of Liability

LaaS shall not be liable for any loss, damage, or corruption of user content, regardless of cause.`,
    htmlContent: `<h3>User Content Disclaimer</h3>
<p>This User Content Disclaimer ("Disclaimer") applies to all content generated, uploaded, shared, or otherwise made available by users through the LaaS platform ("Services").</p>

<h3>Ownership and Responsibility</h3>
<p>Users retain ownership of all content they create, upload, or generate using the Services. LaaS does not claim any ownership rights over user-generated content. Users are solely responsible for ensuring their content complies with all applicable laws, regulations, and the LaaS Acceptable Use Policy.</p>

<h3>Content Storage and Persistence</h3>
<ul>
<li>Stateful desktop sessions include persistent storage (15GB per user) on network-attached storage;</li>
<li>Ephemeral session data is not persisted after session termination;</li>
<li>LaaS reserves the right to delete user data after account termination or prolonged inactivity as defined in the Terms of Service;</li>
<li>Users are responsible for backing up their own data.</li>
</ul>

<h3>Prohibited Content</h3>
<p>Users must not use the Services to create, store, or distribute content that violates any applicable law, infringes on intellectual property rights of third parties, contains malware or harmful code, or constitutes academic fraud or plagiarism.</p>

<h3>Limitation of Liability</h3>
<p>LaaS shall not be liable for any loss, damage, or corruption of user content, regardless of cause.</p>`,
  },

  console_tos: {
    title: "Console Terms of Service",
    slug: "console_tos",
    effectiveDate: "March 16, 2026",
    lastUpdated: "March 16, 2026",
    checkboxLabel: "I agree with the Console Terms of Service",
    confirmLabel: "I have read and agree to the Console Terms of Service",
    content: `Console Terms of Service

These Terms of Service ("Terms") govern your use of the LaaS platform console and all associated services.

1. Account Registration

By creating an account, you represent that the information you provide is accurate and complete, you will maintain the security of your account credentials, and you will promptly notify LaaS of any unauthorized use of your account.

2. Service Description

LaaS provides on-demand access to GPU compute resources, including stateful desktop sessions with persistent storage (for university/institution members), ephemeral compute sessions (Jupyter, Code-Server, CLI) for all users, booking and scheduling of compute time slots, and wallet-based billing and subscription plans.

3. Billing and Payments

All usage is billed according to the applicable rate for your compute configuration. Wallet balances must be maintained to use pay-as-you-go services. Sessions may be automatically terminated when wallet balance reaches zero.

4. Session Policies

Sessions are subject to idle timeout policies. Users must save their work before session end times. LaaS is not responsible for data loss from terminated sessions.

5. Termination

LaaS may suspend or terminate your account at any time for violations of these Terms or the Acceptable Use Policy. Upon termination, access to compute resources will be immediately revoked.

6. Governing Law

These Terms are governed by the laws of India. Any disputes shall be resolved in the courts of Tamil Nadu, India.`,
    htmlContent: `<h3>Console Terms of Service</h3>
<p>These Terms of Service ("Terms") govern your use of the LaaS platform console and all associated services.</p>

<h3>1. Account Registration</h3>
<p>By creating an account, you represent that the information you provide is accurate and complete, you will maintain the security of your account credentials, and you will promptly notify LaaS of any unauthorized use of your account.</p>

<h3>2. Service Description</h3>
<p>LaaS provides on-demand access to GPU compute resources, including:</p>
<ul>
<li>Stateful desktop sessions with persistent storage (for university/institution members);</li>
<li>Ephemeral compute sessions (Jupyter, Code-Server, CLI) for all users;</li>
<li>Booking and scheduling of compute time slots;</li>
<li>Wallet-based billing and subscription plans.</li>
</ul>

<h3>3. Billing and Payments</h3>
<p>All usage is billed according to the applicable rate for your compute configuration. Wallet balances must be maintained to use pay-as-you-go services. Sessions may be automatically terminated when wallet balance reaches zero.</p>

<h3>4. Session Policies</h3>
<p>Sessions are subject to idle timeout policies. Users must save their work before session end times. LaaS is not responsible for data loss from terminated sessions.</p>

<h3>5. Termination</h3>
<p>LaaS may suspend or terminate your account at any time for violations of these Terms or the Acceptable Use Policy. Upon termination, access to compute resources will be immediately revoked.</p>

<h3>6. Governing Law</h3>
<p>These Terms are governed by the laws of India. Any disputes shall be resolved in the courts of Tamil Nadu, India.</p>`,
  },
};
