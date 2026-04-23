/**
 * Badge visual do perfil do usuário na sidebar
 */
const LABELS = {
  PRESIDENTE:  { label: "Presidente",   cor: "bg-[#F59E0B] text-[#1E0A3C]" },
  DIRETORIA:   { label: "Diretoria",    cor: "bg-brand-100 text-brand-800" },
  DELEGADO:    { label: "Delegado",     cor: "bg-green-100 text-green-800" },
  POLITICO:    { label: "Político",     cor: "bg-purple-100 text-purple-800" },
  FUNCIONARIO: { label: "Funcionário",  cor: "bg-gray-200 text-gray-700" },
};

export function BadgePerfil({ perfil }) {
  const { label, cor } = LABELS[perfil] ?? { label: perfil, cor: "bg-gray-200 text-gray-700" };
  return (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cor}`}>
      {label}
    </span>
  );
}
