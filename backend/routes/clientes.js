const express = require('express');
const db = require('../db/connection');
const router = express.Router();

// Rota para adicionar cliente (clientes.js)
router.post('/add', (req, res) => {
    const { name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo } = req.body;

    // Se os valores não forem enviados, utiliza os padrões
    const valorCobrado = valor_cobrado ? parseFloat(valor_cobrado) : 15.00;
    const custoValor = custo ? parseFloat(custo) : 6.00;

    db.query(
        'INSERT INTO clientes (name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, vencimento, servico, whatsapp, observacoes, valorCobrado, custoValor],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Erro ao adicionar cliente' });
            res.status(201).json({ message: 'Cliente adicionado com sucesso!' });
        }
    );
});


router.delete('/delete/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM clientes WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao excluir cliente' });
        res.status(200).json({ message: 'Cliente excluído com sucesso!' });
    });
});


router.put('/update/:id', (req, res) => {
    const clientId = req.params.id;
    const { name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo } = req.body;

    const query = `
        UPDATE clientes 
        SET name = ?, vencimento = ?, servico = ?, whatsapp = ?, observacoes = ?, valor_cobrado = ?, custo = ?
        WHERE id = ?
    `;

    db.query(query, [name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo, clientId], (err, result) => {
        if (err) {
            console.error('Erro ao atualizar cliente:', err);
            return res.status(500).json({ error: 'Erro ao atualizar cliente.' });
        }

        res.status(200).json({ message: 'Cliente atualizado com sucesso!' });
    });
});


router.put('/mark-pending/:id', (req, res) => {
    const { id } = req.params;
    db.query('UPDATE clientes SET status = "Não pagou" WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar status' });
        res.status(200).json({ message: 'Cliente marcado como pagamento pendente' });
    });
});


router.put('/mark-paid/:id', (req, res) => {
    const { id } = req.params;
    db.query('UPDATE clientes SET status = "cobrança feita" WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar status' });
        res.status(200).json({ message: 'Cliente marcado como cobrança feita' });
    });
});

// Em backend/routes/clientes.js

router.get('/dashboard-stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const threeDays = new Date();
    threeDays.setDate(threeDays.getDate() + 3);
    const threeDaysLater = threeDays.toISOString().split('T')[0];

    // Para o "Resto(mês)"
    const endOfMonth = new Date(threeDays.getFullYear(), threeDays.getMonth() + 1, 0)
                       .toISOString().split('T')[0];
                       
    // (Ajuste esta lógica de "validClients" conforme sua regra de negócio)
    // Aqui, consideramos "validos" = que vencem a partir de hoje
    const validClientsCondition = `vencimento >= '${today}'`;

    const queries = {
        custoTotal: `SELECT SUM(custo) as total FROM clientes WHERE ${validClientsCondition}`,
        valorApurado: `SELECT SUM(valor_cobrado) as total FROM clientes WHERE ${validClientsCondition}`,
        totalClientes: `SELECT COUNT(*) as total FROM clientes`,
        vencidos: `SELECT COUNT(*) as total FROM clientes WHERE vencimento < '${today}'`,
        vence3: `SELECT COUNT(*) as total FROM clientes WHERE vencimento >= '${today}' AND vencimento <= '${threeDaysLater}'`,
        emdias: `SELECT COUNT(*) as total FROM clientes WHERE vencimento > '${threeDaysLater}'`,
        previsto: `SELECT SUM(valor_cobrado) as total FROM clientes WHERE vencimento >= '${today}' AND vencimento <= '${endOfMonth}'`
    };

    // Executamos todas as queries
    // NOTA: Esta abordagem (múltiplas queries) é simples. 
    // Uma query SQL única com sub-selects seria mais rápida, mas esta é mais fácil de ler.
    
    db.query(Object.values(queries).join(';'), (err, results) => {
        if (err) {
            console.error('Erro ao buscar stats do dashboard:', err);
            return res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
        }
        
        // O driver mysql2 retorna um array de arrays de resultados para múltiplas queries
        const stats = {
            custoTotal: results[0][0].total || 0,
            valorApurado: results[1][0].total || 0,
            lucro: (results[1][0].total || 0) - (results[0][0].total || 0), // Lucro é calculado
            totalClientes: results[2][0].total || 0,
            vencidos: results[3][0].total || 0,
            vence3: results[4][0].total || 0,
            emdias: results[5][0].total || 0,
            previsto: results[6][0].total || 0,
        };
        
        res.status(200).json(stats);
    });
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


router.put('/adjust-date/:id', (req, res) => {
    const { id } = req.params;
    const { value, unit } = req.body; 

    let sqlUnit;
    if (unit === 'DAY') {
        sqlUnit = 'DAY';
    } else if (unit === 'MONTH') {
        sqlUnit = 'MONTH';
    } else {
        return res.status(400).json({ error: 'Unidade inválida. Use DAY ou MONTH.' });
    }

    // A variável sqlUnit é 100% segura pois foi validada
    const query = `UPDATE clientes SET vencimento = DATE_ADD(vencimento, INTERVAL ? ${sqlUnit}) WHERE id = ?`;

    db.query(query, [value, id], (err) => {
        if (err) {
            console.error('Erro ao ajustar a data:', err);
            return res.status(500).json({ error: 'Erro ao ajustar a data.' });
        }
        db.query('SELECT vencimento FROM clientes WHERE id = ?', [id], (err, results) => {
            if (err) return res.status(500).json({ error: 'Erro ao buscar data ajustada.' });
            const formattedDate = results[0].vencimento.toISOString().split('T')[0];
            res.status(200).json({ message: `Data ajustada com sucesso!`, vencimento: formattedDate});
        });
    });
});


router.put('/mark-in-day/:id', (req, res) => {
    const { id } = req.params;

    db.query(
        'UPDATE clientes SET status = "Pag. em dias" WHERE id = ?',
        [id],
        (err) => {
            if (err) {
                console.error('Erro ao atualizar status para em dias:', err);
                return res.status(500).json({ error: 'Erro ao atualizar status para em dias.' });
            }
            res.status(200).json({ message: 'Cliente marcado como em dias com sucesso!' });
        }
    );
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