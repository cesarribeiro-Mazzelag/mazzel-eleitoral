#!/bin/bash
# Receita completa pra SP capital — ordem validada em Brasilândia/Pirituba/Freguesia.
# Uso: ./run_receita_sp.sh
set -e

MUNICIPIO=3550308
cd "$(dirname "$0")"
export DATABASE_URL="postgresql+psycopg2://postgres:postgres@localhost:5433/uniao_brasil"

echo "═══ Receita SP capital — municipio=$MUNICIPIO ═══"
echo ""

for step in "26_remover_holes" "30_suavizar_bordas" "31_refinamento_automatico" "32_podar_invasoes" "36_arredondar_fronteiras" "35_sanear_agulhas_gaps" "26_remover_holes"; do
    echo "▶ $step"
    python3 "${step}.py" --municipio "$MUNICIPIO" 2>&1 | tail -5 || echo "  FALHOU (seguindo)"
    echo ""
done

echo "▶ 22_bordas_dissolvidas (regenera bordas)"
python3 22_bordas_dissolvidas.py --municipio "$MUNICIPIO" 2>&1 | tail -3

echo ""
echo "═══ FIM ═══"
