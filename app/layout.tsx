import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";
import NavWrapper from "@/components/ui/NavWrapper";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Estudio Bíblico",
  description: "Plataforma de estudio bíblico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${lora.variable} ${inter.variable} antialiased bg-[#FAF8F5] text-[#2C2C2C]`}
      >
        <NavWrapper />
        {children}
      </body>
    </html>
  );
}
