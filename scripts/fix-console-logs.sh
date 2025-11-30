#!/bin/bash
# ========================================
# Script: fix-console-logs.sh
# Descrição: Substitui console.log por logger em arquivos JavaScript
# Uso: bash scripts/fix-console-logs.sh
# ========================================

set -e  # Exit on error

echo "🔧 Iniciando correção de console.log -> logger..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Arquivos a corrigir
FILES=(
    "backend/routes/clientes.js"
    "backend/routes/servicos.js"
    "backend/utils/actionLog.js"
    "backend/swagger.js"
    "backend/app.js"
)

# Contador
total_files=0
success_files=0
failed_files=0

# Função para verificar se logger está importado
check_logger_import() {
    local file=$1
    if grep -q "require.*logger" "$file" || grep -q "import.*logger" "$file"; then
        return 0
    else
        return 1
    fi
}

# Função para adicionar import do logger
add_logger_import() {
    local file=$1

    # Verifica se já tem import
    if check_logger_import "$file"; then
        echo "  ✓ Logger já está importado"
        return 0
    fi

    # Adiciona import no topo do arquivo (depois de outros requires)
    local temp_file="${file}.tmp"

    # Encontra a última linha de require e adiciona depois dela
    awk '
        /^const.*require.*/ { last_require=NR }
        { lines[NR]=$0 }
        END {
            for (i=1; i<=NR; i++) {
                print lines[i]
                if (i == last_require) {
                    print "const logger = require('\''../utils/logger'\'');"
                }
            }
        }
    ' "$file" > "$temp_file"

    mv "$temp_file" "$file"
    echo -e "  ${GREEN}✓${NC} Logger import adicionado"
}

# Processar cada arquivo
for file in "${FILES[@]}"; do
    total_files=$((total_files + 1))

    echo -e "${YELLOW}[$total_files/${#FILES[@]}]${NC} Processando: $file"

    # Verifica se arquivo existe
    if [ ! -f "$file" ]; then
        echo -e "  ${RED}✗${NC} Arquivo não encontrado, pulando..."
        failed_files=$((failed_files + 1))
        echo ""
        continue
    fi

    # Cria backup
    cp "$file" "${file}.backup"
    echo "  ✓ Backup criado: ${file}.backup"

    # Adiciona import do logger se necessário
    add_logger_import "$file"

    # Contador de substituições
    log_count=$(grep -c "console\.log(" "$file" 2>/dev/null || echo "0")
    error_count=$(grep -c "console\.error(" "$file" 2>/dev/null || echo "0")
    warn_count=$(grep -c "console\.warn(" "$file" 2>/dev/null || echo "0")

    total_replacements=$((log_count + error_count + warn_count))

    if [ $total_replacements -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} Nenhuma substituição necessária"
        rm "${file}.backup"
        success_files=$((success_files + 1))
        echo ""
        continue
    fi

    # Substituições
    # 1. console.log -> logger.info
    sed -i 's/console\.log(/logger.info(/g' "$file"

    # 2. console.error -> logger.error
    sed -i 's/console\.error(/logger.error(/g' "$file"

    # 3. console.warn -> logger.warn
    sed -i 's/console\.warn(/logger.warn(/g' "$file"

    # 4. console.debug -> logger.debug
    sed -i 's/console\.debug(/logger.debug(/g' "$file"

    # Verifica se substituições funcionaram
    new_log_count=$(grep -c "console\.log(" "$file" 2>/dev/null || echo "0")
    new_error_count=$(grep -c "console\.error(" "$file" 2>/dev/null || echo "0")
    new_warn_count=$(grep -c "console\.warn(" "$file" 2>/dev/null || echo "0")

    new_total=$((new_log_count + new_error_count + new_warn_count))

    if [ $new_total -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} Substituições realizadas:"
        echo "    - console.log:   $log_count -> logger.info"
        echo "    - console.error: $error_count -> logger.error"
        echo "    - console.warn:  $warn_count -> logger.warn"
        success_files=$((success_files + 1))
    else
        echo -e "  ${RED}✗${NC} Algumas substituições falharam"
        echo "    Restantes: $new_total ocorrências de console.*"
        failed_files=$((failed_files + 1))
    fi

    echo ""
done

# Resumo final
echo "========================================="
echo "📊 RESUMO"
echo "========================================="
echo -e "Total de arquivos: $total_files"
echo -e "${GREEN}Sucesso:${NC} $success_files"
if [ $failed_files -gt 0 ]; then
    echo -e "${RED}Falhas:${NC} $failed_files"
fi
echo ""

if [ $failed_files -eq 0 ]; then
    echo -e "${GREEN}✅ Todos os arquivos corrigidos com sucesso!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Revise as mudanças: git diff"
    echo "2. Teste a aplicação: npm start"
    echo "3. Execute os testes: npm test"
    echo "4. Se tudo estiver OK, faça commit: git add . && git commit -m 'fix: substituir console.log por logger'"
    echo ""
    echo "Para reverter (se necessário):"
    echo "  for f in ${FILES[@]}; do [ -f \"\${f}.backup\" ] && mv \"\${f}.backup\" \"\$f\"; done"
else
    echo -e "${YELLOW}⚠️  Alguns arquivos tiveram problemas.${NC}"
    echo "Revise manualmente os arquivos marcados com ✗"
    echo ""
    echo "Backups disponíveis em: *.backup"
fi

echo ""
echo "Concluído!"
