const express = require('express');
const db = require('../db/connection'); 
const router = express.Router();



// Função helper para registrar logs
async function logAction(actionType, clientId = null, details = null, userId = null, revertable = false, originalData = null) {
  try {
    const query = `
      INSERT INTO action_log (action_type, client_id, details, user_id, revertable, original_data) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    // Convert originalData para JSON string se não for null
    const originalDataJson = originalData ? JSON.stringify(originalData) : null;
    await db.query(query, [actionType, clientId, details, userId, revertable, originalDataJson]);
    console.log(`Ação registrada: ${actionType} - Cliente ID: ${clientId}`);
  } catch (error) {
    console.error('Erro ao registrar ação no log:', error);
    // Não paramos a execução principal se o log falhar, mas registramos o erro
  }
}

// Rota para adicionar cliente (MODIFICADA PARA LOG)
router.post('/add', async (req, res) => { // <--- async
    const { name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo } = req.body;
    const valorCobrado = valor_cobrado ? parseFloat(valor_cobrado) : 15.00;
    const custoValor = custo ? parseFloat(custo) : 6.00;

    try {
        const [results] = await db.query( // <--- await e [results]
            'INSERT INTO clientes (name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, vencimento, servico, whatsapp, observacoes, valorCobrado, custoValor]
        );
        const newClientId = results.insertId;
        // Log da ação
        await logAction('CREATE_CLIENT', newClientId, `Cliente "${name}" criado.`); 
        res.status(201).json({ message: 'Cliente adicionado com sucesso!' });
    } catch (err) {
        console.error('Erro ao adicionar cliente:', err);
        res.status(500).json({ error: 'Erro ao adicionar cliente' });
    }
});


// Rota para deletar cliente (MODIFICADA PARA LOG)
router.delete('/delete/:id', async (req, res) => { // <--- async
    const { id } = req.params;
    try {
        // 1. Buscar dados do cliente ANTES de deletar (para log e possível reversão)
        const [clientData] = await db.query('SELECT * FROM clientes WHERE id = ?', [id]);
        if (clientData.length === 0) {
          return res.status(404).json({ error: 'Cliente não encontrado para exclusão.' });
        }
        const originalClient = clientData[0];

        // 2. Deletar o cliente
        await db.query('DELETE FROM clientes WHERE id = ?', [id]);

        // 3. Logar a ação com os dados originais
        await logAction(
          'DELETE_CLIENT', 
          id, 
          `Cliente "${originalClient.name}" (ID: ${id}) excluído.`,
          null, // userId (se tiver)
          true, // Marcamos como revertível
          originalClient // Guardamos os dados originais
        ); 
        res.status(200).json({ message: 'Cliente excluído com sucesso!' });
    } catch (err) {
        console.error('Erro ao excluir cliente:', err);
        res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
});


// Rota para atualizar cliente (MODIFICADA PARA LOG)
router.put('/update/:id', async (req, res) => { // <--- async
    const clientId = req.params.id;
    const { name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo } = req.body;

    try {
        // 1. Buscar dados atuais ANTES de atualizar
        const [currentData] = await db.query('SELECT * FROM clientes WHERE id = ?', [clientId]);
        if (currentData.length === 0) {
          return res.status(404).json({ error: 'Cliente não encontrado para atualização.' });
        }
        const originalClient = currentData[0];

        // 2. Montar a query de atualização
        const query = `
            UPDATE clientes 
            SET name = ?, vencimento = ?, servico = ?, whatsapp = ?, observacoes = ?, valor_cobrado = ?, custo = ?
            WHERE id = ?
        `;
        // Garantir que a data esteja no formato correto YYYY-MM-DD
        const formattedVencimento = vencimento ? new Date(vencimento).toISOString().split('T')[0] : null;

        // 3. Executar a atualização
        await db.query(query, [name, formattedVencimento, servico, whatsapp, observacoes, valor_cobrado, custo, clientId]);

        // 4. Montar detalhes do log (quais campos mudaram)
        let details = `Cliente "${name}" (ID: ${clientId}) atualizado.`;
        const changes = [];
        if (originalClient.name !== name) changes.push(`Nome: '${originalClient.name}' -> '${name}'`);
        // Compare apenas a parte da data YYYY-MM-DD
        const originalVencimento = originalClient.vencimento ? new Date(originalClient.vencimento).toISOString().split('T')[0] : null;
        if (originalVencimento !== formattedVencimento) changes.push(`Vencimento: '${originalVencimento}' -> '${formattedVencimento}'`);
        if (originalClient.servico !== servico) changes.push(`Serviço: '${originalClient.servico}' -> '${servico}'`);
        // Adicionar comparações para outros campos (whatsapp, valor, custo, obs) se desejar log detalhado
        if (changes.length > 0) {
          details += ` Mudanças: ${changes.join(', ')}.`;
        }

        // 5. Logar a ação com dados originais
        await logAction(
          'UPDATE_CLIENT', 
          clientId, 
          details,
          null, // userId
          true, // Marcamos como revertível
          originalClient // Dados originais
        ); 
        res.status(200).json({ message: 'Cliente atualizado com sucesso!' });
    } catch (err) {
        console.error('Erro ao atualizar cliente:', err);
        res.status(500).json({ error: 'Erro ao atualizar cliente.' });
    }
});




// Em backend/routes/clientes.js

// Rota para marcar status (MODIFICADA PARA LOG)
// Função genérica para evitar repetição
async function updateClientStatusAndLog(req, res, status, actionType, logDetails) {
  const { id } = req.params;
  try {
    // 1. Buscar dados atuais
     const [currentData] = await db.query('SELECT status, name FROM clientes WHERE id = ?', [id]);
     if (currentData.length === 0) {
       return res.status(404).json({ error: 'Cliente não encontrado.' });
     }
     const originalStatus = currentData[0].status;
     const clientName = currentData[0].name;

     // Evita update desnecessário e log repetido
     if (originalStatus === status) {
        return res.status(200).json({ message: `Cliente já está com status "${status}".` });
     }

    // 2. Atualizar status
    await db.query('UPDATE clientes SET status = ? WHERE id = ?', [status, id]);

    // 3. Logar a ação
    const details = logDetails ? logDetails(clientName, id, originalStatus, status) : `Status do cliente "${clientName}" (ID: ${id}) alterado para "${status}".`;
    await logAction(
      actionType, 
      id, 
      details,
      null, // userId
      true, // Status change is revertable
      { status: originalStatus } // Guardamos apenas o status original
    ); 
    res.status(200).json({ message: `Status do cliente atualizado para "${status}".` });
  } catch (err) {
    console.error(`Erro ao marcar status como ${status}:`, err);
    res.status(500).json({ error: `Erro ao marcar status como ${status}` });
  }
}

router.put('/mark-pending/:id', (req, res) => {
    updateClientStatusAndLog(req, res, 'Não pagou', 'CHANGE_STATUS', 
      (name, id, old, newStatus) => `Status do cliente "${name}" (ID: ${id}) alterado de "${old}" para "${newStatus}".`);
});

router.put('/mark-paid/:id', (req, res) => {
    updateClientStatusAndLog(req, res, 'cobrança feita', 'CHANGE_STATUS',
      (name, id, old, newStatus) => `Status do cliente "${name}" (ID: ${id}) alterado de "${old}" para "${newStatus}".`);
});

router.put('/mark-in-day/:id', (req, res) => {
    updateClientStatusAndLog(req, res, 'Pag. em dias', 'CHANGE_STATUS',
      (name, id, old, newStatus) => `Status do cliente "${name}" (ID: ${id}) alterado de "${old}" para "${newStatus}".`);
});


// Em backend/routes/clientes.js

router.get('/list', (req, res) => {
    // 1. Obter parâmetros da URL (com valores padrão)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Limite de 20 por página
    const status = req.query.status || ''; // 'vencidos', 'vence3', 'emdias', 'totalClientes'
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    // 2. Definir datas para os filtros de status
    const today = new Date().toISOString().split('T')[0];
    const threeDays = new Date();
    threeDays.setDate(threeDays.getDate() + 3);
    const threeDaysLater = threeDays.toISOString().split('T')[0];

    // 3. Construir a query SQL dinamicamente (para segurança)
    let whereClauses = [];
    let params = [];

    // Adiciona filtro de PESQUISA (search)
    if (search) {
        whereClauses.push('name LIKE ?');
        params.push(`%${search}%`);
    }

    // Adiciona filtro de STATUS (vencidos, vence3, emdias)
    if (status === 'vencidos') {
        whereClauses.push('vencimento < ?');
        params.push(today);
    } else if (status === 'vence3') {
        whereClauses.push('vencimento >= ? AND vencimento <= ?');
        params.push(today, threeDaysLater);
    } else if (status === 'emdias') {
        whereClauses.push('vencimento > ?');
        params.push(threeDaysLater);
    }
    // Se status for 'totalClientes' ou vazio, nenhum filtro de data é adicionado

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 4. Criar as duas queries: uma para os DADOS (com limite) e outra para a CONTAGEM TOTAL
    const dataQuery = `
        SELECT * FROM clientes 
        ${whereString} 
        ORDER BY vencimento ASC 
        LIMIT ? OFFSET ?
    `;
    // Adiciona os parâmetros de paginação ao final
    const dataParams = [...params, limit, offset];

    const countQuery = `SELECT COUNT(*) as totalCount FROM clientes ${whereString}`;
    const countParams = [...params]; // Mesmos parâmetros, mas sem LIMIT/OFFSET

    // 5. Executar as queries
    // Primeiro, obtemos a contagem total
    db.query(countQuery, countParams, (err, countResults) => {
        if (err) {
            console.error('Erro ao contar clientes:', err);
            return res.status(500).json({ error: 'Erro ao contar clientes.' });
        }

        const totalCount = countResults[0].totalCount;

        // Segundo, obtemos os dados da página atual
        db.query(dataQuery, dataParams, (err, dataResults) => {
            if (err) {
                console.error('Erro ao listar clientes:', err);
                return res.status(500).json({ error: 'Erro ao listar clientes.' });
            }

            // Formata a data (como você já fazia)
            const formattedResults = dataResults.map(cliente => ({
                ...cliente,
                vencimento: cliente.vencimento.toISOString().split('T')[0]
            }));
            
            // 6. Enviar a resposta completa para o frontend
            res.status(200).json({
                total: totalCount,      // Total de itens (para calcular as páginas)
                page: page,
                limit: limit,
                data: formattedResults  // Os dados da página atual
            });
        });
    });
});

// Rota para buscar clientes com vencimento próximo
router.get('/alerts', (req, res) => {
    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    db.query(
        'SELECT * FROM clientes WHERE vencimento BETWEEN ? AND ?',
        [today.toISOString().slice(0, 10), threeDaysLater.toISOString().slice(0, 10)],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Erro ao buscar alertas' });
            res.status(200).json(results);
        }
    );
});



// Salvar mensagem padrão no banco de dados
router.post('/save-message', (req, res) => {
    const { message } = req.body;

    // Verifica se a mensagem foi recebida
    console.log('Mensagem recebida no servidor:', message);

    if (!message || message.trim() === '') {
        console.log('Mensagem vazia ou inválida.');
        return res.status(400).json({ error: 'A mensagem não pode estar vazia.' });
    }

    db.query(
        'UPDATE config SET whatsapp_message = ? WHERE id = 1',
        [message],
        (err) => {
            if (err) {
                console.error('Erro ao salvar mensagem padrão no banco:', err);
                return res.status(500).json({ error: 'Erro ao salvar mensagem padrão.' });
            }
            console.log('Mensagem padrão salva no banco de dados com sucesso!');
            res.status(200).json({ message: 'Mensagem padrão salva com sucesso!' });
        }
    );
});




// Rota para buscar a mensagem padrão
router.get('/get-message', (req, res) => {
    db.query('SELECT whatsapp_message FROM config WHERE id = 1', (err, results) => {
        if (err) {
            console.error('Erro ao buscar mensagem padrão:', err);
            return res.status(500).json({ error: 'Erro ao buscar mensagem padrão.' });
        }
        res.status(200).json({ message: results[0]?.whatsapp_message || '' });
    });
});


// Rota para buscar a data de vencimento de um cliente pelo ID
router.get('/get-vencimento/:id', (req, res) => {
    const clientId = req.params.id; // Obtém o ID do cliente

    // Consulta ao banco de dados para obter o vencimento do cliente
    db.query('SELECT vencimento FROM clientes WHERE id = ?', [clientId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar data de vencimento:', err);
            return res.status(500).json({ error: 'Erro ao buscar data de vencimento.' });
        }

        // Verifica se encontrou o cliente
        if (results.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }

        // Retorna a data de vencimento
        res.status(200).json({ vencimento: results[0].vencimento });
    });
});


// Rota para ajustar data (MODIFICADA PARA LOG)
router.put('/adjust-date/:id', async (req, res) => { // <--- async
    const { id } = req.params;
    const { value, unit } = req.body; 

    let sqlUnit;
    if (unit === 'DAY') sqlUnit = 'DAY';
    else if (unit === 'MONTH') sqlUnit = 'MONTH';
    else return res.status(400).json({ error: 'Unidade inválida.' });

    try {
        // 1. Buscar data atual e nome
        const [currentData] = await db.query('SELECT vencimento, name FROM clientes WHERE id = ?', [id]);
        if (currentData.length === 0) {
          return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        const originalDate = currentData[0].vencimento ? new Date(currentData[0].vencimento).toISOString().split('T')[0] : null;
        const clientName = currentData[0].name;

        // 2. Atualizar data
        const query = `UPDATE clientes SET vencimento = DATE_ADD(vencimento, INTERVAL ? ${sqlUnit}) WHERE id = ?`;
        await db.query(query, [value, id]);

        // 3. Buscar nova data (para confirmação e log)
        const [newData] = await db.query('SELECT vencimento FROM clientes WHERE id = ?', [id]);
        const newDate = newData[0].vencimento ? new Date(newData[0].vencimento).toISOString().split('T')[0] : null;

        // 4. Logar ação
        const details = `Vencimento do cliente "${clientName}" (ID: ${id}) ajustado em ${value} ${unit}(s). (${originalDate} -> ${newDate})`;
        await logAction(
          'ADJUST_DATE', 
          id, 
          details,
          null, // userId
          true, // Revertable
          { vencimento: originalDate } // Guardamos data original
        ); 
        res.status(200).json({ message: `Data ajustada com sucesso!`, vencimento: newDate });
    } catch (err) {
        console.error('Erro ao ajustar a data:', err);
        res.status(500).json({ error: 'Erro ao ajustar a data.' });
    }
});



// Rota para buscar a MENSAGEM (VENCIDO)
router.get('/get-message-vencido', (req, res) => {
    db.query('SELECT whatsapp_message_vencido FROM config WHERE id = 1', (err, results) => {
        if (err) {
            console.error('Erro ao buscar mensagem (vencido):', err);
            return res.status(500).json({ error: 'Erro ao buscar mensagem (vencido).' });
        }
        res.status(200).json({ message: results[0]?.whatsapp_message_vencido || '' });
    });
});

// Rota para salvar a MENSAGEM (VENCIDO)
router.post('/save-message-vencido', (req, res) => {
    const { message } = req.body;

    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'A mensagem não pode estar vazia.' });
    }

    db.query(
        'UPDATE config SET whatsapp_message_vencido = ? WHERE id = 1',
        [message],
        (err) => {
            if (err) {
                console.error('Erro ao salvar mensagem (vencido):', err);
                return res.status(500).json({ error: 'Erro ao salvar mensagem (vencido).' });
            }
            res.status(200).json({ message: 'Mensagem (Vencido) salva com sucesso!' });
        }
    );
});

// --- NOVA ROTA: Buscar Ações Recentes ---
router.get('/actions/recent', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20; // Pega as últimas 20 por padrão

  try {
    // Busca as ações ordenadas pela mais recente
    // Faz um LEFT JOIN com clientes para pegar o nome (se client_id não for NULL)
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
    const [actions] = await db.query(query, [limit]);
    res.status(200).json(actions);
  } catch (err) {
    console.error('Erro ao buscar ações recentes:', err);
    res.status(500).json({ error: 'Erro ao buscar ações recentes.' });
  }
});
// --- FIM DA NOVA ROTA ---

router.get('/pagamentos/dias', (req, res) => {
    const query = `
      SELECT DAY(vencimento) AS day, COUNT(*) AS count
      FROM clientes
      GROUP BY DAY(vencimento)
      ORDER BY day
    `;
    
    db.query(query, (err, results) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar dados para o gráfico.' });
      
      // Cria um array de 31 posições (dias do mês), iniciando com 0
      const payments = Array(31).fill(0);
      
      // Para cada dia encontrado, atualiza a contagem (ajuste o índice, pois DAY(vencimento) varia de 1 a 31)
      results.forEach(row => {
        payments[row.day - 1] = row.count;
      });
      
      // Cria os rótulos de 1 a 31
      const labels = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
      
      res.status(200).json({ days: labels, payments: payments });
    });
  });

  // --- NOVA ROTA: Estatísticas de Clientes por Serviço ---
router.get('/stats/by-service', (req, res) => {
    const query = `
        SELECT servico, COUNT(*) as count 
        FROM clientes 
        WHERE servico IS NOT NULL AND servico != '' 
        GROUP BY servico 
        ORDER BY count DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao buscar estatísticas por serviço:', err);
            return res.status(500).json({ error: 'Erro ao buscar estatísticas por serviço.' });
        }
        
        // Formata os resultados para Chart.js (labels = nomes, data = contagens)
        const labels = results.map(row => row.servico);
        const data = results.map(row => row.count);

        res.status(200).json({ labels, data });
    });
});
// --- FIM DA NOVA ROTA ---
  
// *** CORREÇÃO: MOVIDO PARA O FINAL DO ARQUIVO ***
module.exports = router;