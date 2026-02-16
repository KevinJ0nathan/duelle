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

export const metadata = {
  title: "Duelle",
  description:
    "A real-time 1v1 Wordle showdown. Compete against friends, solve the word before they do, and prove who has the sharper mind in Duelle.",
  openGraph: {
    title: "Duelle",
    description:
      "A real-time 1v1 Wordle showdown. Compete against friends, solve the word before they do, and prove who has the sharper mind in Duelle.",
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
    title: "Duelle",
    description:
      "A real-time 1v1 Wordle showdown. Challenge friends and race to solve the word first.",
    images: ["/duelle_thumbnail.png"],
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
