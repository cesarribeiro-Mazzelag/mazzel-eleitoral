"""
Warm-up do cache em disco dos geojsons do mapa eleitoral.

Objetivo: popular /app/cache/geojson/ com as combinações mais acessadas,
eliminando o custo da 1a chamada após restart do backend.

Como rodar (dentro do container):
  docker exec ub_backend python -m scripts.warmup_geojsons

Strategy:
  - Login admin pra obter token
  - Itera combinações válidas (cargo × ano × modo × turno × uf)
  - Chama endpoints GET /mapa/geojson/* → endpoints chamam _salvar_disco
  - Loga progresso

Combinações cobertas (aprox):
  - /geojson/brasil-municipios: 4 cargos × 3 anos × 2 turnos = 24
  - /geojson/brasil:            6 cargos × 4 anos × 2 modos × 2 turnos = 96
  - /geojson/{uf}:              27 ufs × 4 cargos × 2 anos × 2 modos = 432
  Total: ~550 chamadas. Tempo estimado: 3-10 min (depende do hardware).
"""
from __future__ import annotations

import os
import sys
import time
import httpx

BASE_URL = os.environ.get("WARMUP_API_URL", "http://localhost:8000")
LOGIN = os.environ.get("WARMUP_LOGIN", "cesar@uniaobrasil.org.br")
SENHA = os.environ.get("WARMUP_SENHA", "teste123")

# Combinações a aquecer. Baseado em uso real do frontend.
# Pares (cargo, anos_validos, turnos_validos)
CARGOS_BRASIL = [
    ("PRESIDENTE",        [2018, 2022], [0, 1, 2]),
    ("GOVERNADOR",        [2018, 2022], [0, 1, 2]),
    ("SENADOR",           [2018, 2022], [1]),
    ("DEPUTADO FEDERAL",  [2018, 2022], [1]),
    ("DEPUTADO ESTADUAL", [2018, 2022], [1]),
    ("PREFEITO",          [2016, 2020, 2024], [0, 1, 2]),
    ("VEREADOR",          [2016, 2020, 2024], [1]),
]
MODOS = ["eleitos", "votos"]

UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
       "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"]


def login() -> str:
    """Autentica e retorna token JWT."""
    url = f"{BASE_URL}/auth/login"
    r = httpx.post(url, json={"email": LOGIN, "senha": SENHA}, timeout=30)
    r.raise_for_status()
    data = r.json()
    # Pode ser access_token ou token (depende da versão do endpoint)
    return data.get("access_token") or data.get("token")


def aquecer(client: httpx.Client, url: str) -> tuple[bool, float, int]:
    """Faz GET. Retorna (ok, segundos, tamanho_bytes)."""
    t0 = time.perf_counter()
    try:
        r = client.get(url, timeout=90)
        dt = time.perf_counter() - t0
        if r.status_code == 200:
            return True, dt, len(r.content)
        return False, dt, 0
    except Exception as e:
        return False, time.perf_counter() - t0, 0


def main() -> int:
    print(f"[warmup] BASE_URL={BASE_URL}", flush=True)
    try:
        token = login()
    except Exception as e:
        print(f"[warmup] ERRO login: {e}", file=sys.stderr)
        return 1

    headers = {"Authorization": f"Bearer {token}"}
    total_ok = 0
    total_fail = 0
    total_bytes = 0
    t_start = time.time()

    with httpx.Client(headers=headers, base_url=BASE_URL) as client:
        # 1) /geojson/brasil-municipios (sem partido) — 1 visão nacional por cargo/ano/turno
        print("[warmup] FASE 1: /geojson/brasil-municipios", flush=True)
        for cargo, anos, turnos in CARGOS_BRASIL:
            for ano in anos:
                for turno in turnos:
                    url = f"/mapa/geojson/brasil-municipios?cargo={cargo}&ano={ano}&turno={turno}"
                    ok, dt, sz = aquecer(client, url)
                    flag = "OK " if ok else "FAIL"
                    print(f"  {flag} {cargo:20s} {ano} t{turno}  {dt*1000:6.0f}ms  {sz/1024:6.0f}KB", flush=True)
                    total_ok += int(ok); total_fail += int(not ok); total_bytes += sz

        # 2) /geojson/brasil (estados agregados) — farol nacional
        print("[warmup] FASE 2: /geojson/brasil (estados)", flush=True)
        for cargo, anos, turnos in CARGOS_BRASIL:
            for ano in anos:
                for turno in turnos:
                    for modo in MODOS:
                        url = f"/mapa/geojson/brasil?cargo={cargo}&ano={ano}&modo={modo}&turno={turno}"
                        ok, dt, sz = aquecer(client, url)
                        flag = "OK " if ok else "FAIL"
                        print(f"  {flag} {cargo:20s} {ano} {modo} t{turno}  {dt*1000:6.0f}ms  {sz/1024:6.0f}KB", flush=True)
                        total_ok += int(ok); total_fail += int(not ok); total_bytes += sz

        # 3) /geojson/{uf} — drill estadual. Só cargo "hot" (PREFEITO/VEREADOR nacional 2024)
        #    + Governador/Deputados 2022. Outros cargos cacheiam on-demand.
        print("[warmup] FASE 3: /geojson/{uf} (27 UFs × cargos hot)", flush=True)
        hot_uf = [
            ("PREFEITO",  2024, [1, 2], ["eleitos", "votos"]),
            ("VEREADOR",  2024, [1],    ["eleitos", "votos"]),
            ("GOVERNADOR",2022, [1, 2], ["eleitos"]),
            ("DEPUTADO FEDERAL",  2022, [1], ["eleitos"]),
            ("DEPUTADO ESTADUAL", 2022, [1], ["eleitos"]),
        ]
        for uf in UFS:
            for cargo, ano, turnos, modos in hot_uf:
                for turno in turnos:
                    for modo in modos:
                        url = f"/mapa/geojson/{uf}?cargo={cargo}&ano={ano}&modo={modo}&turno={turno}"
                        ok, dt, sz = aquecer(client, url)
                        if not ok:
                            total_fail += 1
                            print(f"  FAIL {uf} {cargo:20s} {ano} {modo} t{turno}", flush=True)
                        else:
                            total_ok += 1
                            total_bytes += sz

    t_total = time.time() - t_start
    print(f"\n[warmup] Concluído em {t_total:.1f}s. OK={total_ok} FAIL={total_fail} Total={total_bytes/1024/1024:.1f}MB", flush=True)
    return 0 if total_fail == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
