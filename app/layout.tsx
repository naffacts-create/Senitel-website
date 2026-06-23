import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel — never let a client site lapse",
  description:
    "Monitor SSL expiry, domain expiry, and uptime across all your client sites. Get alerted before something breaks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
