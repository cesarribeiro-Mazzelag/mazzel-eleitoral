/**
 * Tests da máquina de estados do mapa.
 *
 * Cobrem:
 *   - Cada transição (D/R/N/P) produz o state esperado.
 *   - Cada invariante (I1-I8 + derivados) enforça a regra.
 *   - Fixed-point: invariantes em cascata convergem.
 */
import { describe, it, expect } from "vitest";
import type { SelecionadoItem } from "@/lib/types";
import {
  reducer,
  initialState,
  enforceInvariants,
  GEOGRAPHY_DEFAULT,
  FILTERS_DEFAULT,
  type MapaStateV2,
  type Action,
} from "./machine";

// ── Fixtures ────────────────────────────────────────────────────────────────

const partidoPT: SelecionadoItem = {
  tipo: "partido",
  id: 13,
  nome: "PT",
  cor: "#C8102E",
};
const partidoUB: SelecionadoItem = {
  tipo: "partido",
  id: 44,
  nome: "UNIAO",
  cor: "#005BAC",
};
const candidatoX: SelecionadoItem = {
  tipo: "candidato",
  id: 12345,
  nome: "Fulano",
  cor: "#00ff00",
  partido_num: 44,
  cargo: "PREFEITO",
  ano: 2024,
};

function at(overrides: Partial<MapaStateV2> = {}): MapaStateV2 {
  return { ...initialState(), ...overrides };
}

function apply(state: MapaStateV2, ...actions: Action[]): MapaStateV2 {
  return actions.reduce((s, a) => reducer(s, a), state);
}

// ── Transições D (Drive) ─────────────────────────────────────────────────────

describe("D - Drive (avançar)", () => {
  it("D_drill_estado: brasil → estado com uf", () => {
    const s = reducer(at(), { type: "D_drill_estado", uf: "SP" });
    expect(s.geography.nivel).toBe("estado");
    expect(s.geography.uf).toBe("SP");
    expect(s.geography.ibge).toBeNull();
  });

  it("D_drill_municipio: preserva uf do estado", () => {
    const s = apply(
      at(),
      { type: "D_drill_estado", uf: "SP" },
      { type: "D_drill_municipio", ibge: "3550308" }
    );
    expect(s.geography.nivel).toBe("municipio");
    expect(s.geography.uf).toBe("SP");
    expect(s.geography.ibge).toBe("3550308");
  });

  it("D_drill_municipio: ufHint sobrescreve estado atual", () => {
    const s = apply(
      at(),
      { type: "D_drill_estado", uf: "SP" },
      { type: "D_drill_municipio", ibge: "3304557", ufHint: "RJ" }
    );
    expect(s.geography.uf).toBe("RJ");
  });

  it("D_drill_bairro: preserva municipio", () => {
    const s = apply(
      at(),
      { type: "D_drill_estado", uf: "SP" },
      { type: "D_drill_municipio", ibge: "3550308" },
      { type: "D_drill_bairro", cdDist: "355030801" }
    );
    expect(s.geography.nivel).toBe("bairro");
    expect(s.geography.ibge).toBe("3550308");
    expect(s.geography.cdDist).toBe("355030801");
  });
});

// ── Transições R (Reverse) ───────────────────────────────────────────────────

describe("R - Reverse (voltar)", () => {
  it("R_voltar de estado → brasil", () => {
    const s = apply(
      at(),
      { type: "D_drill_estado", uf: "SP" },
      { type: "R_voltar" }
    );
    expect(s.geography).toEqual(GEOGRAPHY_DEFAULT);
  });

  it("R_voltar de municipio → estado (preserva uf)", () => {
    const s = apply(
      at(),
      { type: "D_drill_estado", uf: "SP" },
      { type: "D_drill_municipio", ibge: "3550308" },
      { type: "R_voltar" }
    );
    expect(s.geography.nivel).toBe("estado");
    expect(s.geography.uf).toBe("SP");
    expect(s.geography.ibge).toBeNull();
  });

  it("R_voltar de bairro → municipio (preserva ibge)", () => {
    const s = apply(
      at(),
      { type: "D_drill_estado", uf: "SP" },
      { type: "D_drill_municipio", ibge: "3550308" },
      { type: "D_drill_bairro", cdDist: "355030801" },
      { type: "R_voltar" }
    );
    expect(s.geography.nivel).toBe("municipio");
    expect(s.geography.ibge).toBe("3550308");
    expect(s.geography.cdDist).toBeNull();
  });

  it("R_voltar de brasil é no-op", () => {
    const s0 = at();
    const s1 = reducer(s0, { type: "R_voltar" });
    expect(s1).toBe(s0); // mesma referência = no-op
  });

  it("R_voltar preserva selecionados (I10)", () => {
    const s = apply(
      at({ selecionados: [partidoPT] }),
      { type: "D_drill_estado", uf: "SP" },
      { type: "D_drill_municipio", ibge: "3550308" },
      { type: "R_voltar" }
    );
    expect(s.selecionados).toEqual([partidoPT]);
  });
});

