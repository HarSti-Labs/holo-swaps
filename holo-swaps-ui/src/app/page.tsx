import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { ArrowRight, ShieldCheck, Repeat2, Sparkles, DollarSign } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
            <ShieldCheck size={14} />
            Verified middleman service
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-none">
            Trade Pokémon cards
            <span className="text-primary"> safely.</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Post your collection, find perfect matches, and trade with confidence.
            Every card verified before it leaves our hands.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/auth/register"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Start trading free
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/auth/login"
              className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/30 border-t border-border">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-display text-3xl font-bold text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Repeat2,
                title: "Post your collection",
                description:
                  "List the cards you own and what you're looking for.",
              },
              {
                icon: Sparkles,
                title: "Get matched",
                description:
                  "We find traders who have what you want and want what you have.",
              },
              {
                icon: DollarSign,
                title: "Fair value + cash",
                description:
                  "Live market pricing ensures fair trades. Pay or receive the difference in cash.",
              },
              {
                icon: ShieldCheck,
                title: "Verified delivery",
                description:
                  "Both cards ship to us first. We verify authenticity before forwarding.",
              },
            ].map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-card border border-border rounded-xl p-6 space-y-3"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon size={20} className="text-primary" />
                </div>
                <h3 className="font-display font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-border text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} HoloSwaps. Built for collectors, by collectors.</p>
      </footer>
    </div>
  );
}
