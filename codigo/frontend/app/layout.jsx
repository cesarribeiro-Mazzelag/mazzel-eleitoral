import "./globals.css";
// Mazzel Design System - carregado em paralelo ao globals.css (sem conflito, prefixos mz-*)
// Ativo quando NEXT_PUBLIC_MAZZEL_UI=1
import "./globals-mazzel.css";
import { ToastProvider } from "@/lib/toast";
import { AntiScrapingProvider } from "@/components/AntiScrapingProvider";

export const metadata = {
  title: "União Conecta · União Brasil",
  description: "União Conecta — plataforma de inteligência político-partidária do União Brasil. Operada por Mazzel.",
  robots: "noindex, nofollow, noai, noimageai, noarchive",
};

// Script inline anti-FOUC: aplica data-theme + data-tenant no <html> ANTES do
// React hidratar pra evitar flash. Cesar 27/04: prioridade do tema:
//   1. ?theme=...                        (link explicito)
//   2. localStorage["mz-theme"]          (escolha previa do usuario)
//   3. prefers-color-scheme do sistema   (configuracao do equipamento)
//   4. fallback Light                    (default conservador, escolha Cesar)
const ANTI_FOUC_SCRIPT = `
(function(){
  try{
    var qs=new URLSearchParams(location.search);
    var q=qs.get('theme');
    var ls=null; try{ls=localStorage.getItem('mz-theme');}catch(_){}
    var t;
    if(q==='light'||q==='dark'){t=q;}
    else if(ls==='light'||ls==='dark'){t=ls;}
    else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){t='dark';}
    else{t='light';}
    document.documentElement.setAttribute('data-theme',t);
    document.documentElement.setAttribute('data-tenant','uniao-brasil');
  }catch(e){
    document.documentElement.setAttribute('data-theme','light');
    document.documentElement.setAttribute('data-tenant','uniao-brasil');
  }
})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&family=Bebas+Neue&display=swap"
        />
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
