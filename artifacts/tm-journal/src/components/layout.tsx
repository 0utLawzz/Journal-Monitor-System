import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, CheckSquare, Settings as SettingsIcon, Archive } from "lucide-react";

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
    <div className="w-64 border-r-[3px] border-[#232323] bg-[#0C0C0C] text-[#F0E8D0] flex flex-col h-full shrink-0">
      <div className="p-6 border-b-2 border-[#232323]">
        <h2
          className="text-2xl tracking-widest text-[#FAF6EE]"
          style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif" }}
        >
          TM<span className="text-[#C94A00]">.</span>Journal
        </h2>
        <p className="text-[10px] font-[family-name:var(--font-mono)] text-[rgba(240,232,208,0.45)] mt-1 uppercase tracking-[0.2em]">
          Monitor System
        </p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors duration-100 border-l-2 ${
                  isActive
                    ? "bg-[#C94A00] text-white border-[#C94A00]"
                    : "text-[rgba(240,232,208,0.55)] border-transparent hover:bg-[#232323] hover:text-white hover:border-[#333]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span
                  className="text-[11px] uppercase tracking-[0.12em] font-[family-name:var(--font-mono)]"
                >
                  {link.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t-2 border-[#232323]">
        <div className="text-[10px] font-[family-name:var(--font-mono)] text-[rgba(240,232,208,0.3)] uppercase tracking-widest text-center">
          &copy; {new Date().getFullYear()} TM Monitor
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F0E8D0]">
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}
