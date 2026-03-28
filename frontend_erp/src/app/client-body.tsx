"use client";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { ToastProvider } from "@/components/ui/toast";

export function ClientBody({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pt-20 lg:pt-6">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
