/**
 * @swagger
 * components:
 *   schemas:
 *     ClientFull:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID do cliente
 *           example: 1
 *         name:
 *           type: string
 *           description: Nome do cliente
 *           minLength: 2
 *           maxLength: 100
 *           example: João Silva
 *         vencimento:
 *           type: string
 *           format: date
 *           description: Data de vencimento
 *           example: 2025-12-31
 *         servico:
 *           type: string
 *           description: Serviço contratado
 *           example: Premium Plus
 *         whatsapp:
 *           type: string
 *           description: Número WhatsApp (10-15 dígitos)
 *           pattern: '^[0-9]{10,15}$'
 *           example: 5511999999999
 *         observacoes:
 *           type: string
 *           description: Observações sobre o cliente
 *           nullable: true
 *           example: Cliente VIP
 *         valor_cobrado:
 *           type: number
 *           format: decimal
 *           description: Valor cobrado
 *           minimum: 0
 *           example: 49.90
 *         custo:
 *           type: number
 *           format: decimal
 *           description: Custo do serviço
 *           minimum: 0
 *           example: 25.00
 *         status:
 *           type: string
 *           enum: ['Não pagou', 'cobrança feita', 'Pag. em dias']
 *           description: Status do pagamento
 *           example: Pag. em dias
 *         arquivado:
 *           type: boolean
 *           description: Se o cliente está arquivado
 *           example: false
 *         user_id:
 *           type: integer
 *           description: ID do usuário proprietário
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *           example: 2025-11-23T10:00:00.000Z
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Data de atualização
 *           example: 2025-11-23T15:30:00.000Z
 *         deleted_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Data de exclusão (soft delete)
 *           example: null
 *
 *     ClientCreate:
 *       type: object
 *       required:
 *         - name
 *         - servico
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: Maria Santos
 *         vencimento:
 *           type: string
 *           format: date
 *           example: 2025-12-15
 *         servico:
 *           type: string
 *           example: Premium Plus
 *         whatsapp:
 *           type: string
 *           pattern: '^[0-9]{10,15}$'
 *           example: 5511988887777
 *         observacoes:
 *           type: string
 *           example: Cliente indicação
 *         valor_cobrado:
 *           type: number
 *           minimum: 0
 *           example: 39.90
 *         custo:
 *           type: number
 *           minimum: 0
 *           example: 20.00
 *
 *     ClientUpdate:
 *       type: object
 *       required:
 *         - name
 *         - servico
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: Maria Santos Silva
 *         vencimento:
 *           type: string
 *           format: date
 *           example: 2025-12-20
 *         servico:
 *           type: string
 *           example: Premium Plus
 *         whatsapp:
 *           type: string
 *           example: 5511988887777
 *         observacoes:
 *           type: string
 *           example: Cliente VIP - indicação premium
 *         valor_cobrado:
 *           type: number
 *           minimum: 0
 *           example: 49.90
 *         custo:
 *           type: number
 *           minimum: 0
 *           example: 25.00
 *
 *     PaginatedClients:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total de clientes (considerando filtros)
 *           example: 150
 *         page:
 *           type: integer
 *           description: Página atual
 *           example: 1
 *         limit:
 *           type: integer
 *           description: Itens por página
 *           example: 20
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ClientFull'
 *
 *     DashboardStats:
 *       type: object
 *       properties:
 *         custoTotal:
 *           type: number
 *           description: Custo total de todos os serviços
 *           example: 5000.00
 *         valorApurado:
 *           type: number
 *           description: Valor total apurado (exceto não pagos)
 *           example: 8000.00
 *         lucro:
 *           type: number
 *           description: Lucro (valorApurado - custoTotal)
 *           example: 3000.00
 *         previsto:
 *           type: number
 *           description: Valor previsto para o mês atual
 *           example: 2500.00
 *         totalClientes:
 *           type: integer
 *           description: Total de clientes ativos
 *           example: 150
 *         vencidos:
 *           type: integer
 *           description: Clientes com vencimento atrasado
 *           example: 10
 *         vence3:
 *           type: integer
 *           description: Clientes que vencem nos próximos 3 dias
 *           example: 5
 *         emdias:
 *           type: integer
 *           description: Clientes com pagamento em dia
 *           example: 135
 *
 *     ActionLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         action_type:
 *           type: string
 *           enum: ['CREATE_CLIENT', 'UPDATE_CLIENT', 'DELETE_CLIENT', 'CHANGE_STATUS', 'ADJUST_DATE', 'ARCHIVE_CLIENT', 'UNARCHIVE_CLIENT', 'REVERT_ACTION']
 *           example: UPDATE_CLIENT
 *         client_id:
 *           type: integer
 *           nullable: true
 *           example: 42
 *         client_name:
 *           type: string
 *           nullable: true
 *           description: Nome do cliente (JOIN)
 *           example: João Silva
 *         details:
 *           type: string
 *           example: 'Cliente "João Silva" (ID: 42) atualizado.'
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: 2025-11-23T15:30:00.000Z
 *         revertable:
 *           type: boolean
 *           description: Se a ação pode ser revertida
 *           example: true
 *         reverted:
 *           type: boolean
 *           description: Se a ação já foi revertida
 *           example: false
 *         user_id:
 *           type: integer
 *           example: 1
 *
 *     MessageConfig:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Mensagem de cobrança
 *           example: Olá! Estou passando pra lembrar que seu vencimento está próximo...
 *
 *     PaymentsByDay:
 *       type: object
 *       properties:
 *         days:
 *           type: array
 *           description: Dias do mês (1-31)
 *           items:
 *             type: string
 *           example: ['1', '2', '3', '...', '31']
 *         payments:
 *           type: array
 *           description: Quantidade de pagamentos por dia
 *           items:
 *             type: integer
 *           example: [5, 3, 8, 2, 0, 0, 4]
 *
 *     StatsByService:
 *       type: object
 *       properties:
 *         labels:
 *           type: array
 *           description: Nomes dos serviços
 *           items:
 *             type: string
 *           example: ['Premium Plus', 'Basic', 'Standard']
 *         data:
 *           type: array
 *           description: Quantidade de clientes por serviço
 *           items:
 *             type: integer
 *           example: [50, 30, 70]
 *
 *     AdjustDateRequest:
 *       type: object
 *       required:
 *         - value
 *         - unit
 *       properties:
 *         value:
 *           type: integer
 *           description: Quantidade (positivo adiciona, negativo remove)
 *           example: 1
 *         unit:
 *           type: string
 *           enum: ['DAY', 'MONTH']
 *           description: Unidade de tempo
 *           example: MONTH
 */

