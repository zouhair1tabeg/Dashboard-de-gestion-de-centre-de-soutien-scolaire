"use client";

import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const logoSrc = "/logo.png";
const iconSrc = "/icon.png";

const navigation = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/students", label: "Élèves", icon: Users },
  { href: "/subjects", label: "Matières & Groupes", icon: BookOpen },
  { href: "/sessions", label: "Séances", icon: CalendarDays },
  { href: "/payments", label: "Paiements", icon: Wallet },
  { href: "/settings", label: "Paramètres", icon: Settings },
] as const;

function Brand({ isMobile }: { isMobile: boolean }) {
  const src = isMobile ? iconSrc : logoSrc;
  const size = isMobile ? 32 : 1024;

  return (
    <Link href="/" className="flex items-center justify-center py-3">
      <Image
        src={src}
        alt="Centre Prime"
        width={size}
        height={size}
        className="h-auto max-h-[72px] w-auto max-w-[170px] object-contain"
      />
    </Link>
  );
}

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navigation.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary transition-opacity",
                isActive ? "opacity-100" : "opacity-0",
              )}
            />
            <Icon className="size-4.5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ email }: { email: string }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut({ redirect: false });
    router.replace("/login");
    router.refresh();
  }

  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Administrateur</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Se déconnecter"
          title="Se déconnecter"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function AppSidebar({ email }: { email: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur lg:hidden">
        <Brand isMobile={mobileOpen} />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Ouvrir le menu">
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand isMobile={mobileOpen} />
            </SheetHeader>
            <div className="flex h-[calc(100%-73px)] flex-col justify-between p-4">
              <NavigationLinks onNavigate={() => setMobileOpen(false)} />
              <SidebarFooter email={email} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden w-[272px] shrink-0 border-r bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
        <div className="px-5 py-6">
          <Brand isMobile={mobileOpen} />
        </div>
        <div className="flex-1 px-4">
          <p className="px-3 pb-2 text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">
            Gestion
          </p>
          <NavigationLinks />
        </div>
        <div className="p-4">
          <SidebarFooter email={email} />
        </div>
      </aside>
    </>
  );
}
