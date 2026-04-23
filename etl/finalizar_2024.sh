#!/bin/bash
# Executa quando os processos de votos e fotos terminarem.
# 1. Limpa duplicatas do BRASIL no votos_por_zona
# 2. Calcula o farol
# Uso: ./finalizar_2024.sh

cd "$(dirname "$0")"

echo "=========================================="
echo "Finalização ETL 2024"
echo "=========================================="

# Aguarda votos e fotos terminarem se ainda estiverem rodando
for pid in $(pgrep -f "04_votos_zona|06_fotos"); do
  echo "Aguardando PID $pid terminar..."
  wait $pid 2>/dev/null
done

echo ""
echo "--- Passo 1: Removendo duplicatas do BRASIL ---"
docker exec ub_postgres psql -U postgres -d uniao_brasil -c "
-- Remove duplicatas deixando apenas o registro de menor ID por combinação
DELETE FROM votos_por_zona
WHERE id NOT IN (
    SELECT MIN(id)
    FROM votos_por_zona
    GROUP BY candidatura_id, municipio_id, zona_id
);
" && echo "Duplicatas removidas."

echo ""
echo "--- Passo 2: Contagem após limpeza ---"
docker exec ub_postgres psql -U postgres -d uniao_brasil -c "
SELECT COUNT(*) as votos_total, COUNT(DISTINCT candidatura_id) as candidaturas FROM votos_por_zona;
"

echo ""
echo "--- Passo 3: Calculando Farol por município ---"
python3 05_farol.py 2024

echo ""
echo "=========================================="
echo "Pronto! Plataforma pronta para teste."
echo "Acesse: http://localhost:3002"
echo "Login:  admin@uniaobrasil.org.br / Admin@2026"
echo "=========================================="