/**
 * @swagger
 * /clientes/add:
 *   post:
 *     summary: Adicionar novo cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientCreate'
 *     responses:
 *       201:
 *         description: Cliente adicionado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cliente adicionado com sucesso!
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno
 */

/**
 * @swagger
 * /clientes/list:
 *   get:
 *     summary: Listar clientes com paginação e filtros
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Itens por página (-1 para todos)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ['vencidos', 'vence3', 'emdias']
 *         description: Filtrar por status de vencimento
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nome do cliente
 *       - in: query
 *         name: showArchived
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Mostrar apenas clientes arquivados
 *     responses:
 *       200:
 *         description: Lista de clientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedClients'
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao listar clientes
 */

/**
 * @swagger
 * /clientes/update/{id}:
 *   put:
 *     summary: Atualizar dados do cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientUpdate'
 *     responses:
 *       200:
 *         description: Cliente atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cliente atualizado com sucesso!
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Cliente não encontrado
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao atualizar cliente
 */

/**
 * @swagger
 * /clientes/delete/{id}:
 *   delete:
 *     summary: Excluir cliente (soft delete)
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Cliente excluído com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cliente excluído com sucesso!
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Cliente não encontrado
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao excluir cliente
 */

/**
 * @swagger
 * /clientes/mark-pending/{id}:
 *   put:
 *     summary: Marcar cliente como "Não pagou"
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Status atualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Status do cliente atualizado para "Não pagou".
 *       404:
 *         description: Cliente não encontrado
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /clientes/mark-paid/{id}:
 *   put:
 *     summary: Marcar cliente como "cobrança feita"
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Status atualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Status do cliente atualizado para "cobrança feita".
 *       404:
 *         description: Cliente não encontrado
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /clientes/mark-in-day/{id}:
 *   put:
 *     summary: Marcar cliente como "Pag. em dias"
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Status atualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Status do cliente atualizado para "Pag. em dias".
 *       404:
 *         description: Cliente não encontrado
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /clientes/adjust-date/{id}:
 *   put:
 *     summary: Ajustar data de vencimento
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Adiciona ou remove dias/meses da data de vencimento.
 *       Se adicionar 1 mês ou mais, o status muda automaticamente para "Pag. em dias".
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdjustDateRequest'
 *     responses:
 *       200:
 *         description: Data ajustada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Data ajustada com sucesso! Status atualizado para "Pag. em dias".
 *                 vencimento:
 *                   type: string
 *                   format: date
 *                   example: 2025-12-31
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Cliente não encontrado
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /clientes/archive/{id}:
 *   put:
 *     summary: Arquivar cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Cliente arquivado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cliente arquivado com sucesso
 *                 cliente:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     arquivado:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Cliente já está arquivado
 *       404:
 *         description: Cliente não encontrado
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /clientes/unarchive/{id}:
 *   put:
 *     summary: Desarquivar cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Cliente desarquivado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cliente desarquivado com sucesso
 *                 cliente:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     arquivado:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Cliente não está arquivado
 *       404:
 *         description: Cliente não encontrado
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /clientes/save-message:
 *   post:
 *     summary: Salvar mensagem padrão de cobrança
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Atualiza a mensagem padrão enviada aos clientes com vencimento próximo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: Olá! Estou passando pra lembrar que seu vencimento está próximo...
 *     responses:
 *       200:
 *         description: Mensagem salva com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mensagem padrão salva com sucesso!
 *       400:
 *         description: Mensagem vazia
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /clientes/save-message-vencido:
 *   post:
 *     summary: Salvar mensagem de cobrança para vencidos
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Atualiza a mensagem enviada aos clientes com vencimento atrasado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: Olá! Estou passando pra lembrar que o vencimento do seu acesso já passou...
 *     responses:
 *       200:
 *         description: Mensagem salva com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mensagem (Vencido) salva com sucesso!
 *       400:
 *         description: Mensagem vazia
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /clientes/get-message:
 *   get:
 *     summary: Obter mensagem padrão de cobrança
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mensagem padrão
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageConfig'
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao buscar mensagem
 */

