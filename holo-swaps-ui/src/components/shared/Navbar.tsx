"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { cn, getInitials } from "@/lib/utils";
import {
  LayoutDashboard,
  Repeat2,
  Sparkles,
  User,
  LogOut,
  Menu,
  X,
  Search,
  BookMarked,
  Settings,
  HelpCircle,
} from "lucide-react";
import { useState } from "react";

const publicNavLinks = [
  { href: "/cards", label: "Browse Cards", icon: Search },
  { href: "/how-it-works", label: "How It Works", icon: HelpCircle },
];

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collection", label: "My Cards", icon: BookMarked },
  { href: "/trades", label: "My Trades", icon: Repeat2 },
  { href: "/matches", label: "Matches", icon: Sparkles },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/60">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-display font-bold">C</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            HoloSwaps
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Public links - always visible */}
          {publicNavLinks.map(({ href, label, icon: Icon }) => (
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
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
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
          {/* Public links - always visible */}
          {publicNavLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}

          {isAuthenticated ? (
            <>
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname.startsWith(href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground"
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
                  pathname === "/settings"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
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
        </div>
      )}
    </header>
  );
}
