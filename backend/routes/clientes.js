const express = require('express');
// Importa a conexão (que já tem .promise() ativado em connection.js)
const db = require('../db/connection'); 
const router = express.Router();

// Função helper para registrar logs (sem alterações)
async function logAction(actionType, clientId = null, details = null, userId = null, revertable = false, originalData = null) {
  try {
    const query = `
      INSERT INTO action_log (action_type, client_id, details, user_id, revertable, original_data) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const originalDataJson = originalData ? JSON.stringify(originalData) : null;
    await db.query(query, [actionType, clientId, details, userId, revertable, originalDataJson]);
    console.log(`Ação registrada: ${actionType} - Cliente ID: ${clientId}`);
  } catch (error) {
    console.error('Erro ao registrar ação no log:', error);
  }
}

// --- ROTAS POST, PUT, DELETE (Já estavam corretas com async/await) ---
router.post('/add', async (req, res) => { /* ... seu código async/await ... */ 
    const { name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo } = req.body;
    const valorCobrado = valor_cobrado ? parseFloat(valor_cobrado) : 15.00;
    const custoValor = custo ? parseFloat(custo) : 6.00;
    try {
        const [results] = await db.query(
            'INSERT INTO clientes (name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, vencimento, servico, whatsapp, observacoes, valorCobrado, custoValor]
        );
        const newClientId = results.insertId;
        await logAction('CREATE_CLIENT', newClientId, `Cliente "${name}" criado.`); 
        res.status(201).json({ message: 'Cliente adicionado com sucesso!' });
    } catch (err) {
        console.error('Erro ao adicionar cliente:', err);
        res.status(500).json({ error: 'Erro ao adicionar cliente' });
    }
});
router.delete('/delete/:id', async (req, res) => { /* ... seu código async/await ... */ 
    const { id } = req.params;
    try {
        const [clientData] = await db.query('SELECT * FROM clientes WHERE id = ?', [id]);
        if (clientData.length === 0) {
          return res.status(404).json({ error: 'Cliente não encontrado para exclusão.' });
        }
        const originalClient = clientData[0];
        await db.query('DELETE FROM clientes WHERE id = ?', [id]);
        await logAction('DELETE_CLIENT', id, `Cliente "${originalClient.name}" (ID: ${id}) excluído.`, null, true, originalClient); 
        res.status(200).json({ message: 'Cliente excluído com sucesso!' });
    } catch (err) {
        console.error('Erro ao excluir cliente:', err);
        res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
});
router.put('/update/:id', async (req, res) => { /* ... seu código async/await ... */ 
    const clientId = req.params.id;
    const { name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo } = req.body;
    try {
        const [currentData] = await db.query('SELECT * FROM clientes WHERE id = ?', [clientId]);
        if (currentData.length === 0) {
          return res.status(404).json({ error: 'Cliente não encontrado para atualização.' });
        }
        const originalClient = currentData[0];
        const query = `UPDATE clientes SET name = ?, vencimento = ?, servico = ?, whatsapp = ?, observacoes = ?, valor_cobrado = ?, custo = ? WHERE id = ?`;
        const formattedVencimento = vencimento ? new Date(vencimento).toISOString().split('T')[0] : null;
        await db.query(query, [name, formattedVencimento, servico, whatsapp, observacoes, valor_cobrado, custo, clientId]);
        let details = `Cliente "${name}" (ID: ${clientId}) atualizado.`;
        const changes = [];
        if (originalClient.name !== name) changes.push(`Nome: '${originalClient.name}' -> '${name}'`);
        const originalVencimento = originalClient.vencimento ? new Date(originalClient.vencimento).toISOString().split('T')[0] : null;
        if (originalVencimento !== formattedVencimento) changes.push(`Vencimento: '${originalVencimento}' -> '${formattedVencimento}'`);
        if (originalClient.servico !== servico) changes.push(`Serviço: '${originalClient.servico}' -> '${servico}'`);
        if (changes.length > 0) { details += ` Mudanças: ${changes.join(', ')}.`; }
        await logAction('UPDATE_CLIENT', clientId, details, null, true, originalClient); 
        res.status(200).json({ message: 'Cliente atualizado com sucesso!' });
    } catch (err) {
        console.error('Erro ao atualizar cliente:', err);
        res.status(500).json({ error: 'Erro ao atualizar cliente.' });
    }
});
async function updateClientStatusAndLog(req, res, status, actionType, logDetails) { /* ... seu código async/await ... */ 
  const { id } = req.params;
  try {
     const [currentData] = await db.query('SELECT status, name FROM clientes WHERE id = ?', [id]);
     if (currentData.length === 0) { return res.status(404).json({ error: 'Cliente não encontrado.' }); }
     const originalStatus = currentData[0].status;
     const clientName = currentData[0].name;
     if (originalStatus === status) { return res.status(200).json({ message: `Cliente já está com status "${status}".` }); }
    await db.query('UPDATE clientes SET status = ? WHERE id = ?', [status, id]);
    const details = logDetails ? logDetails(clientName, id, originalStatus, status) : `Status do cliente "${clientName}" (ID: ${id}) alterado para "${status}".`;
    await logAction(actionType, id, details, null, true, { status: originalStatus }); 
    res.status(200).json({ message: `Status do cliente atualizado para "${status}".` });
  } catch (err) {
    console.error(`Erro ao marcar status como ${status}:`, err);
    res.status(500).json({ error: `Erro ao marcar status como ${status}` });
  }
}
router.put('/mark-pending/:id', (req, res) => { updateClientStatusAndLog(req, res, 'Não pagou', 'CHANGE_STATUS', (name, id, old, newStatus) => `Status do cliente "${name}" (ID: ${id}) alterado de "${old}" para "${newStatus}".`); });
router.put('/mark-paid/:id', (req, res) => { updateClientStatusAndLog(req, res, 'cobrança feita', 'CHANGE_STATUS', (name, id, old, newStatus) => `Status do cliente "${name}" (ID: ${id}) alterado de "${old}" para "${newStatus}".`); });
router.put('/mark-in-day/:id', (req, res) => { updateClientStatusAndLog(req, res, 'Pag. em dias', 'CHANGE_STATUS', (name, id, old, newStatus) => `Status do cliente "${name}" (ID: ${id}) alterado de "${old}" para "${newStatus}".`); });
router.put('/adjust-date/:id', async (req, res) => { /* ... seu código async/await ... */ 
    const { id } = req.params;
    const { value, unit } = req.body; 
    let sqlUnit;
    if (unit === 'DAY') sqlUnit = 'DAY'; else if (unit === 'MONTH') sqlUnit = 'MONTH'; else return res.status(400).json({ error: 'Unidade inválida.' });
    try {
        const [currentData] = await db.query('SELECT vencimento, name FROM clientes WHERE id = ?', [id]);
        if (currentData.length === 0) { return res.status(404).json({ error: 'Cliente não encontrado.' }); }
        const originalDate = currentData[0].vencimento ? new Date(currentData[0].vencimento).toISOString().split('T')[0] : null;
        const clientName = currentData[0].name;
        const query = `UPDATE clientes SET vencimento = DATE_ADD(vencimento, INTERVAL ? ${sqlUnit}) WHERE id = ?`;
        await db.query(query, [value, id]);
        const [newData] = await db.query('SELECT vencimento FROM clientes WHERE id = ?', [id]);
        const newDate = newData[0].vencimento ? new Date(newData[0].vencimento).toISOString().split('T')[0] : null;
        const details = `Vencimento do cliente "${clientName}" (ID: ${id}) ajustado em ${value} ${unit}(s). (${originalDate} -> ${newDate})`;
        await logAction('ADJUST_DATE', id, details, null, true, { vencimento: originalDate }); 
        res.status(200).json({ message: `Data ajustada com sucesso!`, vencimento: newDate });
    } catch (err) {
        console.error('Erro ao ajustar a data:', err);
        res.status(500).json({ error: 'Erro ao ajustar a data.' });
    }
});

// Rota POST /save-message (Convertida para async/await)
router.post('/save-message', async (req, res) => { // <-- async
    const { message } = req.body;
    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'A mensagem não pode estar vazia.' });
    }
    try {
        await db.query('UPDATE config SET whatsapp_message = ? WHERE id = 1', [message]); // <-- await
        // Opcional: Adicionar logAction aqui
        await logAction('UPDATE_CONFIG', null, 'Mensagem padrão atualizada.');
        res.status(200).json({ message: 'Mensagem padrão salva com sucesso!' });
    } catch (err) {
        console.error('Erro ao salvar mensagem padrão no banco:', err);
        return res.status(500).json({ error: 'Erro ao salvar mensagem padrão.' });
    }
});

// Rota POST /save-message-vencido (Convertida para async/await)
router.post('/save-message-vencido', async (req, res) => { // <-- async
    const { message } = req.body;
    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'A mensagem não pode estar vazia.' });
    }
    try {
        await db.query('UPDATE config SET whatsapp_message_vencido = ? WHERE id = 1', [message]); // <-- await
        // Opcional: Adicionar logAction aqui
        await logAction('UPDATE_CONFIG', null, 'Mensagem de vencido atualizada.');
        res.status(200).json({ message: 'Mensagem (Vencido) salva com sucesso!' });
    } catch (err) {
        console.error('Erro ao salvar mensagem (vencido):', err);
        return res.status(500).json({ error: 'Erro ao salvar mensagem (vencido).' });
    }
});


// --- ROTAS GET (Convertidas para async/await) ---

// Rota GET /list (Convertida para async/await)
// Rota GET /list (Já estava correta)
router.get('/list', async (req, res) => { /* ... seu código async/await completo para /list ... */ 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit); 
    const effectiveLimit = (!limit || limit === -1 || isNaN(limit)) ? 999999 : limit; 
    const status = req.query.status || ''; 
    const search = req.query.search || '';
    const offset = (page - 1) * effectiveLimit;
    const today = new Date().toISOString().split('T')[0];
    const threeDays = new Date(); threeDays.setDate(threeDays.getDate() + 3);
    const threeDaysLater = threeDays.toISOString().split('T')[0];
    let whereClauses = []; let params = [];
    if (search) { whereClauses.push('name LIKE ?'); params.push(`%${search}%`); }
    if (status === 'vencidos') { whereClauses.push('vencimento < ?'); params.push(today); } 
    else if (status === 'vence3') { whereClauses.push('vencimento >= ? AND vencimento <= ?'); params.push(today, threeDaysLater); } 
    else if (status === 'emdias') { whereClauses.push('vencimento > ?'); params.push(threeDaysLater); }
    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const dataQuery = `SELECT * FROM clientes ${whereString} ORDER BY vencimento ASC LIMIT ? OFFSET ?`;
    const dataParams = [...params, effectiveLimit, offset];
    const countQuery = `SELECT COUNT(*) as totalCount FROM clientes ${whereString}`;
    const countParams = [...params];
    try {
        const [[countResults], [dataResults]] = await Promise.all([ 
            db.query(countQuery, countParams),
            db.query(dataQuery, dataParams)
        ]);
        const totalCount = countResults[0].totalCount;
        const formattedResults = dataResults.map(cliente => ({
            ...cliente,
            vencimento: cliente.vencimento ? new Date(cliente.vencimento).toISOString().split('T')[0] : null 
        }));
        res.status(200).json({ total: totalCount, page: page, limit: limit, data: formattedResults });
    } catch (err) {
        console.error('Erro ao listar clientes:', err);
        return res.status(500).json({ error: 'Erro ao listar clientes.' });
    }
});

// Rota GET /dashboard-stats (Query SQL Restaurada)
router.get('/dashboard-stats', async (req, res) => { 
  const today = new Date().toISOString().slice(0, 10);
  const threeDays = new Date(); threeDays.setDate(threeDays.getDate() + 3);
  const threeDaysLater = threeDays.toISOString().slice(0, 10);

  // --- QUERY SQL COMPLETA RESTAURADA ---
  const query = `
      SELECT
          SUM(custo) as custoTotal,
          SUM(CASE WHEN status = 'Pag. em dias' THEN valor_cobrado ELSE 0 END) as valorApurado,
          SUM(CASE WHEN status = 'Pag. em dias' THEN valor_cobrado - custo ELSE 0 END) as lucro,
          SUM(CASE 
                WHEN 
                    status != 'Pag. em dias' 
                    AND MONTH(vencimento) = MONTH(CURRENT_DATE()) 
                    AND YEAR(vencimento) = YEAR(CURRENT_DATE()) 
                THEN valor_cobrado 
                ELSE 0 
            END) as previsto,
          COUNT(*) as totalClientes,
          SUM(CASE WHEN vencimento < ? THEN 1 ELSE 0 END) as vencidos,
          SUM(CASE WHEN vencimento >= ? AND vencimento <= ? THEN 1 ELSE 0 END) as vence3,
          SUM(CASE WHEN vencimento > ? THEN 1 ELSE 0 END) as emdias
      FROM clientes;
  `;
  // --- FIM DA QUERY ---
  try {
      const [[results]] = await db.query(query, [today, today, threeDaysLater, threeDaysLater]); 
      res.status(200).json(results);
  } catch (err) {
      console.error('Erro ao buscar estatísticas do dashboard:', err);
      res.status(500).json({ error: 'Erro ao buscar estatísticas do dashboard' });
  }
});

// Rota GET /get-message (Convertida)
router.get('/get-message', async (req, res) => { // <-- async
    try {
        const [[results]] = await db.query('SELECT whatsapp_message FROM config WHERE id = 1'); // <-- await
        res.status(200).json({ message: results?.whatsapp_message || '' });
    } catch (err) {
        console.error('Erro ao buscar mensagem padrão:', err);
        return res.status(500).json({ error: 'Erro ao buscar mensagem padrão.' });
    }
});

// Rota GET /get-vencimento/:id (Convertida)
router.get('/get-vencimento/:id', async (req, res) => { // <-- async
    const clientId = req.params.id;
    try {
        const [results] = await db.query('SELECT vencimento FROM clientes WHERE id = ?', [clientId]); // <-- await
        if (results.length === 0) { return res.status(404).json({ error: 'Cliente não encontrado.' }); }
        const formattedDate = results[0].vencimento ? new Date(results[0].vencimento).toISOString().split('T')[0] : null;
        res.status(200).json({ vencimento: formattedDate });
    } catch (err) {
        console.error('Erro ao buscar data de vencimento:', err);
        return res.status(500).json({ error: 'Erro ao buscar data de vencimento.' });
    }
});

// Rota GET /get-message-vencido (Convertida)
router.get('/get-message-vencido', async (req, res) => { // <-- async
    try {
        const [[results]] = await db.query('SELECT whatsapp_message_vencido FROM config WHERE id = 1'); // <-- await
        res.status(200).json({ message: results?.whatsapp_message_vencido || '' });
    } catch (err) {
        console.error('Erro ao buscar mensagem (vencido):', err);
        return res.status(500).json({ error: 'Erro ao buscar mensagem (vencido).' });
    }
});

// Rota GET /pagamentos/dias (Convertida)
router.get('/pagamentos/dias', async (req, res) => { // <-- async
    const query = `
      SELECT DAY(vencimento) AS day, COUNT(*) AS count
      FROM clientes WHERE vencimento IS NOT NULL
      GROUP BY DAY(vencimento) ORDER BY day
    `; // Adicionado WHERE para evitar erro com NULL
    try {
        const [results] = await db.query(query); // <-- await
        const payments = Array(31).fill(0);
        results.forEach(row => { if (row.day >= 1 && row.day <= 31) { payments[row.day - 1] = row.count; } });
        const labels = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
        res.status(200).json({ days: labels, payments: payments });
    } catch (err) {
        console.error('Erro ao buscar dados para o gráfico de pagamentos:', err);
        return res.status(500).json({ error: 'Erro ao buscar dados para o gráfico.' });
    }
});

// Rota GET /stats/by-service (Convertida)
// Rota GET /stats/by-service (Query SQL Restaurada)
router.get('/stats/by-service', async (req, res) => { 
    // --- QUERY SQL COMPLETA RESTAURADA ---
    const query = `
        SELECT servico, COUNT(*) as count 
        FROM clientes 
        WHERE servico IS NOT NULL AND servico != '' 
        GROUP BY servico 
        ORDER BY count DESC
    `;
    // --- FIM DA QUERY ---
    try {
        const [results] = await db.query(query); 
        const labels = results.map(row => row.servico);
        const data = results.map(row => row.count);
        res.status(200).json({ labels, data });
    } catch (err) {
        console.error('Erro ao buscar estatísticas por serviço:', err);
        return res.status(500).json({ error: 'Erro ao buscar estatísticas por serviço.' });
    }
});

// Rota GET /actions/recent (Query SQL Restaurada)
router.get('/actions/recent', async (req, res) => { 
    const limit = parseInt(req.query.limit) || 20; 
    try {
        // --- QUERY SQL COMPLETA RESTAURADA ---
        const query = `
          SELECT 
            log.id, log.action_type, log.client_id, log.details, log.timestamp, 
            log.revertable, log.reverted,
            c.name as client_name 
          FROM action_log log
          LEFT JOIN clientes c ON log.client_id = c.id
          ORDER BY log.timestamp DESC
          LIMIT ?
        `;
        // --- FIM DA QUERY ---
        const [actions] = await db.query(query, [limit]);
        res.status(200).json(actions);
    } catch (err) {
        console.error('Erro ao buscar ações recentes:', err);
        res.status(500).json({ error: 'Erro ao buscar ações recentes.' });
    }
});

// Rota GET /alerts (Convertida)
router.get('/alerts', async (req, res) => { // <-- async
    const today = new Date();
    const threeDaysLater = new Date(today); threeDaysLater.setDate(today.getDate() + 3);
    try {
        const [results] = await db.query( // <-- await
            'SELECT * FROM clientes WHERE vencimento BETWEEN ? AND ?',
            [today.toISOString().slice(0, 10), threeDaysLater.toISOString().slice(0, 10)]
        );
        res.status(200).json(results);
    } catch (err) {
        console.error('Erro ao buscar alertas:', err);
        return res.status(500).json({ error: 'Erro ao buscar alertas' });
    }
});


// --- NOVA ROTA: Reverter Ação ---
router.post('/actions/:logId/revert', async (req, res) => {
    const logId = req.params.logId;
    // const userId = req.userData.userId; // Obter ID do usuário do token (se necessário)

    if (!logId || isNaN(parseInt(logId))) {
        return res.status(400).json({ error: 'ID do log inválido.' });
    }

    try {
        // 1. Buscar a ação original no log
        const [logEntries] = await db.query('SELECT * FROM action_log WHERE id = ?', [logId]);
        if (logEntries.length === 0) {
            return res.status(404).json({ error: 'Ação não encontrada no log.' });
        }
        const logEntry = logEntries[0];

        // 2. Verificar se é revertível e se já não foi revertida
        if (!logEntry.revertable) {
            return res.status(400).json({ error: 'Esta ação não pode ser revertida.' });
        }
        if (logEntry.reverted) {
            return res.status(400).json({ error: 'Esta ação já foi revertida anteriormente.' });
        }

        // 3. Parse dos dados originais (se existirem)
        let originalData = null;
        if (logEntry.original_data) {
            try {
                originalData = JSON.parse(logEntry.original_data);
            } catch (parseError) {
                console.error(`Erro ao parsear original_data para log ID ${logId}:`, parseError);
                return res.status(500).json({ error: 'Erro interno ao processar dados de reversão.' });
            }
        }

        let revertDetails = '';
        let revertSuccess = false;

        // 4. Lógica de Reversão baseada no Tipo de Ação Original
        switch (logEntry.action_type) {
            case 'DELETE_CLIENT':
                if (!originalData) return res.status(500).json({ error: 'Dados originais ausentes para reverter exclusão.' });
                // Re-insere o cliente com os dados originais (exceto o ID que será novo)
                // Atenção: O ID original está em logEntry.client_id, mas não podemos forçar a re-inserção com o mesmo ID
                // A melhor abordagem é criar um novo registro com os dados antigos.
                const insertQuery = `INSERT INTO clientes (name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                // Certifica que a data está no formato correto
                const vencimentoRevert = originalData.vencimento ? new Date(originalData.vencimento).toISOString().split('T')[0] : null;
                await db.query(insertQuery, [
                    originalData.name, vencimentoRevert, originalData.servico, originalData.whatsapp,
                    originalData.observacoes, originalData.valor_cobrado, originalData.custo, originalData.status
                ]);
                // Não sabemos o novo ID aqui facilmente, o log ficará genérico
                revertDetails = `Cliente "${originalData.name}" (original ID: ${logEntry.client_id}) restaurado a partir da exclusão.`;
                revertSuccess = true;
                break;

            case 'UPDATE_CLIENT':
                if (!originalData || !logEntry.client_id) return res.status(500).json({ error: 'Dados originais ou ID do cliente ausentes para reverter atualização.' });
                // Atualiza o cliente de volta para os dados originais
                const updateQuery = `UPDATE clientes SET name = ?, vencimento = ?, servico = ?, whatsapp = ?, observacoes = ?, valor_cobrado = ?, custo = ?, status = ? WHERE id = ?`;
                 const vencimentoRevertUpdate = originalData.vencimento ? new Date(originalData.vencimento).toISOString().split('T')[0] : null;
                await db.query(updateQuery, [
                    originalData.name, vencimentoRevertUpdate, originalData.servico, originalData.whatsapp,
                    originalData.observacoes, originalData.valor_cobrado, originalData.custo, originalData.status,
                    logEntry.client_id // Usa o client_id do log
                ]);
                revertDetails = `Atualização do cliente "${originalData.name}" (ID: ${logEntry.client_id}) revertida.`;
                revertSuccess = true;
                break;

            case 'CHANGE_STATUS':
                if (!originalData || !originalData.status || !logEntry.client_id) return res.status(500).json({ error: 'Dados originais ou ID do cliente ausentes para reverter mudança de status.' });
                // Atualiza o status de volta para o original
                await db.query('UPDATE clientes SET status = ? WHERE id = ?', [originalData.status, logEntry.client_id]);
                revertDetails = `Mudança de status do cliente (ID: ${logEntry.client_id}) revertida para "${originalData.status}".`;
                revertSuccess = true;
                break;

            case 'ADJUST_DATE':
                 if (!originalData || typeof originalData.vencimento === 'undefined' || !logEntry.client_id) return res.status(500).json({ error: 'Dados originais ou ID do cliente ausentes para reverter ajuste de data.' });
                 // Atualiza a data de volta para a original
                 // Certifica que a data original está no formato correto ou NULL
                 const originalVencimentoFormatted = originalData.vencimento ? new Date(originalData.vencimento).toISOString().split('T')[0] : null;
                 await db.query('UPDATE clientes SET vencimento = ? WHERE id = ?', [originalVencimentoFormatted, logEntry.client_id]);
                 revertDetails = `Ajuste de data do cliente (ID: ${logEntry.client_id}) revertido para "${originalVencimentoFormatted}".`;
                 revertSuccess = true;
                 break;
            
            case 'CREATE_CLIENT':
                 if (!logEntry.client_id) return res.status(500).json({ error: 'ID do cliente ausente para reverter criação.' });
                 // Deleta o cliente que foi criado nesta ação
                 await db.query('DELETE FROM clientes WHERE id = ?', [logEntry.client_id]);
                 revertDetails = `Criação do cliente (ID: ${logEntry.client_id}) revertida (cliente excluído).`;
                 revertSuccess = true;
                 // Nota: Se outras ações dependeram deste cliente criado, a reversão pode causar problemas.
                 break;

            default:
                return res.status(400).json({ error: `Tipo de ação "${logEntry.action_type}" não suporta reversão.` });
        }

        // 5. Se a reversão deu certo, marca a ação original como revertida e loga a reversão
        if (revertSuccess) {
            await db.query('UPDATE action_log SET reverted = TRUE WHERE id = ?', [logId]);
            await logAction('REVERT_ACTION', logEntry.client_id, `Ação ID ${logId} (${logEntry.action_type}) foi revertida. ${revertDetails}`, null, false); // Ação de reverter não é revertível
            res.status(200).json({ message: 'Ação revertida com sucesso!' });
        } else {
             // Caso a lógica switch não tenha retornado erro mas não setou revertSuccess (improvável)
             res.status(500).json({ error: 'Falha ao executar a reversão.' });
        }

    } catch (err) {
        console.error(`Erro ao reverter ação ID ${logId}:`, err);
        res.status(500).json({ error: 'Erro interno ao tentar reverter a ação.' });
    }
});
// --- FIM DA NOVA ROTA ---

module.exports = router;