/**
 * @swagger
 * /clientes/get-message-vencido:
 *   get:
 *     summary: Obter mensagem de cobrança para vencidos
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mensagem de vencido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageConfig'
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao buscar mensagem
 */

/**
 * @swagger
 * /clientes/get-vencimento/{id}:
 *   get:
 *     summary: Obter data de vencimento de um cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cliente
 *     responses:
 *       200:
 *         description: Data de vencimento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vencimento:
 *                   type: string
 *                   format: date
 *                   example: 2025-12-31
 *       404:
 *         description: Cliente não encontrado
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /clientes/dashboard-stats:
 *   get:
 *     summary: Estatísticas do dashboard
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Retorna estatísticas financeiras e de clientes para o dashboard
 *     responses:
 *       200:
 *         description: Estatísticas calculadas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStats'
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao buscar estatísticas
 */

/**
 * @swagger
 * /clientes/pagamentos/dias:
 *   get:
 *     summary: Gráfico de pagamentos por dia do mês
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Retorna quantidade de pagamentos agrupados por dia (1-31)
 *     responses:
 *       200:
 *         description: Dados para gráfico
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentsByDay'
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao buscar dados
 */

/**
 * @swagger
 * /clientes/stats/by-service:
 *   get:
 *     summary: Estatísticas por serviço
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Retorna quantidade de clientes agrupados por serviço
 *     responses:
 *       200:
 *         description: Estatísticas por serviço
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsByService'
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao buscar estatísticas
 */

/**
 * @swagger
 * /clientes/alerts:
 *   get:
 *     summary: Alertas de vencimento
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Retorna clientes que vencem nos próximos 3 dias
 *     responses:
 *       200:
 *         description: Lista de clientes com vencimento próximo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ClientFull'
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao buscar alertas
 */

/**
 * @swagger
 * /clientes/pending-this-month:
 *   get:
 *     summary: Clientes pendentes do mês atual
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Retorna clientes com vencimento no mês atual (exceto "Não pagou")
 *     responses:
 *       200:
 *         description: Lista de clientes pendentes do mês
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   vencimento:
 *                     type: string
 *                     format: date
 *                   valor_cobrado:
 *                     type: number
 *                   status:
 *                     type: string
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao buscar clientes
 */

/**
 * @swagger
 * /clientes/actions/recent:
 *   get:
 *     summary: Ações recentes do usuário
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: Retorna histórico de ações realizadas (criar, editar, excluir, etc)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Quantidade de ações a retornar
 *     responses:
 *       200:
 *         description: Lista de ações
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ActionLog'
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao buscar ações
 */

/**
 * @swagger
 * /clientes/actions/{logId}/revert:
 *   post:
 *     summary: Reverter uma ação
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Reverte uma ação previamente realizada (se revertível).
 *       Suporta: CREATE_CLIENT, UPDATE_CLIENT, DELETE_CLIENT, CHANGE_STATUS,
 *       ADJUST_DATE, ARCHIVE_CLIENT, UNARCHIVE_CLIENT
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do log da ação
 *     responses:
 *       200:
 *         description: Ação revertida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ação revertida com sucesso!
 *       400:
 *         description: Ação não pode ser revertida ou já foi revertida
 *       404:
 *         description: Ação não encontrada
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao reverter ação
 */

module.exports = {};