// ── Transição P (Park/Reset) ────────────────────────────────────────────────

describe("P - Park (reset)", () => {
  it("P_reset volta filters/geography/selecionados ao default, preserva UI", () => {
    const navegado = apply(
      at(),
      { type: "D_drill_estado", uf: "SP" },
      { type: "D_drill_municipio", ibge: "3550308" },
      { type: "N_add_selecionado", item: partidoPT },
      { type: "N_fechar_sidebar" }
    );
    const s = reducer(navegado, { type: "P_reset" });
    expect(s.geography).toEqual(GEOGRAPHY_DEFAULT);
    expect(s.filters).toEqual(FILTERS_DEFAULT);
    expect(s.selecionados).toEqual([]);
    expect(s.ui.sidebarState).toBe("closed"); // preserva UI
  });
});

// ── Transições N (Neutral filtros) ───────────────────────────────────────────

describe("N - Neutral (filtros)", () => {
  it("N_set_cargo: uppercase + preserva ano compatível", () => {
    // at() começa com ano=2024 (municipal). GOVERNADOR é estadual (só 2022/2018),
    // então primeiro mudamos o ano pra 2022 pra que I5 deixe passar.
    const s = apply(
      at(),
      { type: "N_set_ano", ano: 2022 },
      { type: "N_set_cargo", cargo: "governador" }
    );
    expect(s.filters.cargo).toBe("GOVERNADOR");
    expect(s.filters.ano).toBe(2022);
  });

  it("N_set_cargo em ano incompatível: I4 coerção", () => {
    // ano=2024 (municipal) + GOVERNADOR (estadual) → I4 força PREFEITO
    const s = reducer(at(), { type: "N_set_cargo", cargo: "governador" });
    expect(s.filters.cargo).toBe("PREFEITO");
  });

  it("N_set_ano: só muda ano (I4/I5 testadas à parte)", () => {
    const s = reducer(
      at({ filters: { ...FILTERS_DEFAULT, cargo: "VIGENTES" } }),
      { type: "N_set_ano", ano: 2022 }
    );
    expect(s.filters.ano).toBe(2022);
    expect(s.filters.cargo).toBe("VIGENTES");
  });

  it("N_set_turno: preserva demais", () => {
    const s = reducer(at(), { type: "N_set_turno", turno: 2 });
    // cargo default é PREFEITO (tem 2T) então 2 sobrevive
    expect(s.filters.turno).toBe(2);
  });

  it("N_set_modo: muda modo", () => {
    const s = reducer(
      at({ selecionados: [partidoPT] }), // 1 partido força votos depois
      { type: "N_set_modo", modo: "heatmap" }
    );
    // I8 corrige: 1 partido selecionado → modo=votos (não heatmap)
    expect(s.filters.modo).toBe("votos");
  });
});

// ── Transições N - Seleção ───────────────────────────────────────────────────

