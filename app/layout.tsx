import { Nunito, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

// Configure the font
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["700"],
  display: "swap",
});

export const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Duelle",
  applicationCategory: "GameApplication",
  operatingSystem: "Any",
  description:
    "A real-time multiplayer word guessing game where players compete head-to-head to solve the same puzzle faster.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export const metadata = {
  metadataBase: new URL("https://duelle.vercel.app"),

  title: {
    template: "%s | Duelle",
    default: "Duelle | Real-Time Multiplayer Word Game.",
  },
  description:
    "Play Duelle, a fast-paced multiplayer word guessing game. Challenge friends in real time, solve the hidden word first, and prove your vocabulary skills.",

  keyWords: [
    "multiplayer word game",
    "word guessing game",
    "play word game with friends",
    "competitive word puzzle",
    "real-time word game",
    "vocabulary challenge",
    "duelle game",
  ],

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "Duelle - Real Time Word Battle",
    description:
      "Challenge friends to a live word guessing duel. Think fast, solve first, win.",
    url: "https://duelle.vercel.app/",
    siteName: "Duelle",
    images: [
      {
        url: "/duelle_thumbnail.png",
        width: 1200,
        height: 630,
        alt: "Duelle gameplay preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Duelle | Multiplayer Word Game",
    description:
      "Challenge friends to a live word guessing duel. Think fast, solve first, win.",
    images: ["/duelle_thumbnail.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${playfair.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
