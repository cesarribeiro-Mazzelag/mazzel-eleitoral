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

// Script inline anti-FOUC: aplica data-theme no <html> antes do React hidratar,
// lendo preferencia do localStorage. Evita flash branco em reload com tema light.
const ANTI_FOUC_SCRIPT =
  "(function(){try{var s=window.localStorage.getItem('mz-theme');" +
  "var t=(s==='light'||s==='dark')?s:'dark';" +
  "document.documentElement.setAttribute('data-theme',t);}" +
  "catch(e){document.documentElement.setAttribute('data-theme','dark');}})();";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC_SCRIPT }} />
      </head>
      <body>
        <AntiScrapingProvider />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