describe("N - Seleção", () => {
  it("N_add_selecionado: adiciona item", () => {
    const s = reducer(at(), { type: "N_add_selecionado", item: partidoPT });
    expect(s.selecionados).toEqual([partidoPT]);
  });

  it("N_add_selecionado: idempotente (não duplica)", () => {
    const s = apply(
      at(),
      { type: "N_add_selecionado", item: partidoPT },
      { type: "N_add_selecionado", item: partidoPT }
    );
    expect(s.selecionados).toHaveLength(1);
  });

  it("N_remove_selecionado: remove", () => {
    const s = apply(
      at(),
      { type: "N_add_selecionado", item: partidoPT },
      { type: "N_add_selecionado", item: partidoUB },
      { type: "N_remove_selecionado", tipo: "partido", id: 13 }
    );
    expect(s.selecionados).toEqual([partidoUB]);
  });

  it("N_toggle_selecionado: alterna", () => {
    let s = reducer(at(), { type: "N_toggle_selecionado", item: partidoPT });
    expect(s.selecionados).toHaveLength(1);
    s = reducer(s, { type: "N_toggle_selecionado", item: partidoPT });
    expect(s.selecionados).toHaveLength(0);
  });

  it("N_clear_selecionados: zera lista", () => {
    const s = apply(
      at(),
      { type: "N_add_selecionado", item: partidoPT },
      { type: "N_add_selecionado", item: partidoUB },
      { type: "N_clear_selecionados" }
    );
    expect(s.selecionados).toEqual([]);
  });
});

// ── Transições N - UI ────────────────────────────────────────────────────────

describe("N - UI", () => {
  it("N_toggle_sidebar_compact: open → compact → open", () => {
    let s = reducer(at(), { type: "N_toggle_sidebar_compact" });
    expect(s.ui.sidebarState).toBe("compact");
    s = reducer(s, { type: "N_toggle_sidebar_compact" });
    expect(s.ui.sidebarState).toBe("open");
  });

  it("N_toggle_debug: alterna", () => {
    const s = reducer(at(), { type: "N_toggle_debug" });
    expect(s.ui.debugMode).toBe(true);
  });

  it("N_set_hover: seta feature", () => {
    const s = reducer(at(), {
      type: "N_set_hover",
      feature: { id: 1 },
    });
    expect(s.ui.hoverFeature).toEqual({ id: 1 });
  });
});

// ── Invariantes ──────────────────────────────────────────────────────────────

describe("I1 - cargo nacional em brasil ou estado", () => {
  it("PRESIDENTE em nivel municipio → força brasil", () => {
    const viol: MapaStateV2 = {
      ...initialState(),
      filters: { ...FILTERS_DEFAULT, cargo: "PRESIDENTE", ano: 2022 },
      geography: {
        nivel: "municipio",
        uf: "SP",
        ibge: "3550308",
        cdDist: null,
      },
    };
    const s = enforceInvariants(viol);
    expect(s.geography.nivel).toBe("brasil");
    expect(s.geography.uf).toBeNull();
    expect(s.geography.ibge).toBeNull();
  });

  it("SENADOR em nivel estado → OK (não coerce)", () => {
    const ok: MapaStateV2 = {
      ...initialState(),
      filters: { ...FILTERS_DEFAULT, cargo: "SENADOR", ano: 2022 },
      geography: { nivel: "estado", uf: "SP", ibge: null, cdDist: null },
    };
    const s = enforceInvariants(ok);
    expect(s.geography.nivel).toBe("estado");
    expect(s.geography.uf).toBe("SP");
  });
});

describe("I2 - cargo estadual em brasil ou estado", () => {
  it("GOVERNADOR em nivel municipio → força estado preservando uf", () => {
    const viol: MapaStateV2 = {
      ...initialState(),
      filters: { ...FILTERS_DEFAULT, cargo: "GOVERNADOR", ano: 2022 },
      geography: {
        nivel: "municipio",
        uf: "SP",
        ibge: "3550308",
        cdDist: null,
      },
    };
    const s = enforceInvariants(viol);
    expect(s.geography.nivel).toBe("estado");
    expect(s.geography.uf).toBe("SP"); // preservado
    expect(s.geography.ibge).toBeNull();
  });

  it("DEPUTADO_FEDERAL em nivel bairro → força estado", () => {
    const viol: MapaStateV2 = {
      ...initialState(),
      filters: {
        ...FILTERS_DEFAULT,
        cargo: "DEPUTADO_FEDERAL",
        ano: 2022,
      },
      geography: {
        nivel: "bairro",
        uf: "SP",
        ibge: "3550308",
        cdDist: "355030801",
      },
    };
    const s = enforceInvariants(viol);
    expect(s.geography.nivel).toBe("estado");
  });
});

