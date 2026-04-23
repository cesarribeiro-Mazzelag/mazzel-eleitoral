import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Número 404 estilizado com cores do partido */}
        <div className="flex items-baseline justify-center gap-1 opacity-20 mb-8 select-none">
          <span className="font-display font-black text-[120px] text-uniao-azul leading-none">4</span>
          <span className="font-display font-black text-[100px] text-uniao-dourado leading-none">0</span>
          <span className="font-display font-black text-[120px] text-uniao-azul leading-none">4</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página não encontrada</h1>
        <p className="text-gray-500 text-sm mb-8">
          O endereço que você acessou não existe ou foi movido.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-uniao-azul text-white text-sm font-medium rounded-xl hover:bg-uniao-azul/90 transition-colors"
          >
            Ir para o painel
          </Link>
          <Link
            href="/mapa"
            className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Ver mapa eleitoral
          </Link>
        </div>
      </div>
    </div>
  );
}
