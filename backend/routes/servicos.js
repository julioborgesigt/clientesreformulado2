// backend/routes/servicos.js
const express = require('express');
// Importa a conexão (que já tem .promise() ativado em connection.js)
const db = require('../db/connection');
const { logAction } = require('../utils/actionLog');
const router = express.Router();

// Rota GET / (Convertida)
router.get('/', async (req, res) => { // <-- async
    const userId = req.userData.id; // 🔒 SEGURANÇA: Obtém user_id do JWT
    try {
        // 🔒 SEGURANÇA: Filtra serviços por user_id
        const [results] = await db.query('SELECT id, nome FROM servicos WHERE user_id = ? ORDER BY nome ASC', [userId]); // <-- await
        res.status(200).json(results);
    } catch (err) {
        console.error('Erro ao buscar serviços:', err);
        return res.status(500).json({ error: 'Erro ao buscar serviços.' });
    }
});

// Rota POST / (Convertida)
router.post('/', async (req, res) => { // <-- async
    const userId = req.userData.id; // 🔒 SEGURANÇA: Obtém user_id do JWT
    const { nome } = req.body;
    if (!nome || nome.trim() === '') {
        return res.status(400).json({ error: 'O nome do serviço não pode estar vazio.' });
    }
    try {
        // 🔒 SEGURANÇA: Inclui user_id ao criar serviço
        const [results] = await db.query('INSERT INTO servicos (nome, user_id) VALUES (?, ?)', [nome.trim(), userId]); // <-- await
        // Opcional: await logAction('CREATE_SERVICE', null, `Serviço "${nome.trim()}" criado.`, userId);
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
    const userId = req.userData.id; // 🔒 SEGURANÇA: Obtém user_id do JWT
    const serviceId = req.params.id;
    if (!serviceId || isNaN(parseInt(serviceId))) {
        return res.status(400).json({ error: 'ID do serviço inválido.' });
    }
    try {
        // 🔒 SEGURANÇA: Buscar nome verificando user_id
        const [serviceData] = await db.query('SELECT nome FROM servicos WHERE id = ? AND user_id = ?', [serviceId, userId]);
        if (serviceData.length === 0) {
            return res.status(404).json({ error: 'Serviço não encontrado para excluir.' });
        }
        const serviceName = serviceData[0].nome;

        // 🔒 SEGURANÇA: Verificação de uso apenas nos clientes do usuário
        const [usageCheck] = await db.query('SELECT COUNT(*) as count FROM clientes WHERE servico = ? AND user_id = ?', [serviceName, userId]);
        if (usageCheck[0].count > 0) {
             console.warn(`Tentativa de excluir serviço "${serviceName}" em uso por ${usageCheck[0].count} cliente(s).`);
             return res.status(409).json({
                 error: `O serviço "${serviceName}" está em uso por ${usageCheck[0].count} cliente(s) e não pode ser excluído.`
             });
        }
        // --- FIM DA VERIFICAÇÃO ---

        // 🔒 SEGURANÇA: Excluir o serviço verificando user_id
        const [result] = await db.query('DELETE FROM servicos WHERE id = ? AND user_id = ?', [serviceId, userId]);
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
    const userId = req.userData.id; // 🔒 SEGURANÇA: Obtém user_id do JWT
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
        // 🔒 SEGURANÇA: Buscar nome antigo verificando user_id
        const [oldData] = await db.query('SELECT nome FROM servicos WHERE id = ? AND user_id = ?', [serviceId, userId]);
        if (oldData.length === 0) {
             return res.status(404).json({ error: 'Serviço não encontrado para editar.' });
        }
        const oldName = oldData[0].nome;

        // 🔒 SEGURANÇA: Atualizar o nome na tabela 'servicos' verificando user_id
        const [updateResult] = await db.query('UPDATE servicos SET nome = ? WHERE id = ? AND user_id = ?', [nome.trim(), serviceId, userId]);

        // Verifica se a atualização foi bem sucedida
        if (updateResult.affectedRows === 0) {
             // Isso pode acontecer se o ID não existir, embora já tenhamos verificado
             return res.status(404).json({ error: 'Serviço não encontrado durante a atualização.' });
        }

        // 🔒 SEGURANÇA: Atualizar o nome na tabela 'clientes' apenas para os clientes do usuário
        await db.query('UPDATE clientes SET servico = ? WHERE servico = ? AND user_id = ?', [nome.trim(), oldName, userId]);

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