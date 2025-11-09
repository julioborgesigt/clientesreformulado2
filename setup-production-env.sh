#!/bin/bash

# Script para criar arquivo .env em produção
# Execute este script no servidor de produção

echo "🔧 Configurando ambiente de produção..."

# Gera secrets seguros usando Node.js
echo "🔐 Gerando secrets criptograficamente seguros..."

JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Cria o arquivo .env
cat > .env << EOF
# Configuração do Banco de Dados
DB_HOST=sao.domcloud.co
DB_USER=feriasdriguatu2
DB_PASS=gi7287+_XTLNc7_cXy
DB_NAME=feriasdriguatu2_db
DB_PORT=3306
DB_DIALECT=mysql

# Segurança - JWT
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET

# Segurança - CSRF
CSRF_SECRET=$CSRF_SECRET

# Configuração do Servidor
PORT=3000
NODE_ENV=production

# Frontend URL (para CORS)
FRONTEND_URL=https://clientes.domcloud.dev
EOF

echo "✅ Arquivo .env criado com sucesso!"
echo ""
echo "📝 Conteúdo do .env (secrets ocultos):"
echo "  DB_HOST=sao.domcloud.co"
echo "  DB_USER=feriasdriguatu2"
echo "  DB_PASS=********"
echo "  DB_NAME=feriasdriguatu2_db"
echo "  JWT_SECRET=******** (${#JWT_SECRET} caracteres)"
echo "  JWT_REFRESH_SECRET=******** (${#JWT_REFRESH_SECRET} caracteres)"
echo "  CSRF_SECRET=******** (${#CSRF_SECRET} caracteres)"
echo "  NODE_ENV=production"
echo ""
echo "⚠️  IMPORTANTE: Reinicie o servidor para aplicar as mudanças!"
echo "   Execute: pm2 restart all (ou seu comando de restart)"
