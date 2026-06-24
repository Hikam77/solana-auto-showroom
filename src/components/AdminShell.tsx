import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Car, Receipt, Activity, Settings, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/cars", label: "Inventaris", icon: Car, exact: false },
  { to: "/admin/transactions", label: "Transaksi", icon: Receipt, exact: false },
  { to: "/admin/web3", label: "Web3 Analytics", icon: Activity, exact: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, exact: false },
] as const;

export function AdminShell({ children, title, description }: { children: ReactNode; title: string; description?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
          <Link to="/" className="text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground inline-flex items-center gap-1">
            <ChevronLeft className="size-4" /> Showroom
          </Link>
        </div>
        <div className="p-3">
          <div className="px-3 py-2 text-xs uppercase tracking-wider text-sidebar-foreground/50">Admin Panel</div>
          <nav className="space-y-1">
            {ITEMS.map((it) => {
              const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {it.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-4 text-xs text-sidebar-foreground/50">
          Demo mode • Admin tanpa login
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="h-16 border-b border-border flex items-center justify-between px-6">
          <div>
            <h1 className="font-display text-xl font-bold leading-none">{title}</h1>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
