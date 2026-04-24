import Link from "next/link";

const EFFECTIVE_DATE = "April 19, 2025";
const COMPANY = "Harsti Labs LLC";
const PLATFORM = "HoloSwaps";
const CONTACT_EMAIL = "admin@holoswaps.com";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Title */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-base font-medium mb-6">
            Legal Document
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Terms of Service</h1>
          <p className="text-slate-400">
            Last updated: <span className="text-white font-medium">{EFFECTIVE_DATE}</span>
          </p>
          <p className="text-slate-400 mt-2">
            Operated by <span className="text-white font-medium">{COMPANY}</span>
          </p>
        </div>

        <div className="space-y-10 text-slate-300 leading-relaxed">

          {/* Intro box */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
            <p className="text-yellow-200 font-medium text-base">
              PLEASE READ THESE TERMS OF SERVICE CAREFULLY BEFORE USING {PLATFORM.toUpperCase()}. BY CREATING AN ACCOUNT OR USING THIS PLATFORM IN ANY WAY, YOU AGREE TO BE LEGALLY BOUND BY THESE TERMS. IF YOU DO NOT AGREE, DO NOT USE THIS PLATFORM.
            </p>
          </div>

          <Section title="1. Acceptance of Terms">
            <p>
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and {COMPANY} ("Company," "we," "us," or "our"), the owner and operator of {PLATFORM}, accessible at holoswaps.com and related applications (collectively, the "Platform").
            </p>
            <p className="mt-3">
              By registering an account, accessing, or using the Platform in any manner, you acknowledge that you have read, understood, and agree to be bound by these Terms, along with our Privacy Policy, which is incorporated herein by reference. If you are using the Platform on behalf of an organization, you represent and warrant that you have authority to bind that organization to these Terms.
            </p>
            <p className="mt-3">
              You must be at least 18 years of age to use this Platform. By agreeing to these Terms, you represent and warrant that you are 18 years of age or older. If you are under 18, you may only use the Platform with the express consent and supervision of a parent or legal guardian who agrees to be bound by these Terms on your behalf.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              {PLATFORM} is an online platform that facilitates peer-to-peer trading of trading card game ("TCG") cards, including but not limited to Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece, and Digimon. The Platform provides tools for users to list cards in their collections, express interest in cards they want, discover potential trade matches, and coordinate trades with other users.
            </p>
            <p className="mt-3">
              {PLATFORM} acts solely as a facilitator and marketplace platform. We are not a party to any trade agreement between users, and we do not purchase, own, sell, or transfer title to any cards. The Company is not responsible for the quality, safety, legality, or authenticity of any cards traded on the Platform.
            </p>
            <p className="mt-3">
              The Platform may include an optional card verification and authentication service ("Verification Service") through which cards are routed through a third-party or Company-operated verification center prior to delivery. Use of the Verification Service is subject to additional terms disclosed at the time of trade confirmation. The Company makes no guarantees regarding grading outcomes, turnaround times, or results of authentication.
            </p>
          </Section>

          <Section title="3. User Accounts">
            <p>
              To access the full features of the Platform, you must register for an account. When registering, you agree to:
            </p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Provide accurate, current, and complete information about yourself.",
                "Maintain and promptly update your account information to keep it accurate and complete.",
                "Maintain the security of your account credentials and not share your password with any third party.",
                "Immediately notify us at " + CONTACT_EMAIL + " of any unauthorized use of your account or any other security breach.",
                "Accept responsibility for all activity that occurs under your account.",
                "Not create more than one account per person without express written permission from the Company.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              The Company reserves the right to suspend or permanently terminate any account at its sole discretion, with or without notice, for any reason including but not limited to violation of these Terms, fraudulent activity, or conduct harmful to other users or the Platform.
            </p>
          </Section>

          <Section title="4. Trading Rules and User Obligations">
            <p className="font-semibold text-white">4.1 Accurate Listings</p>
            <p className="mt-2">
              You agree that all cards listed in your collection are accurately described with respect to card name, set, condition, foil status, edition, language, and any other material attributes. Misrepresenting the condition or authenticity of a card is a serious violation of these Terms and may result in immediate account termination and potential legal liability.
            </p>

            <p className="font-semibold text-white mt-5">4.2 Condition Standards</p>
            <p className="mt-2">
              Users are responsible for accurately grading their cards using the condition standards defined on the Platform (Near Mint, Lightly Played, Moderately Played, Heavily Played, Damaged). When in doubt, you should err on the side of listing a lower condition grade. The Company provides these standards as guidance only and does not independently verify user-submitted conditions prior to matching.
            </p>

            <p className="font-semibold text-white mt-5">4.3 Shipping Obligations</p>
            <p className="mt-2">
              Once a trade is mutually accepted by both parties, each user is obligated to:
            </p>
            <ul className="mt-2 space-y-2 list-none">
              {[
                "Ship their agreed-upon cards within five (5) business days of trade acceptance, unless an extension is mutually agreed upon in writing through the Platform.",
                "Package cards securely to prevent damage during transit, using appropriate card sleeves, top loaders, or other protective packaging.",
                "Ship to the address confirmed through the Platform (which may be a Company verification center address).",
                "Provide valid tracking information through the Platform within 24 hours of shipping.",
                "Bear all shipping costs associated with sending their cards unless otherwise agreed in writing.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              Failure to ship within the required timeframe constitutes a trade breach and may result in account suspension, negative reputation impact, and potential liability for the other party's losses.
            </p>

            <p className="font-semibold text-white mt-5">4.4 No Counterfeit Cards</p>
            <p className="mt-2">
              You represent and warrant that all cards you list or trade on the Platform are genuine, authentic trading cards and not counterfeit, altered, proxy, or otherwise fraudulent items. Listing, trading, or attempting to trade counterfeit cards is strictly prohibited and will result in immediate and permanent account termination, forfeiture of any cards held by the Company, and referral to applicable law enforcement authorities. The Company reserves the right to pursue all available legal remedies.
            </p>

            <p className="font-semibold text-white mt-5">4.5 No Market Manipulation</p>
            <p className="mt-2">
              Users may not engage in any activity intended to artificially inflate or manipulate card valuations, create fake trade activity, or otherwise distort the Platform's matching or pricing data.
            </p>
          </Section>

          <Section title="5. Prohibited Conduct">
            <p>You agree not to use the Platform to:</p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Violate any applicable local, state, national, or international law or regulation.",
                "Engage in any fraudulent, deceptive, or misleading activity.",
                "Harass, threaten, intimidate, or harm other users.",
                "Attempt to gain unauthorized access to any part of the Platform or other users' accounts.",
                "Use automated bots, scrapers, or other tools to access or collect data from the Platform without express written consent.",
                "Reproduce, duplicate, sell, or resell any part of the Platform's services.",
                "Transmit any viruses, malware, or other harmful code.",
                "Circumvent, disable, or otherwise interfere with security features of the Platform.",
                "Conduct transactions outside of the Platform in a manner designed to circumvent Platform fees or protections.",
                "Use the Platform for any purpose other than personal, non-commercial card trading.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="6. Verification Service">
            <p>
              Where available, the Platform may offer a Verification Service in which traded cards are routed through a Company-operated or third-party verification center. When using this service:
            </p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Cards remain the property of the sending user until the verification process is complete and cards are forwarded to the receiving user.",
                "The Company will exercise reasonable care in handling cards but is not liable for damage, loss, or theft occurring during transit to or from the verification center beyond what is covered by applicable shipping insurance.",
                "Verification outcomes are based on reasonable inspection and are not a guarantee of authenticity or grading.",
                "If cards fail verification due to suspected counterfeit status, the Company reserves the right to retain cards and contact relevant authorities.",
                "Turnaround times for verification are estimates only and are not guaranteed.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="7. Dispute Resolution Between Users">
            <p>
              The Company provides a dispute resolution process for trade-related issues. To initiate a dispute, users must contact support at {CONTACT_EMAIL} within seven (7) days of receiving cards (or within seven days of the expected delivery date if cards are not received).
            </p>
            <p className="mt-3">
              The Company will review disputes in good faith and may request evidence including photos, shipping receipts, and communication records. The Company's dispute determination is final with respect to any Platform-level actions (account standing, reputation scores) but does not prevent users from seeking remedies through applicable legal channels.
            </p>
            <p className="mt-3 font-semibold text-white">
              THE COMPANY IS NOT LIABLE FOR THE OUTCOME OF ANY TRADE DISPUTE AND DOES NOT GUARANTEE RECOVERY OF CARDS OR MONETARY VALUE. THE COMPANY'S ROLE IN DISPUTE RESOLUTION IS SOLELY THAT OF AN ADMINISTRATIVE FACILITATOR.
            </p>
          </Section>

          <Section title="8. Fees and Payments">
            <p>
              The Platform may charge fees for certain services, including but not limited to premium memberships, verification services, or transaction fees. All applicable fees will be disclosed clearly prior to any transaction. All fees are non-refundable except where required by applicable law or expressly stated otherwise.
            </p>
            <p className="mt-3">
              The Company reserves the right to change its fee structure at any time with reasonable notice to users. Continued use of the Platform after a fee change constitutes acceptance of the new fees.
            </p>
          </Section>

          <Section title="9. Intellectual Property">
            <p>
              All content on the Platform, including but not limited to the HoloSwaps name, logo, design, software, algorithms, text, graphics, and data compilations, is the exclusive property of {COMPANY} or its licensors and is protected by applicable intellectual property laws.
            </p>
            <p className="mt-3">
              You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Platform solely for your personal, non-commercial use in accordance with these Terms. You may not copy, modify, distribute, sell, or lease any part of the Platform or its content.
            </p>
            <p className="mt-3">
              Trading card images, names, and game-related content are the property of their respective publishers and rights holders. {COMPANY} uses such content under applicable fair use provisions or licensing agreements.
            </p>
          </Section>

          <Section title="10. Disclaimer of Warranties">
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <p className="font-semibold text-white uppercase text-base mb-3">Important — Please Read</p>
              <p>
                THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. {COMPANY.toUpperCase()} EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
              </p>
              <p className="mt-3">
                THE COMPANY DOES NOT WARRANT THAT: (A) THE PLATFORM WILL BE UNINTERRUPTED OR ERROR-FREE; (B) DEFECTS WILL BE CORRECTED; (C) THE PLATFORM IS FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS; (D) THE RESULTS OF USING THE PLATFORM WILL MEET YOUR REQUIREMENTS; OR (E) ANY CARDS TRADED THROUGH THE PLATFORM ARE AUTHENTIC, AS DESCRIBED, OR OF SATISFACTORY QUALITY.
              </p>
              <p className="mt-3">
                YOUR USE OF THE PLATFORM IS ENTIRELY AT YOUR OWN RISK.
              </p>
            </div>
          </Section>

          <Section title="11. Limitation of Liability">
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <p>
                TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, {COMPANY.toUpperCase()} AND ITS MEMBERS, MANAGERS, OFFICERS, EMPLOYEES, AGENTS, LICENSORS, AND SERVICE PROVIDERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES WHATSOEVER, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="mt-3 space-y-1 list-none">
                {[
                  "Loss of profits, revenue, or business opportunities",
                  "Loss or damage to cards, collectibles, or other property",
                  "Loss of data or goodwill",
                  "Cost of substitute goods or services",
                  "Personal injury arising from your use of the Platform",
                  "Unauthorized access to or alteration of your transmissions or data",
                  "Conduct of any third party on the Platform",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-slate-400 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                IN NO EVENT SHALL THE TOTAL CUMULATIVE LIABILITY OF {COMPANY.toUpperCase()} TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR YOUR USE OF THE PLATFORM EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT OF FEES PAID BY YOU TO THE COMPANY IN THE SIX (6) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR (B) ONE HUNDRED UNITED STATES DOLLARS ($100.00).
              </p>
              <p className="mt-3">
                SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN WARRANTIES OR LIABILITY, SO THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU IN THEIR ENTIRETY.
              </p>
            </div>
          </Section>

          <Section title="12. Indemnification">
            <p>
              You agree to defend, indemnify, and hold harmless {COMPANY}, its members, managers, officers, employees, agents, licensors, and service providers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:
            </p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Your violation of these Terms or any applicable law or regulation.",
                "Your use of the Platform in any manner.",
                "Any trade you engage in or fail to complete through the Platform.",
                "Any card you list, represent, ship, or trade through the Platform.",
                "Any content or information you submit to the Platform.",
                "Any dispute between you and another user.",
                "Your infringement of any intellectual property or other rights of any third party.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="13. Arbitration Agreement and Class Action Waiver">
            <p className="font-semibold text-white">13.1 Binding Arbitration</p>
            <p className="mt-2">
              PLEASE READ THIS SECTION CAREFULLY — IT AFFECTS YOUR LEGAL RIGHTS. Except for disputes that qualify for small claims court, you and {COMPANY} agree that any dispute, controversy, or claim arising out of or relating to these Terms or the Platform shall be resolved exclusively through binding arbitration administered by the American Arbitration Association ("AAA") under its Consumer Arbitration Rules, rather than in court.
            </p>

            <p className="font-semibold text-white mt-5">13.2 Class Action Waiver</p>
            <p className="mt-2">
              YOU AND {COMPANY.toUpperCase()} AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE ACTION. Unless both you and the Company agree, no arbitrator or judge may consolidate more than one person's claims or otherwise preside over any form of a representative or class proceeding.
            </p>

            <p className="font-semibold text-white mt-5">13.3 Opt-Out</p>
            <p className="mt-2">
              You may opt out of this arbitration agreement by sending written notice to {CONTACT_EMAIL} within thirty (30) days of first accepting these Terms. Your opt-out notice must include your full name, username, and a clear statement that you are opting out of arbitration.
            </p>
          </Section>

          <Section title="14. Governing Law and Jurisdiction">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States of America, without regard to its conflict of law provisions. For any matters not subject to arbitration under Section 13, you consent to exclusive personal jurisdiction in the state and federal courts located within Delaware, and you waive any objection to such jurisdiction or venue.
            </p>
          </Section>

          <Section title="15. Privacy Policy">
            <p>
              Your use of the Platform is also governed by our{" "}
              <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300 underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference. By using the Platform, you consent to the collection and use of your information as described in the Privacy Policy.
            </p>
          </Section>

          <Section title="16. Account Termination">
            <p>
              The Company reserves the right to suspend or permanently terminate your account and access to the Platform at its sole and absolute discretion, with or without cause, and with or without notice. Grounds for termination include but are not limited to:
            </p>
            <ul className="mt-3 space-y-2 list-none">
              {[
                "Violation of any provision of these Terms.",
                "Providing false, inaccurate, or misleading information.",
                "Attempting to trade counterfeit cards.",
                "Failure to complete accepted trades without valid cause.",
                "Engaging in harassment, abuse, or threatening conduct toward other users or Company staff.",
                "Any activity that, in the Company's sole judgment, threatens the integrity or safety of the Platform or its users.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              Upon termination, your right to use the Platform ceases immediately. All provisions of these Terms that by their nature should survive termination shall survive, including but not limited to Sections 10, 11, 12, 13, and 14.
            </p>
          </Section>

          <Section title="17. Modifications to Terms">
            <p>
              {COMPANY} reserves the right to modify these Terms at any time. We will provide notice of material changes by updating the "Last updated" date at the top of this page and, where appropriate, by sending an email notification to your registered email address. Your continued use of the Platform after the effective date of any modifications constitutes your acceptance of the revised Terms.
            </p>
            <p className="mt-3">
              It is your responsibility to review these Terms periodically. If you do not agree to the revised Terms, you must stop using the Platform and may request account deletion by contacting us at {CONTACT_EMAIL}.
            </p>
          </Section>

          <Section title="18. Miscellaneous">
            <p className="font-semibold text-white">18.1 Entire Agreement</p>
            <p className="mt-2">
              These Terms, together with the Privacy Policy and any additional terms applicable to specific services, constitute the entire agreement between you and {COMPANY} with respect to the Platform and supersede all prior agreements, understandings, and representations.
            </p>

            <p className="font-semibold text-white mt-5">18.2 Severability</p>
            <p className="mt-2">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that the remaining Terms remain in full force and effect.
            </p>

            <p className="font-semibold text-white mt-5">18.3 Waiver</p>
            <p className="mt-2">
              The failure of {COMPANY} to enforce any right or provision of these Terms shall not be deemed a waiver of such right or provision.
            </p>

            <p className="font-semibold text-white mt-5">18.4 Assignment</p>
            <p className="mt-2">
              You may not assign or transfer these Terms or any rights hereunder without the prior written consent of the Company. The Company may freely assign these Terms without restriction.
            </p>

            <p className="font-semibold text-white mt-5">18.5 Force Majeure</p>
            <p className="mt-2">
              The Company shall not be liable for any failure or delay in performance resulting from causes beyond its reasonable control, including natural disasters, acts of government, labor disputes, internet or telecommunications failures, or other circumstances outside the Company's control.
            </p>
          </Section>

          <Section title="19. Contact Information">
            <p>
              If you have any questions about these Terms of Service, please contact {COMPANY} at:
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

          {/* Footer notice */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 text-center">
            <p className="text-slate-400 text-base">
              By using HoloSwaps, you acknowledge that you have read and understood these Terms of Service and agree to be bound by them.
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
