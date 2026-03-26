import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MFC Combustion Analyzer Simulator",
  description:
    "Container-ready operator simulator for an MFC combustion analyzer with live detector logic, calibration workflows, trends, and module control.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
