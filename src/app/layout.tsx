import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { Header } from "@/components/header";
import { CartStoreProvider } from "@/features/cart/store-provider";
import { getCurrentUser } from "@/server/auth/session";
import { getCartView, type SerializedCart } from "@/server/services/cart";
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

async function loadInitialCart(): Promise<SerializedCart> {
  try {
    const user = await getCurrentUser();
    return await getCartView(user?.id);
  } catch {
    return { id: "empty", items: [], totalCents: 0, itemsCount: 0 };
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const initialCart = await loadInitialCart();

  return (
    <html lang="ru">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <CartStoreProvider initialCart={initialCart}>
          <Header />
          <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-6xl px-4 py-8">
            {children}
          </main>
        </CartStoreProvider>
      </body>
    </html>
  );
}
