import Link from "next/link";
import { Mail, MapPin } from "lucide-react";

const COMPANY = "Harsti Labs LLC";

const footerLinks = [
  {
    heading: "Platform",
    links: [
      { label: "Browse Cards", href: "/cards" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Card Condition Guide", href: "/card-condition-guide" },
      { label: "FAQ", href: "/how-it-works#faq" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Contact Support", href: "/support" },
      { label: "Submit a Ticket", href: "/support" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms of Service", href: "/legal/tos" },
      { label: "Privacy Policy", href: "/legal/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10">

          {/* Brand column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-base font-display font-bold">H</span>
              </div>
              <span className="font-display font-bold text-lg tracking-tight">HoloSwaps</span>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed max-w-xs">
              A safe, verified marketplace for Pokémon card traders. Every card authenticated before it ships.
            </p>

            {/* Contact */}
            <div className="space-y-2 pt-1">
              <a
                href="mailto:support@holoswaps.com"
                className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail size={14} />
                support@holoswaps.com
              </a>
              <div className="flex items-start gap-2 text-base text-muted-foreground">
                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  {COMPANY}<br />
                  PO Box 12345<br />
                  Los Angeles, CA 90001
                </span>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map(({ heading, links }) => (
            <div key={heading}>
              <p className="text-base font-semibold text-foreground uppercase tracking-wider mb-4">{heading}</p>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-base text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-base text-muted-foreground">
          <p>© {new Date().getFullYear()} {COMPANY}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/legal/tos" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
