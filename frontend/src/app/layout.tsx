import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MONTE CARLO | Risk Simulator",
  description:
    "Production-grade, mathematically rigorous multi-portfolio risk simulator featuring Monte Carlo probability modeling, Value at Risk (VaR), and Conditional VaR (CVaR) for US & PSX equities.",
  keywords: [
    "Monte Carlo Simulation",
    "Risk Simulator",
    "Value at Risk",
    "VaR",
    "CVaR",
    "Expected Shortfall",
    "PSX Pakistan Stock Exchange",
    "US Equities",
    "Quantitative Finance",
    "Portfolio Risk Modeling",
  ],
  openGraph: {
    title: "MONTE CARLO | Risk Simulator",
    description:
      "Production-grade, mathematically rigorous multi-portfolio risk simulator featuring Monte Carlo probability modeling, Value at Risk (VaR), and Conditional VaR (CVaR) for US & PSX equities.",
    type: "website",
    siteName: "MONTE CARLO Risk Simulator",
  },
  twitter: {
    card: "summary_large_image",
    title: "MONTE CARLO | Risk Simulator",
    description:
      "Production-grade, mathematically rigorous multi-portfolio risk simulator featuring Monte Carlo probability modeling, VaR, and CVaR for US & PSX equities.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased light`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
