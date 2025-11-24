// backend/scripts/generateHash.js
// Gera hash bcrypt de uma senha para uso manual
// Uso: node backend/scripts/generateHash.js MinhaSenh@123

const bcrypt = require('bcryptjs');

const senha = process.argv[2];

if (!senha) {
    console.error('\n❌ Erro: Forneça uma senha!');
    console.log('\n📖 Uso: node backend/scripts/generateHash.js <senha>\n');
    console.log('📝 Exemplo: node backend/scripts/generateHash.js MinhaSenh@123\n');
    process.exit(1);
}

console.log('\n🔐 Gerando hash bcrypt...\n');
console.log(`📝 Senha: ${'*'.repeat(senha.length)}`);

bcrypt.hash(senha, 10, (err, hash) => {
    if (err) {
        console.error('\n❌ Erro ao gerar hash:', err);
        process.exit(1);
    }

    console.log(`\n✅ Hash gerado com sucesso!\n`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log(hash);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📋 Agora você pode usar este hash no banco de dados:\n');
    console.log('UPDATE users SET password = \'' + hash + '\' WHERE email = \'usuario@exemplo.com\';');
    console.log('\n');
});
