// backend/scripts/resetPassword.js
// Script para resetar senha de usuário diretamente no banco de dados
// Uso: node backend/scripts/resetPassword.js email@exemplo.com NovaSenha123!

const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const path = require('path');
const dotenv = require('dotenv');

// Carrega variáveis de ambiente
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

async function resetPassword() {
    // Verifica argumentos
    const args = process.argv.slice(2);

    if (args.length !== 2) {
        console.error('\n❌ Uso incorreto!');
        console.log('\n📖 Uso correto:');
        console.log('   node backend/scripts/resetPassword.js <email> <nova-senha>\n');
        console.log('📝 Exemplo:');
        console.log('   node backend/scripts/resetPassword.js usuario@exemplo.com NovaSenha123!\n');
        process.exit(1);
    }

    const [email, newPassword] = args;

    console.log('\n🔐 Iniciando reset de senha...\n');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Nova senha: ${'*'.repeat(newPassword.length)}\n`);

    try {
        // 1. Verifica se usuário existe
        const [users] = await db.query(
            'SELECT id, email FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            console.error(`❌ Erro: Usuário com email "${email}" não encontrado!\n`);
            process.exit(1);
        }

        const user = users[0];
        console.log(`✅ Usuário encontrado: ID ${user.id}\n`);

        // 2. Gera hash da nova senha (10 rounds = mesmo do sistema)
        console.log('🔄 Gerando hash da nova senha...');
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        console.log(`✅ Hash gerado: ${hashedPassword.substring(0, 20)}...\n`);

        // 3. Atualiza senha no banco
        console.log('💾 Atualizando senha no banco de dados...');
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, user.id]
        );
        console.log('✅ Senha atualizada no banco!\n');

        // 4. Revoga todos os refresh tokens (segurança)
        console.log('🔒 Revogando todos os tokens de acesso...');
        await db.query(
            'DELETE FROM refresh_tokens WHERE user_id = ?',
            [user.id]
        );
        console.log('✅ Tokens revogados!\n');

        console.log('════════════════════════════════════════');
        console.log('✅ SENHA RESETADA COM SUCESSO!');
        console.log('════════════════════════════════════════');
        console.log(`\n📧 Email: ${email}`);
        console.log(`🔑 Nova senha: ${newPassword}`);
        console.log('\n⚠️  IMPORTANTE:');
        console.log('   - O usuário foi desconectado de todos os dispositivos');
        console.log('   - Ele precisará fazer login novamente');
        console.log('   - Recomende que ele altere a senha após o primeiro login\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERRO ao resetar senha:', error.message);
        console.error('\n🔍 Detalhes:', error);
        process.exit(1);
    }
}

// Executa o script
resetPassword();
