import type { Metadata } from "next";
import "./globals.css";
import { ClientBody } from "./client-body";

export const metadata: Metadata = {
  title: "OmniSync ERP – Asset & Stock Management",
  description:
    "Unified enterprise platform for asset lifecycle and inventory stock management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <ClientBody>{children}</ClientBody>
      </body>
    </html>
  );
}
