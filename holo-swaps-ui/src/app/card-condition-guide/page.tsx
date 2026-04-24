import Link from "next/link";
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Info, ChevronRight,
} from "lucide-react";

// ── Condition data ─────────────────────────────────────────────────────────────
const conditions = [
  {
    key: "MINT",
    label: "Mint",
    abbr: "M",
    color: {
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      ring: "border-emerald-500/40",
      bg: "bg-emerald-500/10",
      dot: "bg-emerald-400",
      text: "text-emerald-300",
    },
    summary: "Virtually perfect in every way. A card you would be proud to put straight into a top loader and never touch again.",
    criteria: {
      centering: "60/40 or better on all sides (front and back).",
      surface: "Absolutely no scratches, scuffs, print lines, or staining. Foil cards must have a mirror-like finish with zero cloudiness.",
      edges: "Perfectly sharp and clean on all four sides. No whitening, nicks, or chips whatsoever.",
      corners: "All four corners are perfectly sharp and show zero fraying, bending, or rounding.",
      overall: "No print defects, no factory issues. A card that looks as if it has never left the pack.",
    },
    allowed: [
      "Absolutely no defects — this grade is reserved for flawless cards.",
      "Minor, invisible-to-the-naked-eye factory imperfections that do not affect the grade.",
    ],
    notAllowed: [
      "Any visible surface wear, scratching, or scuffing",
      "Any whitening on edges or corners",
      "Centering worse than 60/40",
      "Any creasing or bending",
    ],
    psa: "Equivalent to PSA 10 — Gem Mint",
    legalNote: "Listing a card as Mint when it has any visible wear is considered misrepresentation and may result in account suspension.",
  },
  {
    key: "NEAR_MINT",
    label: "Near Mint",
    abbr: "NM",
    color: {
      badge: "bg-green-500/20 text-green-300 border-green-500/40",
      ring: "border-green-500/40",
      bg: "bg-green-500/10",
      dot: "bg-green-400",
      text: "text-green-300",
    },
    summary: "A card with minimal wear that is only noticeable on very close inspection. The overwhelming first impression is of a clean, well-kept card.",
    criteria: {
      centering: "65/35 or better on all sides.",
      surface: "Very light surface wear may be present under direct light — no deep scratches. Foil cards may have very faint cloudiness visible only at certain angles.",
      edges: "Very minor edge wear (1–2 small nicks or very slight whitening) is acceptable.",
      corners: "Corners are sharp with at most very slight fraying visible under close inspection.",
      overall: "No creasing, bending, or water damage. Card lies completely flat.",
    },
    allowed: [
      "1–2 very minor edge nicks barely visible to the naked eye",
      "Very light surface scuff visible only under direct light",
      "Very slight corner rounding on one corner",
    ],
    notAllowed: [
      "Visible surface scratches or scuffs at normal viewing distance",
      "Noticeable whitening on edges or corners",
      "Any creasing or bending",
      "Centering worse than 65/35",
    ],
    psa: "Equivalent to PSA 8–9 — Near Mint or Near Mint–Mint",
    legalNote: "Near Mint is the most common condition disputed in trades. Be conservative — if you're unsure between NM and LP, list it as LP.",
  },
  {
    key: "LIGHTLY_PLAYED",
    label: "Lightly Played",
    abbr: "LP",
    color: {
      badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
      ring: "border-yellow-500/40",
      bg: "bg-yellow-500/10",
      dot: "bg-yellow-400",
      text: "text-yellow-300",
    },
    summary: "Light wear that is clearly visible on close inspection but does not significantly impact the card's appearance from a normal viewing distance.",
    criteria: {
      centering: "70/30 or better on all sides.",
      surface: "Light scuffs or minor scratches visible under normal lighting. Foil may have moderate cloudiness.",
      edges: "Noticeable edge wear — light whitening along one or more edges, up to 3–4 small nicks.",
      corners: "Minor corner wear on up to two corners — slight fraying or very slight rounding.",
      overall: "No creasing, bending, or structural damage. Card is still visually clean from arm's length.",
    },
    allowed: [
      "Noticeable but light edge whitening on one or two edges",
      "Up to 3–4 minor edge nicks",
      "Minor corner wear on up to two corners",
      "Light surface scuffs or very minor scratches",
    ],
    notAllowed: [
      "Creasing or bending of any kind",
      "Heavy or widespread whitening",
      "Corner peeling or lifting",
      "Water staining or ink marks",
    ],
    psa: "Equivalent to PSA 7 — Near Mint",
    legalNote: "Photos must clearly show the wear present. LP cards with undisclosed creases are the leading cause of trade disputes.",
  },
  {
    key: "MODERATELY_PLAYED",
    label: "Moderately Played",
    abbr: "MP",
    color: {
      badge: "bg-orange-500/20 text-orange-300 border-orange-500/40",
      ring: "border-orange-500/40",
      bg: "bg-orange-500/10",
      dot: "bg-orange-400",
      text: "text-orange-300",
    },
    summary: "Moderate wear clearly visible from a normal viewing distance. The card shows signs of heavy casual use but remains structurally sound.",
    criteria: {
      centering: "75/25 or better.",
      surface: "Multiple scuffs, scratches, or whitening visible on the card face. Foil cards may have significant cloudiness.",
      edges: "Significant whitening on multiple edges, multiple nicks, or minor chips.",
      corners: "Wear on multiple corners — noticeable fraying or rounding on 2–3 corners.",
      overall: "Very minor, shallow creases may be present if they don't create a visible ridge. Card lies mostly flat.",
    },
    allowed: [
      "Widespread edge whitening",
      "Multiple nicks or chips on edges",
      "Corner fraying on 2–3 corners",
      "Multiple surface scuffs or scratches",
      "Very minor, shallow crease that creates no ridge",
    ],
    notAllowed: [
      "Deep creases or visible ridges",
      "Corners peeling or separating layers",
      "Water staining visible on the card face",
      "Ink or pen marks",
      "Structural bending (card does not lie flat)",
    ],
    psa: "Equivalent to PSA 5–6 — Excellent to Excellent–Mint",
    legalNote: "MP cards must include clear close-up photos of all visible damage. Failure to disclose known damage is grounds for dispute.",
  },
  {
    key: "HEAVILY_PLAYED",
    label: "Heavily Played",
    abbr: "HP",
    color: {
      badge: "bg-red-500/20 text-red-300 border-red-500/40",
      ring: "border-red-500/40",
      bg: "bg-red-500/10",
      dot: "bg-red-400",
      text: "text-red-300",
    },
    summary: "Heavy wear immediately obvious at arm's length. The card has significant damage but is still intact and identifiable.",
    criteria: {
      centering: "Any centering.",
      surface: "Heavy scratching, major scuffs, or significant whitening across the card face or back.",
      edges: "Severe edge whitening on most or all edges. Chips and significant nicks throughout.",
      corners: "Major corner wear on 3–4 corners — heavy fraying, rounding, or partial layer separation.",
      overall: "Visible creases or ridges are allowed. Card is still structurally one piece.",
    },
    allowed: [
      "Visible creases with ridges",
      "Heavy edge whitening on all sides",
      "Significant corner damage including layer separation",
      "Heavy surface scratching or scuffing",
      "Light water staining not obscuring the card artwork",
    ],
    notAllowed: [
      "Tears or holes in the card",
      "Completely separated layers",
      "Writing or ink marks obscuring artwork",
      "Card is bent and will not lie flat without force",
    ],
    psa: "Equivalent to PSA 2–4 — Good to Very Good",
    legalNote: "HP cards must include photos of all four corners, all four edges, the full card face, and the card back. Do not list as HP if the card is actually Damaged.",
  },
  {
    key: "DAMAGED",
    label: "Damaged",
    abbr: "D",
    color: {
      badge: "bg-slate-500/20 text-slate-300 border-slate-500/40",
      ring: "border-slate-500/40",
      bg: "bg-slate-500/10",
      dot: "bg-slate-400",
      text: "text-slate-300",
    },
    summary: "Severe damage that significantly impacts the card's structural integrity or playability. A card in this condition is typically only collectible for sentimental or set-completion reasons.",
    criteria: {
      centering: "Any centering.",
      surface: "Any level of surface damage including heavy writing, severe water damage, or sticker residue obscuring the card.",
      edges: "Any level of edge damage including significant tears, notches, or complete layer separation.",
      corners: "Any level of corner damage including major tearing or complete peeling.",
      overall: "Card may have tears, holes, writing, severe water damage, heavy bending that cannot be undone, or other extreme damage.",
    },
    allowed: [
      "Tears or small holes in the card",
      "Writing or pen/marker marks",
      "Severe water damage or staining that affects the artwork",
      "Permanent bending or curling",
      "Complete corner or layer separation",
      "Sticker residue obscuring any part of the card",
    ],
    notAllowed: [
      "Nothing is excluded — if it doesn't fit any condition above, it is Damaged.",
    ],
    psa: "Equivalent to PSA 1 — Poor",
    legalNote: "Damaged cards are accepted on HoloSwaps but both parties must explicitly agree to trade a Damaged card. Always photograph every defect.",
  },
];