describe("I3 - cargo sem 2T força turno 0 e tab total", () => {
  it("VEREADOR com turno=2 → turno=0 + tab=total", () => {
    const viol: MapaStateV2 = {
      ...initialState(),
      filters: {
        ...FILTERS_DEFAULT,
        cargo: "VEREADOR",
        turno: 2,
        tab: "2_turno",
      },
    };
    const s = enforceInvariants(viol);
    expect(s.filters.turno).toBe(0);
    expect(s.filters.tab).toBe("total");
  });

  it("PREFEITO com turno=2 preserva (tem 2T)", () => {
    const ok: MapaStateV2 = {
      ...initialState(),
      filters: {
        ...FILTERS_DEFAULT,
        cargo: "PREFEITO",
        turno: 2,
        tab: "2_turno",
      },
    };
    const s = enforceInvariants(ok);
    expect(s.filters.turno).toBe(2);
    expect(s.filters.tab).toBe("2_turno");
  });

  it("SENADOR com turno=1 → turno=0 (SENADOR não tem 2T)", () => {
    const viol: MapaStateV2 = {
      ...initialState(),
      filters: { ...FILTERS_DEFAULT, cargo: "SENADOR", ano: 2022, turno: 1 },
    };
    const s = enforceInvariants(viol);
    expect(s.filters.turno).toBe(0);
  });
});

describe("I4 - ano municipal valida cargo", () => {
  it("ano=2024 com cargo=PRESIDENTE → força PREFEITO", () => {
    const viol: MapaStateV2 = {
      ...initialState(),
      filters: { ...FILTERS_DEFAULT, ano: 2024, cargo: "PRESIDENTE" },
    };
    const s = enforceInvariants(viol);
    expect(s.filters.cargo).toBe("PREFEITO");
  });

  it("ano=2020 com cargo=VEREADOR → preserva (OK)", () => {
    const ok: MapaStateV2 = {
      ...initialState(),
      filters: { ...FILTERS_DEFAULT, ano: 2020, cargo: "VEREADOR" },
    };
    const s = enforceInvariants(ok);
    expect(s.filters.cargo).toBe("VEREADOR");
  });

  it("ano=2024 com cargo=VIGENTES → preserva", () => {
    const ok: MapaStateV2 = {
      ...initialState(),
      filters: { ...FILTERS_DEFAULT, ano: 2024, cargo: "VIGENTES" },
    };
    const s = enforceInvariants(ok);
    expect(s.filters.cargo).toBe("VIGENTES");
  });
});

describe("I5 - ano geral valida cargo", () => {
  it("ano=2022 com cargo=VEREADOR → força PRESIDENTE", () => {
    const viol: MapaStateV2 = {
      ...initialState(),
      filters: { ...FILTERS_DEFAULT, ano: 2022, cargo: "VEREADOR" },
    };
    const s = enforceInvariants(viol);
    expect(s.filters.cargo).toBe("PRESIDENTE");
  });

  it("ano=2018 com cargo=SENADOR → preserva (OK)", () => {
    const ok: MapaStateV2 = {
      ...initialState(),
      filters: { ...FILTERS_DEFAULT, ano: 2018, cargo: "SENADOR" },
    };
    const s = enforceInvariants(ok);
    expect(s.filters.cargo).toBe("SENADOR");
  });
});

describe("I6 - multi-partido força modo votos", () => {
  it("2 partidos selecionados → modo=votos", () => {
    const s = enforceInvariants({
      ...initialState(),
      selecionados: [partidoPT, partidoUB],
      filters: { ...FILTERS_DEFAULT, modo: "eleitos" },
    });
    expect(s.filters.modo).toBe("votos");
  });
});

