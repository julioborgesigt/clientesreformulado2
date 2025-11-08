// backend/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Gestão de Clientes',
      version: '1.0.0',
      description: 'API RESTful para gerenciamento de clientes com controle de pagamentos, vencimentos e relatórios.',
      contact: {
        name: 'Suporte',
        email: 'suporte@exemplo.com'
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de Desenvolvimento'
      },
      {
        url: 'https://clientes.domcloud.dev',
        description: 'Servidor de Produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido após login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensagem de erro'
            },
            details: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Detalhes adicionais do erro (validação)'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID do usuário'
            },
            name: {
              type: 'string',
              description: 'Nome completo do usuário'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário'
            }
          }
        },
        Client: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID do cliente'
            },
            name: {
              type: 'string',
              description: 'Nome do cliente'
            },
            vencimento: {
              type: 'string',
              format: 'date',
              description: 'Data de vencimento'
            },
            servico: {
              type: 'string',
              description: 'Serviço contratado'
            },
            whatsapp: {
              type: 'string',
              description: 'Número WhatsApp'
            },
            valor_cobrado: {
              type: 'number',
              format: 'decimal',
              description: 'Valor cobrado'
            },
            custo: {
              type: 'number',
              format: 'decimal',
              description: 'Custo do serviço'
            },
            status: {
              type: 'string',
              enum: ['pago', 'pendente', 'em_dias'],
              description: 'Status do pagamento'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Autenticação',
        description: 'Endpoints de autenticação e registro de usuários'
      },
      {
        name: 'Clientes',
        description: 'Gerenciamento de clientes (requer autenticação)'
      },
      {
        name: 'Serviços',
        description: 'Gerenciamento de serviços (requer autenticação)'
      }
    ]
  },
  apis: ['./backend/routes/*.js'], // Caminho para os arquivos com anotações
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'API Docs - Gestão de Clientes',
    customCss: '.swagger-ui .topbar { display: none }',
  }));

  // Endpoint para obter o JSON do Swagger
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Documentação Swagger disponível em: http://localhost:3000/api-docs');
}

module.exports = setupSwagger;
