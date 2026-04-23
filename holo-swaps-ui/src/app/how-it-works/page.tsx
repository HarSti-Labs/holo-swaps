import Link from "next/link";
import { HeroSection } from "./HeroSection";
import {
  BookMarked,
  Heart,
  Search,
  ArrowLeftRight,
  Package,
  ShieldCheck,
  Truck,
  Star,
  ChevronRight,
  AlertTriangle,
  MapPin,
  Clock,
  CheckCircle2,
} from "lucide-react";

// ─── UPDATE THIS WHEN YOU HAVE YOUR PO BOX ───────────────────────────────────
const VERIFICATION_ADDRESS = {
  line1: "HoloSwaps Verification Center",
  line2: "c/o Harsti Labs LLC",
  poBox: "[YOUR PO BOX HERE]",
  city: "[CITY]",
  state: "[STATE]",
  zip: "[ZIP]",
};
// ─────────────────────────────────────────────────────────────────────────────

const steps = [
  {
    number: "01",
    icon: BookMarked,
    color: "blue",
    title: "Build Your Collection",
    description:
      "Start by adding the cards you own to your collection. For each card, set the condition and toggle it as Available for Trade when you're ready to swap it.",
    tips: [
      "Be honest about condition — it builds trust and avoids disputes",
      "You can add cards without marking them for trade yet",
      "Cards marked Available show up when other traders search",
    ],
  },
  {
    number: "02",
    icon: Heart,
    color: "pink",
    title: "Add Cards to Your Want List",
    description:
      "Tell HoloSwaps what you're looking for by adding cards to your Want List. Set a priority (High, Medium, Low) and the worst condition you'd accept. This powers our automatic matching system.",
    tips: [
      "The more specific your want list, the better your matches",
      "Set priority to High for cards you really need",
      "Max condition lets you filter out heavily played copies",
    ],
  },
  {
    number: "03",
    icon: Search,
    color: "purple",
    title: "Find Cards & Traders",
    description:
      "Browse the full card database by name or set. Click any card to see the Available Traders tab — a list of real users who have that exact card ready to trade. Check their reputation, condition, and collection before reaching out.",
    tips: [
      'Use the "Available Traders" tab on any card to see who has it',
      "Check a trader's reputation score and completed trade count",
      "View their full collection to find other cards you might want",
    ],
  },
  {
    number: "04",
    icon: ArrowLeftRight,
    color: "green",
    title: "Propose a Trade",
    description:
      "Found someone with a card you want? Hit Propose Trade, pick which of your cards you're offering, and optionally write a message. The other trader will review your offer and can accept, counter, or decline.",
    tips: [
      "Try to keep the total value of cards roughly balanced",
      "A personal message goes a long way — be friendly",
      "You can propose a trade even without a mutual match",
      "A 2.5% platform fee applies on the value of cards you receive — shown before you submit",
    ],
  },
  {
    number: "05",
    icon: Package,
    color: "yellow",
    title: "Ship Your Cards to Us",
    description:
      "Once both parties accept the trade, you each ship your cards to the HoloSwaps Verification Center — not directly to each other. This protects both traders. Pack your cards securely and ship within 5 business days.",
    highlight: true,
    tips: [
      "Use a rigid top loader inside a padded envelope or small box",
      "Always add tracking — paste the tracking number in the trade page",
      "Ship within 5 business days of acceptance or the trade may be cancelled",
    ],
  },
  {
    number: "06",
    icon: ShieldCheck,
    color: "cyan",
    title: "We Verify Your Cards",
    description:
      "When cards arrive at our verification center, we inspect each card to confirm it matches the listed condition and is genuine. If everything checks out, we forward the cards to the respective recipients. If there's a discrepancy, we'll open a dispute process.",
    tips: [
      "Verification typically takes 2–5 business days after receipt",
      "You'll receive an email notification at each stage",
      "Counterfeit cards are flagged and the sender's account is banned",
    ],
  },
  {
    number: "07",
    icon: Truck,
    color: "orange",
    title: "Receive Your Cards",
    description:
      "Once verified, we ship each trader's new cards directly to the shipping address on their account. You'll get a tracking number as soon as your package is on the way.",
    tips: [
      "Make sure your shipping address in Settings is accurate",
      "Delivery time depends on your location and shipping speed",
      "Contact support if your package hasn't arrived after 10 days",
    ],
  },
  {
    number: "08",
    icon: Star,
    color: "amber",
    title: "Rate the Trade",
    description:
      "After receiving your cards, the trade is marked Complete and both traders can leave a reputation rating. A strong reputation score makes it easier to find trade partners and shows the community you're trustworthy.",
    tips: [
      "Ratings are mutual — be fair and honest",
      "Your reputation score is visible on your public profile",
      "Consistently high scores unlock future platform perks",
    ],
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; icon: string }> = {
  blue:   { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-300",   badge: "bg-blue-500/20 text-blue-300",   icon: "text-blue-400" },
  pink:   { bg: "bg-pink-500/10",   border: "border-pink-500/30",   text: "text-pink-300",   badge: "bg-pink-500/20 text-pink-300",   icon: "text-pink-400" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-300", badge: "bg-purple-500/20 text-purple-300", icon: "text-purple-400" },
  green:  { bg: "bg-green-500/10",  border: "border-green-500/30",  text: "text-green-300",  badge: "bg-green-500/20 text-green-300",  icon: "text-green-400" },
  yellow: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-300", badge: "bg-yellow-500/20 text-yellow-300", icon: "text-yellow-400" },
  cyan:   { bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   text: "text-cyan-300",   badge: "bg-cyan-500/20 text-cyan-300",   icon: "text-cyan-400" },
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-300", badge: "bg-orange-500/20 text-orange-300", icon: "text-orange-400" },
  amber:  { bg: "bg-amber-500/10",  border: "border-amber-500/30",  text: "text-amber-300",  badge: "bg-amber-500/20 text-amber-300",  icon: "text-amber-400" },
};


export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      <main>
        {/* Hero */}
        <HeroSection>
          <section className="relative overflow-hidden py-20 px-4 text-center">
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
                <ShieldCheck size={16} />
                Secure · Verified · Simple
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                How Trading Works
                <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  on HoloSwaps
                </span>
              </h1>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                HoloSwaps is built around one idea: trading cards should be safe, fair, and easy.
                Every trade goes through our verification center so both traders are protected from start to finish.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/auth/register"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-blue-500/30"
                >
                  Start Trading
                  <ChevronRight size={18} />
                </Link>
                <Link href="/cards" className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white font-bold transition-all">
                  Browse Cards
                </Link>
              </div>
            </div>
          </section>
        </HeroSection>

        {/* Quick overview bar */}
        <section className="border-y border-slate-800 bg-slate-900/50 backdrop-blur-sm py-6 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { icon: ShieldCheck, label: "Verified Trades", sub: "Every card inspected", color: "text-green-400" },
                { icon: ArrowLeftRight, label: "Fair Matching", sub: "Value-based matching", color: "text-blue-400" },
                { icon: MapPin, label: "Secure Shipping", sub: "Cards go through us", color: "text-purple-400" },
                { icon: Clock, label: "~2–3 Weeks", sub: "Typical trade time", color: "text-yellow-400" },
              ].map(({ icon: Icon, label, sub, color }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <Icon size={24} className={color} />
                  <p className="text-white font-bold text-sm">{label}</p>
                  <p className="text-slate-500 text-xs">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Step by step */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">The Trading Process</h2>
              <p className="text-slate-400 text-lg">Eight steps from signup to cards in hand.</p>
            </div>

            <div className="space-y-6">
              {steps.map((step, index) => {
                const c = colorMap[step.color];
                const Icon = step.icon;
                const isLast = index === steps.length - 1;

                return (
                  <div key={step.number} className="relative">
                    {/* Connector line */}
                    {!isLast && (
                      <div className="absolute left-8 top-full h-6 w-px bg-slate-700 z-0" />
                    )}

                    <div className={`relative z-10 rounded-2xl border-2 p-6 ${c.bg} ${c.border} ${step.highlight ? "ring-2 ring-yellow-500/40" : ""}`}>
                      {step.highlight && (
                        <div className="absolute -top-3 left-6 flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500 text-slate-950 text-xs font-black">
                          <AlertTriangle size={12} />
                          Important Step
                        </div>
                      )}

                      <div className="flex items-start gap-5">
                        {/* Step number + icon */}
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <div className={`w-14 h-14 rounded-2xl ${c.bg} border-2 ${c.border} flex items-center justify-center`}>
                            <Icon size={24} className={c.icon} />
                          </div>
                          <span className={`text-xs font-black ${c.text} opacity-60`}>{step.number}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-black text-white mb-2">{step.title}</h3>
                          <p className="text-slate-300 leading-relaxed mb-4">{step.description}</p>

                          <div className="space-y-2">
                            {step.tips.map((tip, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <CheckCircle2 size={15} className={`${c.icon} mt-0.5 flex-shrink-0`} />
                                <p className="text-sm text-slate-400">{tip}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Verification Center / Shipping address */}
        <section className="py-16 px-4 bg-slate-900/50 border-y border-slate-800">
          <div className="container mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-6">
              <MapPin size={16} />
              Verification Center Address
            </div>
            <h2 className="text-3xl font-black text-white mb-4">Where to Ship Your Cards</h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Once your trade is accepted, both traders ship their cards to the address below.
              Do <span className="text-white font-semibold">not</span> ship directly to the other trader —
              all cards must pass through our verification center first.
            </p>

            <div className="inline-block text-left bg-slate-900 border-2 border-cyan-500/40 rounded-2xl p-8 shadow-2xl shadow-cyan-500/10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <ShieldCheck size={20} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-white font-black text-lg">HoloSwaps</p>
                  <p className="text-cyan-400 text-sm font-medium">Verified Trading Hub</p>
                </div>
              </div>

              <div className="space-y-1 font-mono text-slate-200 text-base border-t border-slate-700 pt-5">
                <p className="font-bold">{VERIFICATION_ADDRESS.line1}</p>
                <p>{VERIFICATION_ADDRESS.line2}</p>
                <p>{VERIFICATION_ADDRESS.poBox}</p>
                <p>{VERIFICATION_ADDRESS.city}, {VERIFICATION_ADDRESS.state} {VERIFICATION_ADDRESS.zip}</p>
                <p>United States</p>
              </div>

              <div className="mt-5 pt-5 border-t border-slate-700 space-y-2">
                {[
                  "Include your HoloSwaps username on the outside of the package",
                  "Include your Trade ID on a slip of paper inside",
                  "Always use tracked shipping — no tracking = no dispute coverage",
                ].map((note, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-400">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Packaging tips */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-white mb-3">How to Pack Your Cards</h2>
              <p className="text-slate-400">Cards get damaged in transit all the time. Here's how to prevent it.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "1",
                  title: "Sleeve the Card",
                  body: "Put the card in a soft penny sleeve first, then slide it into a rigid top loader or card saver. This prevents surface scratches and bends.",
                  icon: "🃏",
                },
                {
                  step: "2",
                  title: "Secure the Top Loader",
                  body: "Tape the top of the top loader shut so the card can't slip out. Wrap the top loader in a small piece of bubble wrap or foam.",
                  icon: "📦",
                },
                {
                  step: "3",
                  title: "Use a Padded Mailer",
                  body: "Place the wrapped card in a bubble mailer or small rigid box. Never use a plain envelope — cards bend easily. Add DO NOT BEND on the outside.",
                  icon: "✉️",
                },
              ].map((item) => (
                <div key={item.step} className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Step {item.step}</p>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-4xl font-black text-white mb-4">Ready to make your first trade?</h2>
            <p className="text-slate-400 text-lg mb-8">
              Create a free account, build your collection, and start finding traders in minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/auth/register"
                className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-blue-500/30 text-lg"
              >
                Create Free Account
                <ChevronRight size={20} />
              </Link>
              <Link href="/cards" className="flex items-center gap-2 px-8 py-4 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white font-bold transition-all text-lg">
                Browse Cards First
              </Link>
            </div>
            <p className="text-slate-500 text-sm mt-6">
              Questions?{" "}
              <a href="mailto:admin@holoswaps.com" className="text-blue-400 hover:text-blue-300 underline">
                admin@holoswaps.com
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
