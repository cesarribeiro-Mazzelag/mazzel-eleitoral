import "./globals.css";
// Mazzel Design System - carregado em paralelo ao globals.css (sem conflito, prefixos mz-*)
// Ativo quando NEXT_PUBLIC_MAZZEL_UI=1
import "./globals-mazzel.css";
import { ToastProvider } from "@/lib/toast";
import { AntiScrapingProvider } from "@/components/AntiScrapingProvider";

export const metadata = {
  title: "Inteligência Eleitoral | Mazzel Tech",
  description: "Plataforma de Inteligência Eleitoral — Mazzel Tech",
  robots: "noindex, nofollow, noai, noimageai, noarchive",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <AntiScrapingProvider />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
