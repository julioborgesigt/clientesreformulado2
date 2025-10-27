// backend/routes/servicos.js
const express = require('express');
// Importa a conexão (que já tem .promise() ativado em connection.js)
const db = require('../db/connection'); 
const router = express.Router();

// Função helper para log (importar ou definir aqui se precisar)
// async function logAction(...) { ... }

// Rota GET / (Convertida)
router.get('/', async (req, res) => { // <-- async
    try {
        const [results] = await db.query('SELECT id, nome FROM servicos ORDER BY nome ASC'); // <-- await
        res.status(200).json(results);
    } catch (err) {
        console.error('Erro ao buscar serviços:', err);
        return res.status(500).json({ error: 'Erro ao buscar serviços.' });
    }
});

// Rota POST / (Convertida)
router.post('/', async (req, res) => { // <-- async
    const { nome } = req.body;
    if (!nome || nome.trim() === '') {
        return res.status(400).json({ error: 'O nome do serviço não pode estar vazio.' });
    }
    try {
        const [results] = await db.query('INSERT INTO servicos (nome) VALUES (?)', [nome.trim()]); // <-- await
        // Opcional: await logAction('CREATE_SERVICE', null, `Serviço "${nome.trim()}" criado.`);
        res.status(201).json({ message: 'Serviço adicionado com sucesso!', id: results.insertId, nome: nome.trim() });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Este serviço já existe.' });
        }
        console.error('Erro ao adicionar serviço:', err);
        return res.status(500).json({ error: 'Erro ao adicionar serviço.' });
    }
});

// Rota DELETE /:id (Convertida)
router.delete('/:id', async (req, res) => {
    const serviceId = req.params.id;
    if (!serviceId || isNaN(parseInt(serviceId))) {
        return res.status(400).json({ error: 'ID do serviço inválido.' });
    }
    try {
        // 1. Buscar nome para log
        const [serviceData] = await db.query('SELECT nome FROM servicos WHERE id = ?', [serviceId]);
        if (serviceData.length === 0) {
            return res.status(404).json({ error: 'Serviço não encontrado para excluir.' });
        }
        const serviceName = serviceData[0].nome;

        // --- VERIFICAÇÃO DE USO ---
        const [usageCheck] = await db.query('SELECT COUNT(*) as count FROM clientes WHERE servico = ?', [serviceName]);
        if (usageCheck[0].count > 0) {
             console.warn(`Tentativa de excluir serviço "${serviceName}" em uso por ${usageCheck[0].count} cliente(s).`);
             return res.status(409).json({ 
                 error: `O serviço "${serviceName}" está em uso por ${usageCheck[0].count} cliente(s) e não pode ser excluído.` 
             });
        }
        // --- FIM DA VERIFICAÇÃO ---

        // 3. Excluir o serviço se não estiver em uso
        const [result] = await db.query('DELETE FROM servicos WHERE id = ?', [serviceId]);
        // Não precisa mais verificar affectedRows aqui pois já verificamos se existe
        
        // 4. Logar a exclusão (opcional)
        // await logAction('DELETE_SERVICE', null, `Serviço "${serviceName}" (ID: ${serviceId}) excluído.`, null, false); // Exclusão talvez não deva ser revertível?

        res.status(200).json({ message: 'Serviço excluído com sucesso!' });

    } catch (err) {
        // O erro ER_ROW_IS_REFERENCED_2 não deve mais ocorrer se a verificação acima funcionar,
        // mas mantemos como fallback.
        if (err.code === 'ER_ROW_IS_REFERENCED_2') { 
             console.warn(`Tentativa de excluir serviço em uso (fallback FK): ID ${serviceId}`);
             return res.status(409).json({ error: 'Este serviço está em uso por um ou mais clientes e não pode ser excluído (FK).' });
        }
        console.error('Erro ao excluir serviço:', err);
        return res.status(500).json({ error: 'Erro interno ao excluir serviço.' });
    }
});

// --- NOVA ROTA: PUT /:id (Editar Serviço) ---
router.put('/:id', async (req, res) => {
    const serviceId = req.params.id;
    const { nome } = req.body;

    // Validações
    if (!serviceId || isNaN(parseInt(serviceId))) {
        return res.status(400).json({ error: 'ID do serviço inválido.' });
    }
    if (!nome || nome.trim() === '') {
        return res.status(400).json({ error: 'O novo nome do serviço não pode estar vazio.' });
    }

    try {
        // 1. Buscar nome antigo para log (opcional)
        const [oldData] = await db.query('SELECT nome FROM servicos WHERE id = ?', [serviceId]);
        if (oldData.length === 0) {
             return res.status(404).json({ error: 'Serviço não encontrado para editar.' });
        }
        const oldName = oldData[0].nome;

        // 2. Atualizar o nome na tabela 'servicos'
        const [updateResult] = await db.query('UPDATE servicos SET nome = ? WHERE id = ?', [nome.trim(), serviceId]);

        // Verifica se a atualização foi bem sucedida
        if (updateResult.affectedRows === 0) {
             // Isso pode acontecer se o ID não existir, embora já tenhamos verificado
             return res.status(404).json({ error: 'Serviço não encontrado durante a atualização.' });
        }
        
        // 3. IMPORTANTE: Atualizar o nome na tabela 'clientes' também!
        // Se você não fizer isso, os clientes antigos continuarão com o nome antigo.
        // CUIDADO: Se muitos clientes usarem o serviço, isso pode ser lento. Indexar clientes.servico ajuda.
        await db.query('UPDATE clientes SET servico = ? WHERE servico = ?', [nome.trim(), oldName]);

        // 4. Logar a ação (opcional)
        const details = `Serviço ID ${serviceId} renomeado de "${oldName}" para "${nome.trim()}". Clientes atualizados.`;
        // await logAction('UPDATE_SERVICE', null, details, null, true, { oldName: oldName }); // Reversão seria complexa
        
        res.status(200).json({ message: 'Serviço atualizado com sucesso!', id: serviceId, nome: nome.trim() });

    } catch (err) {
        // Tratar erro de nome duplicado na atualização
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: `O nome de serviço "${nome.trim()}" já existe.` });
        }
        console.error('Erro ao editar serviço:', err);
        return res.status(500).json({ error: 'Erro interno ao editar serviço.' });
    }
});
// --- FIM DA ROTA PUT ---

module.exports = router;