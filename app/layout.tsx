import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
});

export const metadata = { title: 'CodeUsagi' };

({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${instrumentSans.variable} ${instrumentSerif.variable} font-sans antialiased`}>
        {children}
        <Toaster theme="dark" position="bottom-right" closeButton richColors />
      </body>
    </html>
  );
}

// seo: updated tags
