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
  Tag,
  Truck,
  Users,
  Bell,
  AlertTriangle,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api/client";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collection", label: "My Cards", icon: BookMarked },
  { href: "/trades", label: "My Trades", icon: Repeat2 },
  { href: "/matches", label: "Matches", icon: Sparkles },
  { href: "/friends", label: "Friends", icon: Users },
];

const helpLinks = [
  { href: "/how-it-works",         label: "How It Works",    icon: BookOpen,    description: "Learn how trading works"       },
  { href: "/card-condition-guide", label: "Condition Guide", icon: Star,        description: "What Mint, NM, LP etc. means" },
  { href: "/shipping-guide",       label: "Shipping Guide",  icon: Truck,       description: "How to pack and ship cards"    },
  { href: "/faq",                  label: "FAQ",             icon: HelpCircle,  description: "Common questions answered"     },
  { href: "/support",              label: "Contact Support", icon: Headphones,  description: "Submit a support ticket"       },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const helpRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setHelpOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch notifications when authenticated
  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications", { params: { limit: 10 } });
      setNotifications(res.data.data.data);
      setUnreadCount(res.data.data.unreadCount);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (!isAuthenticated || user?.isAdmin) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // silent
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
    }
  };

  const getNotifLink = (notif: any): string => {
    const data = notif.data ?? {};
    if (data.tradeId) return `/trades/${data.tradeId}`;
    return "#";
  };

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/60">
      <div className="container mx-auto flex items-center h-16 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-base font-display font-black">H</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            HoloSwaps
          </span>
        </Link>

        <div className="hidden lg:block w-px h-6 bg-border/60 mx-4 flex-shrink-0" />

        {/* Desktop nav */}
        <nav className="hidden lg:flex flex-1 justify-center items-center gap-1 flex-nowrap">
          {user?.isAdmin ? (
            /* Admin nav */
            <>
              <Link
                href="/admin/trades"
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  pathname.startsWith("/admin/trades")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Truck size={16} />
                Trades
              </Link>
              <Link
                href="/admin/support"
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  pathname.startsWith("/admin/support")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Headphones size={16} />
                Support Board
              </Link>
              <Link
                href="/admin/disputes"
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  pathname.startsWith("/admin/disputes")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <AlertTriangle size={16} />
                Disputes
              </Link>
              <Link
                href="/admin/reports"
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
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
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  pathname.startsWith("/cards")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Search size={16} />
                Browse Cards
              </Link>

              {/* Listings — always visible */}
              <Link
                href="/listings"
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  pathname.startsWith("/listings")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Tag size={16} />
                Listings
              </Link>

              {/* Authenticated links */}
              {isAuthenticated && navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
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

        <div className="hidden lg:block w-px h-6 bg-border/60 mx-4 flex-shrink-0" />

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          {/* Help dropdown — desktop (hidden for admins) */}
          <div ref={helpRef} className={cn("relative hidden lg:block", user?.isAdmin && "!hidden")}>
            <button
              onClick={() => setHelpOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
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
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Notification bell */}
          {isAuthenticated && user && !user.isAdmin && (
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setNotifOpen((v) => !v); if (!notifOpen) fetchNotifications(); }}
                className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-xl shadow-black/20 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">Notifications</p>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
                    ) : (
                      notifications.map((notif) => (
                        <a
                          key={notif.id}
                          href={getNotifLink(notif)}
                          onClick={() => { if (!notif.isRead) handleMarkOneRead(notif.id); setNotifOpen(false); }}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 last:border-0 ${!notif.isRead ? "bg-primary/5" : ""}`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!notif.isRead ? "bg-primary" : "bg-transparent"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-snug">{notif.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{notif.body}</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                              {new Date(notif.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {isAuthenticated && user ? (
            <>
              <Link
                href={`/profile/${user.username}`}
                className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors whitespace-nowrap"
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {getInitials(user.username)}
                  </span>
                </div>
                <span className="text-sm font-medium">{user.username}</span>
              </Link>
              <Link
                href="/settings"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
              >
                <Settings size={16} />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <div className="hidden lg:flex items-center gap-2">
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
            className="lg:hidden relative p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            {!mobileOpen && unreadCount > 0 && !user?.isAdmin && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-card px-4 py-3 space-y-1">
          {user?.isAdmin ? (
            <>
              <Link
                href="/admin/trades"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium transition-colors",
                  pathname.startsWith("/admin/trades") ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Truck size={16} />
                Trades
              </Link>
              <Link
                href="/admin/support"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium transition-colors",
                  pathname.startsWith("/admin/support") ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Headphones size={16} />
                Support Board
              </Link>
              <Link
                href="/admin/disputes"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium transition-colors",
                  pathname.startsWith("/admin/disputes") ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <AlertTriangle size={16} />
                Disputes
              </Link>
              <Link
                href="/admin/reports"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium transition-colors",
                  pathname.startsWith("/admin/reports") ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Flag size={16} />
                Reports
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/cards"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium transition-colors",
                  pathname.startsWith("/cards") ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Search size={16} />
                Browse Cards
              </Link>
              <Link
                href="/listings"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium transition-colors",
                  pathname.startsWith("/listings") ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Tag size={16} />
                Listings
              </Link>
            </>
          )}

          {isAuthenticated && !user?.isAdmin ? (
            <>
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium transition-colors",
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
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium transition-colors",
                  pathname === "/settings" ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Settings size={16} />
                Settings
              </Link>
              <button
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2.5 rounded-lg text-base text-muted-foreground"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-base">Sign in</Link>
              <Link href="/auth/register" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-base font-medium text-primary">Get started</Link>
            </>
          )}


          {/* Help section in mobile — hidden for admins */}
          {!user?.isAdmin && (
            <div className="pt-2 border-t border-border mt-2">
              <p className="px-3 py-1 text-base font-semibold text-muted-foreground uppercase tracking-wider">Help</p>
              {helpLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-base text-muted-foreground transition-colors"
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
