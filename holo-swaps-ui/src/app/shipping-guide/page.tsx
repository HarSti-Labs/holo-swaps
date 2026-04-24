import Link from "next/link";
import { Truck, Package, ShieldCheck, MapPin, AlertTriangle, ChevronRight } from "lucide-react";

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

export default function ShippingGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden py-20 px-4 text-center">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-base font-medium mb-6">
              <Truck size={16} />
              Shipping Guide
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
              How to Ship
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Your Cards Safely
              </span>
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Once your trade is accepted, ship your cards to our verification center. Here's everything you need to know.
            </p>
          </div>
        </section>

        <section className="py-12 px-4 pb-24">
          <div className="container mx-auto max-w-3xl space-y-10">

            {/* Where to ship */}
            <div>
              <h2 className="text-lg font-black text-white mb-4 pb-3 border-b border-slate-700 flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-blue-500 inline-block" />
                Where to Ship
              </h2>
              <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-base text-slate-400 mb-3">Send your cards to our verification center at the address below. Always include your trade code on a slip of paper inside the package.</p>
                    <div className="bg-slate-800 rounded-lg px-5 py-4 font-mono text-slate-200 space-y-0.5 text-base">
                      <p className="font-bold text-white">{VERIFICATION_ADDRESS.line1}</p>
                      <p>{VERIFICATION_ADDRESS.line2}</p>
                      <p>{VERIFICATION_ADDRESS.poBox}</p>
                      <p>{VERIFICATION_ADDRESS.city}, {VERIFICATION_ADDRESS.state} {VERIFICATION_ADDRESS.zip}</p>
                      <p>United States</p>
                    </div>
                    <p className="text-base text-amber-400 mt-3 flex items-center gap-1.5">
                      <AlertTriangle size={12} />
                      Your address is never shared with your trade partner — only used to ship your received cards back to you.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* How to pack */}
            <div>
              <h2 className="text-lg font-black text-white mb-4 pb-3 border-b border-slate-700 flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-purple-500 inline-block" />
                How to Pack Your Cards
              </h2>
              <div className="space-y-3">
                {[
                  {
                    step: "1",
                    title: "Sleeve every card",
                    body: "Put each card in a penny sleeve first, then into a rigid top-loader or semi-rigid card saver. This prevents movement and edge wear during transit.",
                  },
                  {
                    step: "2",
                    title: "Tape the top-loader closed",
                    body: "Place a small piece of painter's tape or masking tape across the open end of each top-loader to prevent cards from sliding out.",
                  },
                  {
                    step: "3",
                    title: "Wrap in bubble wrap or team bags",
                    body: "Wrap your top-loaders in a layer of bubble wrap, or use a team bag to bundle them together. This protects against impact.",
                  },
                  {
                    step: "4",
                    title: "Include your trade code",
                    body: "Write your trade code (e.g. TRD-00142) on a slip of paper and place it inside the package. This is how we match your shipment to your trade.",
                  },
                  {
                    step: "5",
                    title: "Use a padded envelope or small box",
                    body: "A bubble mailer works well for most trades. For higher-value cards, use a small rigid box to prevent bending if the package is compressed.",
                  },
                  {
                    step: "6",
                    title: "Consider insurance",
                    body: "For cards worth over $50, we strongly recommend purchasing shipping insurance. USPS, UPS, and FedEx all offer declared value coverage at checkout.",
                  },
                ].map(({ step, title, body }) => (
                  <div key={step} className="bg-slate-900/60 border border-slate-700 rounded-xl p-5 flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 text-purple-400 font-black text-base">
                      {step}
                    </div>
                    <div>
                      <p className="font-bold text-white mb-1">{title}</p>
                      <p className="text-base text-slate-400 leading-relaxed">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended carriers */}
            <div>
              <h2 className="text-lg font-black text-white mb-4 pb-3 border-b border-slate-700 flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-cyan-500 inline-block" />
                Recommended Carriers
              </h2>
              <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6 space-y-4">
                {[
                  { carrier: "USPS First Class / Priority", note: "Best for most trades. Affordable, reliable, and includes tracking. Priority Mail adds $100 insurance automatically." },
                  { carrier: "UPS Ground / 2-Day", note: "Great for higher-value cards. More robust tracking and insurance options." },
                  { carrier: "FedEx Ground / Express", note: "Similar to UPS. Good for time-sensitive trades." },
                ].map(({ carrier, note }) => (
                  <div key={carrier} className="flex items-start gap-3">
                    <ShieldCheck size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-base font-semibold text-white">{carrier}</p>
                      <p className="text-base text-slate-400 mt-0.5">{note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What not to do */}
            <div>
              <h2 className="text-lg font-black text-white mb-4 pb-3 border-b border-slate-700 flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-red-500 inline-block" />
                What NOT to Do
              </h2>
              <div className="bg-slate-900/60 border border-red-500/20 rounded-xl p-6">
                <ul className="space-y-2">
                  {[
                    "Don't ship cards loose in an envelope with no protection",
                    "Don't use rubber bands around cards — they cause edge damage",
                    "Don't forget to include your trade code",
                    "Don't ship to your trade partner directly — always ship to our verification center",
                    "Don't use regular paper envelopes for valuable cards — they offer zero protection",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-base text-slate-400">
                      <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </section>

        {/* Disclaimer */}
        <section className="py-6 px-4">
          <div className="container mx-auto max-w-3xl">
            <p className="text-base text-slate-400 text-center leading-relaxed">
              <span className="font-semibold text-slate-400">Disclaimer:</span> HoloSwaps is not liable for any card damage, loss, or deterioration resulting from improper packaging by the sender. It is the sender's sole responsibility to ensure cards are packaged securely and appropriately before shipment. By submitting a trade, you acknowledge and accept this responsibility.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 bg-slate-900/50 border-t border-slate-800 text-center">
          <div className="max-w-xl mx-auto">
            <Package size={32} className="text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-3">Ready to start trading?</h2>
            <p className="text-slate-400 mb-6">Browse cards, find a match, and propose your first trade.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/cards"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
              >
                Browse Cards
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
