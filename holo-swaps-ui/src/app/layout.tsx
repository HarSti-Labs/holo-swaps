import type { Metadata } from "next";
import { Syne, DM_Sans, DM_Mono } from "next/font/google";
import { Providers } from "@/components/shared/Providers";
import "@/styles/globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "HoloSwaps — Trade Pokémon Cards Safely",
    template: "%s | HoloSwaps",
  },
  description:
    "The verified peer-to-peer Pokémon card trading platform. Post your collection, find matches, trade with confidence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${syne.variable} ${dmSans.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body className="dark">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
