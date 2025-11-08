#!/bin/bash
# Script de Deploy para Backend - clientesreformulado2

echo "🚀 Iniciando deploy do backend..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se estamos na branch correta
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Branch atual: ${CURRENT_BRANCH}${NC}"

if [ "$CURRENT_BRANCH" != "claude/code-review-audit-011CUvzKWQsD8TKUxJ2o5iZf" ]; then
    echo -e "${RED}❌ Erro: Você precisa estar na branch claude/code-review-audit-011CUvzKWQsD8TKUxJ2o5iZf${NC}"
    echo "Execute: git checkout claude/code-review-audit-011CUvzKWQsD8TKUxJ2o5iZf"
    exit 1
fi

# Mostrar últimos commits
echo -e "\n${YELLOW}📝 Últimos commits a serem deployados:${NC}"
git log --oneline -5

echo -e "\n${YELLOW}⚠️  ATENÇÃO: Você vai fazer deploy dos seguintes commits:${NC}"
echo "- feat: Adiciona suporte CORS para múltiplas origens"
echo "- fix: Torna configuração CSRF mais resiliente em produção"
echo "- feat: Implementa renovação automática de tokens no frontend"
echo "- test: Expande cobertura de testes"

echo -e "\n${YELLOW}📋 Instruções para deploy no DomCloud:${NC}"
echo ""
echo "1. Acesse o servidor via SSH:"
echo "   ssh SEU_USUARIO@clientes.domcloud.dev"
echo ""
echo "2. Navegue até o diretório:"
echo "   cd domains/clientes.domcloud.dev/public_html"
echo ""
echo "3. Faça backup do código atual (opcional mas recomendado):"
echo "   cp -r backend backend.backup-$(date +%Y%m%d)"
echo ""
echo "4. Faça pull das alterações:"
echo "   git fetch origin"
echo "   git checkout claude/code-review-audit-011CUvzKWQsD8TKUxJ2o5iZf"
echo "   git pull origin claude/code-review-audit-011CUvzKWQsD8TKUxJ2o5iZf"
echo ""
echo "5. Instale dependências (se necessário):"
echo "   npm install"
echo ""
echo "6. Reinicie o servidor:"
echo "   pm2 restart all"
echo ""
echo "7. Verifique se está funcionando:"
echo "   pm2 status"
echo "   pm2 logs --lines 50"
echo ""
echo "8. Teste o endpoint CSRF:"
echo "   curl https://clientes.domcloud.dev/api/csrf-token"
echo "   # Deve retornar: {\"csrfToken\":\"...\"}"
echo ""

echo -e "${GREEN}✅ Após o deploy, o backend vai:${NC}"
echo "   ✓ Permitir CORS do frontend Vue"
echo "   ✓ Retornar CSRF token sem erro 500"
echo "   ✓ Aceitar login do Vue frontend"
echo ""

# Oferecer criar script de deploy remoto
read -p "Deseja que eu crie um script de deploy SSH automatizado? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo -e "\n${YELLOW}📝 Criando script de deploy SSH...${NC}"

    cat > deploy-ssh.sh << 'EOF'
#!/bin/bash
# Deploy via SSH para DomCloud

SSH_USER="$1"
if [ -z "$SSH_USER" ]; then
    echo "Uso: ./deploy-ssh.sh SEU_USUARIO"
    exit 1
fi

ssh ${SSH_USER}@clientes.domcloud.dev << 'ENDSSH'
cd domains/clientes.domcloud.dev/public_html
echo "📥 Fazendo backup..."
cp -r backend backend.backup-$(date +%Y%m%d-%H%M%S)
echo "📥 Baixando atualizações..."
git fetch origin
git checkout claude/code-review-audit-011CUvzKWQsD8TKUxJ2o5iZf
git pull origin claude/code-review-audit-011CUvzKWQsD8TKUxJ2o5iZf
echo "📦 Instalando dependências..."
npm install
echo "🔄 Reiniciando servidor..."
pm2 restart all
echo "✅ Deploy concluído!"
pm2 status
ENDSSH
EOF

    chmod +x deploy-ssh.sh
    echo -e "${GREEN}✅ Script criado: deploy-ssh.sh${NC}"
    echo "Execute: ./deploy-ssh.sh SEU_USUARIO"
fi

echo -e "\n${GREEN}📌 Deploy preparado!${NC}"
