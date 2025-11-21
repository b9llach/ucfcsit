import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { FeedbackButton } from "@/components/feedback-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DegreeMe",
  description: "Plan smarter. Graduate faster.",
  openGraph: {
    title: "DegreeMe",
    description: "Plan smarter. Graduate faster.",
    url: "https://ucfcsit.vercel.app",
    siteName: "DegreeMe",
    images: [
      { url: "/og-image.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
        <FeedbackButton />
        <Toaster />
      </body>
    </html>
  );
}