// ── Checklist used at the bottom ──────────────────────────────────────────────
const photographyTips = [
  "Photograph the card face under bright, even lighting — avoid harsh shadows",
  "Photograph the card back under the same lighting",
  "Take a close-up of every corner individually",
  "Take a close-up of every edge individually",
  "For foil cards, photograph at multiple angles to capture surface texture",
  "For any crease, photograph it under raking light so the ridge is visible",
  "For any water damage or staining, include a photo that clearly shows the extent",
  "Include a photo of the full card next to something for scale (e.g. a ruler)",
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CardConditionGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      <main>

        {/* Hero */}
        <section className="relative overflow-hidden py-16 px-4 text-center">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
              <ShieldCheck size={16} />
              Official HoloSwaps Grading Standard
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
              Card Condition
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Guide
              </span>
            </h1>
            <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto leading-relaxed">
              Every card listed on HoloSwaps must use these condition definitions. This protects buyers, sellers, and the integrity of every trade.
            </p>
            <div className="inline-flex items-start gap-3 px-5 py-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-left max-w-xl mx-auto">
              <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-200 leading-relaxed">
                Misrepresenting a card's condition — intentionally or otherwise — is grounds for dispute resolution, trade reversal, and potential account suspension. When in doubt, list the lower grade.
              </p>
            </div>
          </div>
        </section>

        {/* Quick reference bar */}
        <section className="border-y border-slate-800 bg-slate-900/50 py-5 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {conditions.map((c) => (
                <a
                  key={c.key}
                  href={`#${c.key}`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold transition-opacity hover:opacity-80 ${c.color.badge}`}
                >
                  <span className={`w-2 h-2 rounded-full ${c.color.dot}`} />
                  {c.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Four pillars */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-black text-white text-center mb-2">What We Evaluate</h2>
            <p className="text-slate-400 text-center mb-8 text-sm">Every condition grade is determined by assessing all four of these areas together.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Centering",    desc: "The ratio of border width on opposite sides, front and back.",             emoji: "⊞" },
                { label: "Surface",      desc: "Scratches, scuffs, print lines, and foil condition.",                      emoji: "✦" },
                { label: "Edges",        desc: "Whitening, nicks, chips, and wear along all four edges.",                  emoji: "▭" },
                { label: "Corners",      desc: "Fraying, rounding, bending, and layer separation at all four corners.",    emoji: "◳" },
              ].map((p) => (
                <div key={p.label} className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">{p.emoji}</div>
                  <p className="text-white font-bold text-sm mb-1">{p.label}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Condition detail cards */}
        <section className="py-4 px-4 pb-16">
          <div className="container mx-auto max-w-4xl space-y-8">
            {conditions.map((c, index) => (
              <div
                key={c.key}
                id={c.key}
                className={`rounded-2xl border-2 ${c.color.ring} ${c.color.bg} overflow-hidden scroll-mt-20`}
              >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl border-2 ${c.color.ring} ${c.color.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-xl font-black ${c.color.text}`}>{c.abbr}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-black text-white">{c.label}</h2>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${c.color.badge}`}>
                          Grade {conditions.length - index}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm mt-0.5">{c.psa}</p>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="px-6 pb-5">
                  <p className="text-slate-200 leading-relaxed mb-6 text-base">{c.summary}</p>

                  {/* Criteria grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {Object.entries(c.criteria).map(([key, value]) => (
                      <div key={key} className="bg-slate-900/60 rounded-xl p-4">
                        <p className={`text-xs font-black uppercase tracking-widest mb-1.5 ${c.color.text}`}>
                          {key === "overall" ? "Overall" : key.charAt(0).toUpperCase() + key.slice(1)}
                        </p>
                        <p className="text-slate-300 text-sm leading-relaxed">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Allowed / Not allowed */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <div className="bg-slate-900/40 rounded-xl p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-green-400 mb-3">Acceptable at this grade</p>
                      <div className="space-y-2">
                        {c.allowed.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-slate-300">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-900/40 rounded-xl p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-red-400 mb-3">Not acceptable — lower the grade</p>
                      <div className="space-y-2">
                        {c.notAllowed.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-slate-300">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Legal note */}
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <Info size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-200 leading-relaxed">{c.legalNote}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Photography checklist */}
        <section className="py-16 px-4 border-t border-slate-800 bg-slate-900/40">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-white mb-3">Photo Requirements</h2>
              <p className="text-slate-400 leading-relaxed">
                Photos are your primary protection in any dispute. HoloSwaps strongly recommends following this checklist for every card you list, regardless of condition.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
              <div className="space-y-3">
                {photographyTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-md border-2 border-slate-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-300 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-slate-700 flex items-start gap-3">
                <AlertTriangle size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-400 leading-relaxed">
                  If a dispute is opened and you have not provided adequate photos, HoloSwaps may rule in favour of the other party regardless of the card's actual condition. Photos are your evidence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dispute note */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-black text-white mb-4">Condition Disputes</h2>
            <p className="text-slate-400 leading-relaxed mb-6 max-w-xl mx-auto">
              When a card arrives at the HoloSwaps Verification Center and its condition does not match the listed grade, we will pause the trade and open a dispute. Our verification team uses these exact definitions to make that determination. The listing condition and the verified condition are compared objectively — there is no room for subjective interpretation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              {[
                { title: "One grade off",    body: "We will notify both parties and offer the option to renegotiate or cancel the trade at no penalty to either side." },
                { title: "Two+ grades off",  body: "The trade is cancelled. The misgraded card is returned to the sender. A warning is added to the sender's account." },
                { title: "Intentional fraud", body: "Account permanently banned. Relevant authorities may be notified depending on the value of the trade." },
              ].map((item) => (
                <div key={item.title} className="bg-slate-900/60 border border-slate-700 rounded-xl p-5">
                  <p className="font-bold text-white text-sm mb-2">{item.title}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
            <p className="text-slate-400 text-sm mt-8">
              Questions about a condition ruling?{" "}
              <a href="mailto:admin@holoswaps.com" className="text-blue-400 hover:text-blue-300 underline">
                admin@holoswaps.com
              </a>
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 border-t border-slate-800 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-black text-white mb-3">Ready to list your cards?</h2>
            <p className="text-slate-400 mb-6 text-sm">Use this guide every time you add a card to your collection. Your reputation depends on accurate grading.</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/collection"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-blue-500/30"
              >
                Go to My Collection
                <ChevronRight size={16} />
              </Link>
              <Link
                href="/how-it-works"
                className="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white font-bold transition-all"
              >
                How Trading Works
              </Link>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
