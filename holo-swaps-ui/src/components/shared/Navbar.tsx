"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { cn, getInitials } from "@/lib/utils";
import {
  LayoutDashboard,
  Repeat2,
  Sparkles,
  LogOut,
  Menu,
  X,
  Search,
  BookMarked,
  Settings,
  HelpCircle,
  BookOpen,
  ChevronDown,
  Star,
  Headphones,
  Flag,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collection", label: "My Cards", icon: BookMarked },
  { href: "/trades", label: "My Trades", icon: Repeat2 },
  { href: "/matches", label: "Matches", icon: Sparkles },
];

const helpLinks = [
  { href: "/how-it-works",         label: "How It Works",    icon: BookOpen,    description: "Learn how trading works"       },
  { href: "/card-condition-guide", label: "Condition Guide", icon: Star,        description: "What Mint, NM, LP etc. means" },
  { href: "/how-it-works#faq",     label: "FAQ",             icon: HelpCircle,  description: "Common questions answered"     },
  { href: "/support",              label: "Contact Support", icon: Headphones,  description: "Submit a support ticket"       },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Close help dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/60">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-sm font-display font-black">H</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            HoloSwaps
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {user?.isAdmin ? (
            /* Admin nav */
            <>
              <Link
                href="/admin/support"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/admin/support")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Headphones size={16} />
                Support Board
              </Link>
              <Link
                href="/admin/reports"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/admin/reports")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Flag size={16} />
                Reports
              </Link>
            </>
          ) : (
            <>
              {/* Browse Cards — always visible */}
              <Link
                href="/cards"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/cards")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Search size={16} />
                Browse Cards
              </Link>

              {/* Authenticated links */}
              {isAuthenticated && navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname.startsWith(href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Help dropdown — desktop (hidden for admins) */}
          <div ref={helpRef} className={cn("relative hidden md:block", user?.isAdmin && "!hidden")}>
            <button
              onClick={() => setHelpOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                helpOpen
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <HelpCircle size={16} />
              Help
              <ChevronDown size={14} className={cn("transition-transform duration-200", helpOpen && "rotate-180")} />
            </button>

            {helpOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-xl shadow-black/20 overflow-hidden">
                {helpLinks.map(({ href, label, icon: Icon, description }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setHelpOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors group"
                  >
                    <Icon size={16} className="text-muted-foreground group-hover:text-primary mt-0.5 flex-shrink-0 transition-colors" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {isAuthenticated && user ? (
            <>
              <Link
                href={`/profile/${user.username}`}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">
                    {getInitials(user.username)}
                  </span>
                </div>
                <span className="text-sm font-medium">{user.username}</span>
              </Link>
              <Link
                href="/settings"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Settings size={16} />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/auth/login"
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Get started
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-1">
          {user?.isAdmin ? (
            <>
              <Link
                href="/admin/support"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/admin/support") ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Headphones size={16} />
                Support Board
              </Link>
              <Link
                href="/admin/reports"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/admin/reports") ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Flag size={16} />
                Reports
              </Link>
            </>
          ) : (
            <Link
              href="/cards"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith("/cards") ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}
            >
              <Search size={16} />
              Browse Cards
            </Link>
          )}

          {isAuthenticated && !user?.isAdmin ? (
            <>
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname.startsWith(href) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname === "/settings" ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Settings size={16} />
                Settings
              </Link>
              <button
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm">Sign in</Link>
              <Link href="/auth/register" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-primary">Get started</Link>
            </>
          )}

          {/* Help section in mobile — hidden for admins */}
          {!user?.isAdmin && (
            <div className="pt-2 border-t border-border mt-2">
              <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Help</p>
              {helpLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground transition-colors"
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
