"use client";
import { Laurel } from "@/components/radar/Laurel";
import { Insignia } from "@/components/radar/Insignia";
import { BookOpen, Trophy, Target, Repeat, Sparkles, TrendingUp, RotateCcw, ArrowUpRight } from "lucide-react";

const TIERS = [
  { v: "dourado", label: "Dourado", faixa: "85-99", desc: "Elite. Alta performance em múltiplos atributos.", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800" },
  { v: "ouro",    label: "Ouro",    faixa: "75-84", desc: "Destaque regional com bom potencial.",            bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800" },
  { v: "prata",   label: "Prata",   faixa: "65-74", desc: "Médio. Pontos fortes específicos, oportunidade de crescer.", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" },
  { v: "bronze",  label: "Bronze",  faixa: "<65",   desc: "Base, renovação, ou trajetória em construção.",   bg: "", border: "", text: "" },
];

const ATRIBUTOS = [
  { k: "VOT", label: "Votação",     desc: "Volume de votos relativo à competição do cargo/região." },
  { k: "EFI", label: "Eficiência",  desc: "Votos obtidos vs. recurso investido na campanha." },
  { k: "ART", label: "Articulação", desc: "Projetos aprovados e coalizões lideradas." },
  { k: "FID", label: "Fidelidade",  desc: "Alinhamento com a linha do partido." },
  { k: "INT", label: "Integridade", desc: "Histórico judicial e administrativo." },
  { k: "TER", label: "Territorial", desc: "Presença geográfica - municípios onde tem voto significativo." },
];

const CARGOS = [
  { cargo: "PRESIDENTE",        metal: "ouro",   hierarquia: "Executivo federal - honra máxima" },
  { cargo: "GOVERNADOR",        metal: "ouro",   hierarquia: "Executivo estadual" },
  { cargo: "PREFEITO",          metal: "ouro",   hierarquia: "Executivo municipal" },
  { cargo: "SENADOR",           metal: "prata",  hierarquia: "Legislativo federal - mandato 8 anos" },
  { cargo: "DEPUTADO FEDERAL",  metal: "prata",  hierarquia: "Legislativo federal - Câmara" },
  { cargo: "VICE-PREFEITO",     metal: "bronze", hierarquia: "Executivo municipal - vice" },
  { cargo: "DEPUTADO ESTADUAL", metal: "bronze", hierarquia: "Legislativo estadual" },
  { cargo: "VEREADOR",          metal: "bronze", hierarquia: "Legislativo municipal" },
];

const TRAITS = [
  { icon: Repeat,       cor: "text-amber-600",   label: "REELEITO",     desc: "Venceu o mesmo cargo em eleições seguidas. Indica continuidade." },
  { icon: Sparkles,     cor: "text-emerald-600", label: "ESTREANTE",    desc: "Primeira eleição vencida na história. Indica renovação." },
  { icon: TrendingUp,   cor: "text-blue-600",    label: "MAIS VOTADO",  desc: "Top 1 do cargo na UF ou município. Líder de votação regional." },
  { icon: RotateCcw,    cor: "text-purple-600",  label: "VIROU O JOGO", desc: "Perdeu a eleição anterior e venceu a atual. Recuperou mandato." },
  { icon: Target,       cor: "text-red-600",     label: "HEGEMÔNICO",   desc: "Acima de 60% dos votos válidos. Domínio local/regional." },
  { icon: ArrowUpRight, cor: "text-cyan-600",    label: "ASCENDEU",     desc: "Migrou para cargo superior (ex: vereador → prefeito)." },
];

function Secao({ titulo, icon: Icon, children }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-purple-700" />
        </div>
        <h2 className="text-lg font-black text-gray-900">{titulo}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function GlossarioContent() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <header className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-6 h-6 text-purple-700" />
          <h1 className="text-2xl font-black text-gray-900">Glossário</h1>
        </div>
        <p className="text-sm text-gray-600">Como ler a carta política do Radar. Em 1 minuto você entende todos os elementos.</p>
      </header>

      <Secao titulo="Overall e tiers" icon={Trophy}>
        <p className="text-sm text-gray-600 mb-4">
          O <strong>Overall</strong> é a nota geral do político, de 0 a 99. Composta pelos 8 atributos
          (6 visíveis no card, 2 adicionais no dossiê). A coroa de louros em volta do número indica
          <strong> eleito atualmente</strong> - quem disputou e perdeu não tem laurel.
        </p>
        <div className="grid grid-cols-4 gap-3">
          {TIERS.map(t => (
            <div key={t.v} className={`rounded-xl border ${t.border} ${t.bg} p-4`} style={t.v === "bronze" ? { background: "rgba(184,115,51,0.08)", borderColor: "rgba(184,115,51,0.25)" } : {}}>
              <div className="flex items-baseline justify-between mb-2">
                <span className={`text-[10px] font-black tracking-widest ${t.text}`} style={t.v === "bronze" ? { color: "#b87333" } : {}}>{t.label}</span>
                <span className="text-xs font-bold text-gray-500 tabular-nums">{t.faixa}</span>
              </div>
              <div className="relative w-16 h-16 mx-auto my-3">
                <Laurel tier={t.v} ativo={true} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-black text-gray-900 tabular-nums" style={{ fontSize: 18 }}>{t.faixa.includes("-") ? t.faixa.split("-")[0] : "60"}</span>
                  <span className="text-[6px] font-black tracking-widest text-gray-500 mt-0.5">OVR</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-600 leading-snug">{t.desc}</p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Os 6 atributos do card" icon={Target}>
        <p className="text-sm text-gray-600 mb-4">
          Cada atributo vai de 20 a 99. No card aparecem os 6 principais em grid 2x3. No dossiê
          completo aparecem os 8 (com POT = potencial e FIN = financeiro).
        </p>
        <div className="grid grid-cols-2 gap-3">
          {ATRIBUTOS.map(a => (
            <div key={a.k} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
              <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 font-black text-gray-700 text-xs tracking-wider">{a.k}</div>
              <div>
                <div className="font-black text-sm text-gray-900">{a.label}</div>
                <div className="text-xs text-gray-600 mt-0.5">{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Insígnias por cargo" icon={Trophy}>
        <p className="text-sm text-gray-600 mb-4">
          Cada cargo tem uma insígnia única - medalha, escudo, coroa - seguindo hierarquia política.
          Aparece no canto superior direito do card (cargo atual) e no rodapé em sépia (cargos já
          ocupados). Cor cheia = está ocupando agora. Tracejado = disputou e não venceu.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CARGOS.map(c => (
            <div key={c.cargo} className="flex flex-col items-center p-4 rounded-xl bg-gray-50">
              <Insignia cargo={c.cargo} estado="atual" size={56} />
              <div className="mt-3 text-center">
                <div className="text-[10px] font-black tracking-widest text-gray-800">{c.cargo}</div>
                <div className="text-[10px] text-gray-500 mt-1 leading-snug">{c.hierarquia}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs">
          <div className="p-3 bg-amber-50 rounded-lg">
            <div className="font-black text-amber-800 mb-1">OURO</div>
            <div className="text-gray-600">Presidente, Governador, Prefeito</div>
          </div>
          <div className="p-3 bg-gray-100 rounded-lg">
            <div className="font-black text-gray-700 mb-1">PRATA</div>
            <div className="text-gray-600">Senador, Deputado Federal</div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "rgba(184,115,51,0.1)" }}>
            <div className="font-black mb-1" style={{ color: "#b87333" }}>BRONZE</div>
            <div className="text-gray-600">Vice-Prefeito, Dep. Estadual, Vereador</div>
          </div>
        </div>
      </Secao>

      <Secao titulo="Traits políticos" icon={Sparkles}>
        <p className="text-sm text-gray-600 mb-4">Marcadores com sentido político real. Calculados automaticamente a partir do histórico de candidaturas e resultados.</p>
        <div className="grid grid-cols-2 gap-3">
          {TRAITS.map(t => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <Icon className={`w-5 h-5 ${t.cor} flex-shrink-0 mt-0.5`} />
                <div>
                  <div className="font-black text-sm text-gray-900 tracking-wider">{t.label}</div>
                  <div className="text-xs text-gray-600 mt-0.5 leading-snug">{t.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Secao>

      <footer className="text-center py-8 text-xs text-gray-400">
        Dúvidas não cobertas aqui? Clique no card para ver o dossiê completo do político.
      </footer>
    </div>
  );
}
