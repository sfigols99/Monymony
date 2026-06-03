import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { LoadingProvider } from "@/components/LoadingProvider";
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
  title: "Monymony — Gastos compartidos del hogar",
  description:
    "Planifica y controla los gastos mensuales conjuntos de tu casa según vuestro presupuesto.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <head>
        {/* Google Material Symbols — variable icon font used across the app
            (category icons, buttons…). Loaded with a <link> rather than a CSS
            @import: Tailwind v4 expands `@import "tailwindcss"` into rules, which
            pushes any following @import past them so browsers drop it and the
            icons render as plain text. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* display=block is intentional for an icon font: it avoids flashing the
            ligature names (e.g. "photo_camera") before the glyphs load. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider>
          <LoadingProvider>{children}</LoadingProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