describe("I7 - sem selecionados força modo eleitos (exceto VIGENTES)", () => {
  it("0 selecionados + cargo=PREFEITO + modo=votos → modo=eleitos", () => {
    const s = enforceInvariants({
      ...initialState(),
      selecionados: [],
      filters: {
        ...FILTERS_DEFAULT,
        cargo: "PREFEITO",
        modo: "votos",
      },
    });
    expect(s.filters.modo).toBe("eleitos");
  });

  it("0 selecionados + cargo=VIGENTES → preserva modo", () => {
    const s = enforceInvariants({
      ...initialState(),
      selecionados: [],
      filters: { ...FILTERS_DEFAULT, cargo: "VIGENTES", modo: "votos" },
    });
    expect(s.filters.modo).toBe("votos");
  });

  it("modo=heatmap preservado mesmo sem selecionados", () => {
    const s = enforceInvariants({
      ...initialState(),
      selecionados: [],
      filters: {
        ...FILTERS_DEFAULT,
        cargo: "PREFEITO",
        modo: "heatmap",
      },
    });
    expect(s.filters.modo).toBe("heatmap");
  });
});

describe("I8 - único partido força modo votos", () => {
  it("1 partido selecionado → modo=votos", () => {
    const s = enforceInvariants({
      ...initialState(),
      selecionados: [partidoPT],
      filters: { ...FILTERS_DEFAULT, modo: "eleitos" },
    });
    expect(s.filters.modo).toBe("votos");
  });

  it("1 candidato selecionado → NÃO força votos (I8 só vale para partido)", () => {
    const s = enforceInvariants({
      ...initialState(),
      selecionados: [candidatoX],
      filters: { ...FILTERS_DEFAULT, modo: "eleitos" },
    });
    // I7 também não aplica (há selecionado)
    // I8 não aplica (não é partido)
    // Então modo preservado
    expect(s.filters.modo).toBe("eleitos");
  });
});

// ── Derivados de selecionados ────────────────────────────────────────────────

describe("Derivados: filters.partido e filters.candidatoId", () => {
  it("1 partido → partido=id, candidatoId=null", () => {
    const s = reducer(at(), { type: "N_add_selecionado", item: partidoPT });
    expect(s.filters.partido).toBe(13);
    expect(s.filters.candidatoId).toBeNull();
  });

  it("1 candidato → candidatoId=id, partido=null", () => {
    const s = reducer(at(), { type: "N_add_selecionado", item: candidatoX });
    expect(s.filters.candidatoId).toBe(12345);
    expect(s.filters.partido).toBeNull();
  });

  it("0 selecionados → ambos null", () => {
    const s = apply(
      at(),
      { type: "N_add_selecionado", item: partidoPT },
      { type: "N_clear_selecionados" }
    );
    expect(s.filters.partido).toBeNull();
    expect(s.filters.candidatoId).toBeNull();
  });

  it("2 selecionados → ambos null (comparação)", () => {
    const s = apply(
      at(),
      { type: "N_add_selecionado", item: partidoPT },
      { type: "N_add_selecionado", item: partidoUB }
    );
    expect(s.filters.partido).toBeNull();
    expect(s.filters.candidatoId).toBeNull();
  });
});

// ── Fixed-point (invariantes em cascata) ─────────────────────────────────────

describe("Fixed-point - invariantes cascateadas", () => {
  it("setAno=2024 + cargo=PRESIDENTE + nivel=municipio + turno=2 → I4→I1→I3 convergem", () => {
    // Estado caótico: inválido em 3 dimensões
    const viol: MapaStateV2 = {
      ...initialState(),
      filters: {
        ...FILTERS_DEFAULT,
        ano: 2024,
        cargo: "PRESIDENTE",
        turno: 2,
        tab: "2_turno",
      },
      geography: {
        nivel: "municipio",
        uf: "SP",
        ibge: "3550308",
        cdDist: null,
      },
    };
    const s = enforceInvariants(viol);
    // I4 cai cargo→PREFEITO, I1 não mais aplica (PREFEITO não é nacional),
    // I3 não aplica (PREFEITO tem 2T, turno=2 OK)
    expect(s.filters.cargo).toBe("PREFEITO");
    expect(s.filters.turno).toBe(2); // PREFEITO preserva turno=2
    expect(s.geography.nivel).toBe("municipio"); // PREFEITO pode estar em municipio
  });

  it("P_reset é idempotente", () => {
    const s1 = reducer(at(), { type: "P_reset" });
    const s2 = reducer(s1, { type: "P_reset" });
    expect(s2).toEqual(s1);
  });
});
