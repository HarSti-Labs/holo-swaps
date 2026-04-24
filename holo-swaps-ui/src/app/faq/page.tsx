import Link from "next/link";
import { HelpCircle, ChevronRight, MessageSquare } from "lucide-react";

const faqs = [
  {
    category: "Fees & Pricing",
    items: [
      {
        q: "Does HoloSwaps charge a fee?",
        a: "Yes — HoloSwaps charges a 2.5% platform fee based on the value each party receives. For example, if you receive $400 worth of cards, you pay $10. If your trade partner receives $200 worth of cards, they pay $5. The fee is shown upfront before you submit a trade proposal, and is collected only when the trade completes.",
      },
      {
        q: "When exactly is the fee charged?",
        a: "The fee is collected at trade completion — after both cards have been verified by our team and ownership has transferred. If a trade is cancelled or fails verification, no fee is charged.",
      },
      {
        q: "Does cash added to a trade affect my fee?",
        a: "Yes. Cash sweeteners are included in what the receiving party gets. So if you receive $350 in cards plus $50 cash from your trade partner, your fee is 2.5% of $400 = $10. The person who added the cash pays their fee based on the cards they receive.",
      },
    ],
  },
  {
    category: "The Trade Process",
    items: [
      {
        q: "Why do cards go through a verification center instead of directly to the other trader?",
        a: "Sending cards directly to each other creates a chicken-and-egg problem — who ships first? It also opens the door to scams. By routing through us, both parties are protected: we confirm both sets of cards arrive before forwarding anything. Neither trader is left empty-handed.",
      },
      {
        q: "Who pays for shipping?",
        a: "Each trader is responsible for shipping their own cards to the verification center. HoloSwaps covers the cost of forwarding cards to the recipients after verification.",
      },
      {
        q: "How long does the whole process take?",
        a: "From acceptance to receiving your cards: shipping to us (varies by location) + 2–5 business days verification + shipping back to you. Most domestic trades complete within 2–3 weeks total.",
      },
      {
        q: "Can I cancel a trade after accepting?",
        a: "Once both parties accept and shipping has started, cancellation requires mutual agreement and may affect your reputation score. Cancelling without cause repeatedly can result in account suspension.",
      },
    ],
  },
  {
    category: "Card Verification",
    items: [
      {
        q: "What happens if a card doesn't pass verification?",
        a: "If a card's condition is significantly worse than listed, or if it appears counterfeit, we'll pause the trade and open a dispute. Both traders are notified, and we'll work to resolve it fairly. Counterfeit cards are never forwarded — the sender's account is permanently banned.",
      },
      {
        q: "What counts as a failed verification?",
        a: "A card fails verification if: its condition is materially worse than listed (e.g. listed NM, arrived Heavily Played), it appears to be a counterfeit or proxy, or it's the wrong card entirely. Minor cosmetic differences within the same condition grade are not grounds for failure.",
      },
    ],
  },
  {
    category: "Shipping & Safety",
    items: [
      {
        q: "What if the other trader never ships?",
        a: "If a trader doesn't provide tracking within 5 business days of acceptance, you can open a dispute. We'll attempt to contact them, and if there's no response, we'll cancel the trade and your cards (if already sent) will be returned to you.",
      },
      {
        q: "Is my shipping address kept private?",
        a: "Yes. Your address is only used to ship your received cards back to you from our verification center. It is never shared with the other trader.",
      },
    ],
  },
  {
    category: "Account & Support",
    items: [
      {
        q: "How do I report a problem?",
        a: "Open the trade in question and use the Dispute button, or visit the Support page to submit a ticket. Please include photos and any relevant details.",
      },
      {
        q: "What affects my reputation score?",
        a: "Your reputation score is the average of all ratings left by your trade partners after completed trades. Ratings are on a 1–5 scale. Disputes resolved against you can also lower your score.",
      },
      {
        q: "Can my account be banned?",
        a: "Yes. Accounts that submit counterfeit cards, repeatedly cancel trades without cause, or are found to be engaging in fraud are permanently banned. We take the integrity of the platform seriously.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden py-20 px-4 text-center">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-base font-medium mb-6">
              <HelpCircle size={16} />
              Frequently Asked Questions
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
              Got Questions?
              <span className="block bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                We Have Answers.
              </span>
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Everything you need to know about trading on HoloSwaps — fees, shipping, verification, and more.
            </p>
          </div>
        </section>

        {/* FAQ content */}
        <section className="py-12 px-4 pb-24">
          <div className="container mx-auto max-w-3xl space-y-12">
            {faqs.map((group) => (
              <div key={group.category}>
                <h2 className="text-lg font-black text-white mb-4 pb-3 border-b border-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-purple-500 inline-block" />
                  {group.category}
                </h2>
                <div className="space-y-3">
                  {group.items.map((faq, i) => (
                    <div key={i} className="bg-slate-900/60 border border-slate-700 rounded-xl p-6">
                      <p className="font-bold text-white mb-3 flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5 flex-shrink-0">Q.</span>
                        {faq.q}
                      </p>
                      <p className="text-slate-400 text-base leading-relaxed pl-5">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Still have questions CTA */}
        <section className="py-16 px-4 bg-slate-900/50 border-t border-slate-800 text-center">
          <div className="max-w-xl mx-auto">
            <MessageSquare size={32} className="text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-3">Still have questions?</h2>
            <p className="text-slate-400 mb-6">
              Can't find what you're looking for? Our support team is happy to help.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/support"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors"
              >
                Contact Support
                <ChevronRight size={16} />
              </Link>
              <Link
                href="/how-it-works"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white font-bold transition-all"
              >
                How It Works
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
