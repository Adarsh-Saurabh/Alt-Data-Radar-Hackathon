import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alternative Data Radar",
  description: "Pre-earnings intelligence from job, pricing, and web signals."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
