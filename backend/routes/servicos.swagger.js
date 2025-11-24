/**
 * @swagger
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID do serviço
 *           example: 1
 *         nome:
 *           type: string
 *           description: Nome do serviço
 *           minLength: 1
 *           maxLength: 255
 *           example: Premium Plus
 *         user_id:
 *           type: integer
 *           description: ID do usuário proprietário
 *           example: 1
 *
 *     ServiceCreate:
 *       type: object
 *       required:
 *         - nome
 *       properties:
 *         nome:
 *           type: string
 *           description: Nome do serviço
 *           minLength: 1
 *           maxLength: 255
 *           example: Premium Plus
 *
 *     ServiceUpdate:
 *       type: object
 *       required:
 *         - nome
 *       properties:
 *         nome:
 *           type: string
 *           description: Novo nome do serviço
 *           minLength: 1
 *           maxLength: 255
 *           example: Premium Plus VIP
 */

/**
 * @swagger
 * /servicos:
 *   get:
 *     summary: Listar todos os serviços
 *     tags: [Serviços]
 *     security:
 *       - bearerAuth: []
 *     description: Retorna lista de serviços do usuário autenticado, ordenados por nome
 *     responses:
 *       200:
 *         description: Lista de serviços
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   nome:
 *                     type: string
 *                     example: Premium Plus
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao buscar serviços
 *
 *   post:
 *     summary: Criar novo serviço
 *     tags: [Serviços]
 *     security:
 *       - bearerAuth: []
 *     description: Adiciona um novo serviço ao catálogo do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServiceCreate'
 *     responses:
 *       201:
 *         description: Serviço adicionado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Serviço adicionado com sucesso!
 *                 id:
 *                   type: integer
 *                   example: 5
 *                 nome:
 *                   type: string
 *                   example: Premium Plus
 *       400:
 *         description: Nome do serviço vazio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Serviço já existe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Este serviço já existe.
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao adicionar serviço
 */

/**
 * @swagger
 * /servicos/{id}:
 *   put:
 *     summary: Atualizar nome do serviço
 *     tags: [Serviços]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Atualiza o nome de um serviço.
 *       IMPORTANTE: Também atualiza automaticamente todos os clientes que usam este serviço.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServiceUpdate'
 *     responses:
 *       200:
 *         description: Serviço atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Serviço atualizado com sucesso!
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 nome:
 *                   type: string
 *                   example: Premium Plus VIP
 *       400:
 *         description: ID inválido ou nome vazio
 *       404:
 *         description: Serviço não encontrado
 *       409:
 *         description: Novo nome já existe
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao atualizar serviço
 *
 *   delete:
 *     summary: Excluir serviço
 *     tags: [Serviços]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Exclui um serviço do catálogo.
 *       IMPORTANTE: Não pode excluir se houver clientes usando este serviço.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *     responses:
 *       200:
 *         description: Serviço excluído com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Serviço excluído com sucesso!
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Serviço não encontrado
 *       409:
 *         description: Serviço em uso por clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: O serviço "Premium Plus" está em uso por 15 cliente(s) e não pode ser excluído.
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro ao excluir serviço
 */

module.exports = {};
