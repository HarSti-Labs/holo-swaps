import Link from "next/link";

const EFFECTIVE_DATE = "April 19, 2025";
const COMPANY = "Harsti Labs LLC";
const PLATFORM = "HoloSwaps";
const CONTACT_EMAIL = "admin@holoswaps.com";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Title */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
            Legal Document
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Privacy Policy</h1>
          <p className="text-slate-400">
            Last updated: <span className="text-white font-medium">{EFFECTIVE_DATE}</span>
          </p>
          <p className="text-slate-400 mt-2">
            Operated by <span className="text-white font-medium">{COMPANY}</span>
          </p>
        </div>

        <div className="space-y-10 text-slate-300 leading-relaxed">

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
            <p className="text-blue-200 text-sm">
              {COMPANY} ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use {PLATFORM} ("Platform"). Please read it carefully. If you disagree with the terms of this policy, please discontinue use of the Platform.
            </p>
          </div>

          <Section title="1. Information We Collect">
            <p className="font-semibold text-white">1.1 Information You Provide Directly</p>
            <ul className="mt-2 space-y-2 list-none">
              {[
                "Account registration data: name, email address, username, and password.",
                "Profile information: username, reputation score, trade history.",
                "Shipping address(es) you add to your account for facilitating trades.",
                "Card collection data: cards you list, their condition, attributes, and market values.",
                "Want list data: cards you are seeking and associated preferences.",
                "Communications: messages sent to other users through the Platform, support requests, and dispute submissions.",
                "Payment information: if applicable, processed through secure third-party payment processors. We do not store full payment card numbers.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="font-semibold text-white mt-5">1.2 Information Collected Automatically</p>
            <ul className="mt-2 space-y-2 list-none">
              {[
                "Device information: IP address, browser type, operating system, and device identifiers.",
                "Usage data: pages visited, features used, search queries, clicks, and session duration.",
                "Cookies and similar tracking technologies (see Section 6).",
                "Log data: server logs, error reports, and diagnostic information.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="font-semibold text-white mt-5">1.3 Information from Third Parties</p>
            <p className="mt-2">
              We may receive information about you from third-party services you authorize to connect with your account (e.g., social login providers), as well as from payment processors and identity verification services.
            </p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Create and manage your account and authenticate your identity.",
                "Facilitate and coordinate card trades between users.",
                "Match your collection and want list with other users for potential trades.",
                "Process and deliver shipping address information to complete trades.",
                "Send transactional emails such as trade confirmations, shipping notifications, and account alerts.",
                "Provide customer support and resolve disputes.",
                "Display your public profile, reputation score, and trade history to other users.",
                "Detect, investigate, and prevent fraudulent or prohibited activity.",
                "Improve the Platform's features, performance, and user experience.",
                "Comply with legal obligations and enforce our Terms of Service.",
                "Send promotional communications (only with your consent, and you may opt out at any time).",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="3. How We Share Your Information">
            <p>
              We do not sell your personal information to third parties. We may share your information in the following circumstances:
            </p>

            <p className="font-semibold text-white mt-5">3.1 With Other Users</p>
            <p className="mt-2">
              Your username, public collection, want list, reputation score, and trade history are visible to other users of the Platform. Your shipping address is shared only with trade partners and, if applicable, the Company's verification center — it is never publicly displayed.
            </p>

            <p className="font-semibold text-white mt-5">3.2 Service Providers</p>
            <p className="mt-2">
              We may share your information with trusted third-party vendors and service providers who assist us in operating the Platform, including hosting providers, email delivery services, payment processors, analytics providers, and fraud prevention services. These parties are contractually obligated to use your information only as directed by us and to maintain appropriate security standards.
            </p>

            <p className="font-semibold text-white mt-5">3.3 Legal Requirements</p>
            <p className="mt-2">
              We may disclose your information if required to do so by law or in good faith belief that such disclosure is necessary to: (a) comply with legal process or governmental requests; (b) enforce our Terms of Service; (c) protect the rights, property, or safety of {COMPANY}, its users, or the public; or (d) detect, prevent, or address fraud or security issues.
            </p>

            <p className="font-semibold text-white mt-5">3.4 Business Transfers</p>
            <p className="mt-2">
              In the event of a merger, acquisition, reorganization, bankruptcy, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will notify you via email and/or a prominent notice on the Platform of any such change in ownership or use of your personal information.
            </p>
          </Section>

          <Section title="4. Data Retention">
            <p>
              We retain your personal information for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we will delete or anonymize your personal information within a reasonable period, except where retention is required by law or for legitimate business purposes such as fraud prevention.
            </p>
            <p className="mt-3">
              Trade records and transaction history may be retained for up to seven (7) years for legal, tax, and compliance purposes even after account deletion.
            </p>
          </Section>

          <Section title="5. Data Security">
            <p>
              We implement industry-standard technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption of data in transit (TLS/HTTPS), hashed password storage, access controls, and regular security assessments.
            </p>
            <p className="mt-3">
              However, no method of electronic transmission or storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security. You are responsible for maintaining the confidentiality of your account credentials. If you believe your account has been compromised, contact us immediately at {CONTACT_EMAIL}.
            </p>
          </Section>

          <Section title="6. Cookies and Tracking Technologies">
            <p>
              We use cookies and similar tracking technologies (such as local storage and session tokens) to operate and improve the Platform. These technologies help us:
            </p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Keep you logged in to your account.",
                "Remember your preferences and settings.",
                "Understand how you use the Platform (analytics).",
                "Detect and prevent security threats.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              You can control cookie settings through your browser. Disabling cookies may affect the functionality of the Platform. We do not currently respond to browser "Do Not Track" signals.
            </p>
          </Section>

          <Section title="7. Your Rights and Choices">
            <p>Depending on your location, you may have the following rights regarding your personal information:</p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Access: Request a copy of the personal information we hold about you.",
                "Correction: Request that we correct inaccurate or incomplete information.",
                "Deletion: Request deletion of your personal information, subject to retention requirements.",
                "Portability: Request your data in a structured, machine-readable format.",
                "Objection: Object to our processing of your information in certain circumstances.",
                "Opt-out of marketing: Unsubscribe from promotional emails at any time using the link in the email or by contacting us.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              To exercise any of these rights, contact us at {CONTACT_EMAIL}. We will respond within 30 days. We may need to verify your identity before processing your request.
            </p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>
              The Platform is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13 without parental consent, we will take steps to delete that information promptly. If you believe we may have information from or about a child under 13, please contact us at {CONTACT_EMAIL}.
            </p>
          </Section>

          <Section title="9. California Privacy Rights (CCPA)">
            <p>
              If you are a California resident, you have additional rights under the California Consumer Privacy Act ("CCPA"), including the right to know what personal information we collect, the right to delete personal information, the right to opt out of the sale of personal information (we do not sell personal information), and the right to non-discrimination for exercising your CCPA rights.
            </p>
            <p className="mt-3">
              To submit a CCPA request, contact us at {CONTACT_EMAIL} with the subject line "CCPA Request."
            </p>
          </Section>

          <Section title="10. International Users">
            <p>
              {PLATFORM} is operated from the United States. If you are accessing the Platform from outside the United States, please be aware that your information may be transferred to, stored in, and processed in the United States, where data protection laws may differ from those in your jurisdiction. By using the Platform, you consent to this transfer.
            </p>
          </Section>

          <Section title="11. Changes to This Privacy Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by updating the "Last updated" date and, where appropriate, by sending an email notification. We encourage you to review this policy periodically. Your continued use of the Platform following any changes constitutes your acceptance of the revised policy.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-4 bg-slate-800/50 rounded-xl p-5 border border-slate-700 space-y-1">
              <p className="text-white font-semibold">{COMPANY}</p>
              <p>Operating as: {PLATFORM}</p>
              <p>
                Email:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-400 hover:text-blue-300">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </Section>

          {/* Footer */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 text-center">
            <p className="text-slate-400 text-sm">
              By using HoloSwaps, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20">
      <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-slate-700/50">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
