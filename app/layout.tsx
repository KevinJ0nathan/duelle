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
