import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { Header } from "@/components/header";
import { CartHydrator } from "@/features/cart/cart-hydrator";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HexParts — комплектующие для ПК",
    template: "%s · HexParts",
  },
  description:
    "Интернет-магазин комплектующих для ПК: видеокарты, процессоры, память, накопители и периферия.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <CartHydrator />
        <Header />
        <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-6xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
