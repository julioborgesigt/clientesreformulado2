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
router.delete('/:id', async (req, res) => { // <-- async
    const serviceId = req.params.id;
    if (!serviceId || isNaN(parseInt(serviceId))) {
        return res.status(400).json({ error: 'ID do serviço inválido.' });
    }
    try {
         // Opcional: Buscar nome antes de deletar para log
         const [serviceData] = await db.query('SELECT nome FROM servicos WHERE id = ?', [serviceId]);
         const serviceName = serviceData.length > 0 ? serviceData[0].nome : `ID ${serviceId}`;

        const [result] = await db.query('DELETE FROM servicos WHERE id = ?', [serviceId]); // <-- await
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Serviço não encontrado.' });
        }
         // Opcional: await logAction('DELETE_SERVICE', null, `Serviço "${serviceName}" excluído.`);
        res.status(200).json({ message: 'Serviço excluído com sucesso!' });
    } catch (err) {
        // Adicionar verificação de erro de chave estrangeira (se serviço estiver em uso)
        if (err.code === 'ER_ROW_IS_REFERENCED_2') { // Código comum para FK constraint fail
             console.warn(`Tentativa de excluir serviço em uso: ID ${serviceId}`);
             return res.status(409).json({ error: 'Este serviço está em uso por um ou mais clientes e não pode ser excluído.' });
        }
        console.error('Erro ao excluir serviço:', err);
        return res.status(500).json({ error: 'Erro ao excluir serviço.' });
    }
});

module.exports = router;