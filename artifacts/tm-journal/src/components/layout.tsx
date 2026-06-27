import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, CheckSquare, Settings as SettingsIcon, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/journal", label: "Journal Entries", icon: FileText },
    { href: "/review", label: "Review Items", icon: CheckSquare },
    { href: "/records", label: "Records", icon: Archive },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="w-64 border-r bg-sidebar text-sidebar-foreground flex flex-col h-full">
      <div className="p-6">
        <h2 className="text-lg font-bold tracking-tight text-primary">TM Journal Monitor</h2>
        <p className="text-xs text-muted-foreground mt-1">Command Center</p>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{link.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} TM Journal Monitor
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}
