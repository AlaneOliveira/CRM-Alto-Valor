import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "CRM Alto Valor | Decision Intelligence",
  description: "MVP de inteligência de retenção para clientes de alto valor.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${inter.variable} ${manrope.variable}`}><AppShell>{children}</AppShell></body></html>;
}
