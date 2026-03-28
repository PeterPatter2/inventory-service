"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  Menu,
  X,
  ChevronLeft,
  Settings,
  Boxes,
  TruckIcon,
  BarChart3,
  Layers,
  Eye,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** If true, match only exact pathname (for index routes like "/" or "/stock") */
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Assets",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard, exact: true },
      { label: "Asset Directory", href: "/assets", icon: Package },
      { label: "Asset Transfer", href: "/transfer", icon: ArrowRightLeft },
    ],
  },
  {
    title: "Stock / Inventory",
    items: [
      { label: "Stock Dashboard", href: "/stock", icon: BarChart3, exact: true },
      { label: "Inventory", href: "/stock/items", icon: Boxes },
      { label: "Availability", href: "/stock/availability", icon: Eye },
      { label: "Stock Movement", href: "/stock/movement", icon: TruckIcon },
    ],
  },
];

function isRouteActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  // For non-exact: match if pathname equals href or starts with href + "/"
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-bg text-white shadow-lg lg:hidden cursor-pointer"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar-bg text-sidebar-foreground transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 px-4 border-b border-white/10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <Layers className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-white tracking-wide truncate">
                OmniSync ERP
              </span>
              <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">
                Asset & Stock Mgmt
              </span>
            </div>
          )}

          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation with sections */}
        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
          {navSections.map((section, sIdx) => (
            <div key={section.title}>
              {/* Section divider */}
              {sIdx > 0 && (
                <div className="my-3 border-t border-white/10" />
              )}

              {/* Section title */}
              {!collapsed && (
                <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                  {section.title}
                </p>
              )}

              {/* Section items */}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = isRouteActive(pathname, item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-white"
                          : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/10 p-3 space-y-1">
          <Link
            href="#"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 h-6 w-6 items-center justify-center rounded-full border bg-background text-foreground shadow-sm hover:bg-accent transition-colors cursor-pointer"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </aside>

      {/* Spacer for fixed sidebar */}
      <div
        className={cn(
          "hidden lg:block shrink-0 transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64"
        )}
      />
    </>
  );
}
