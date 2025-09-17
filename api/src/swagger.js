const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Chat API',
      version: '1.0.0',
      description: 'OpenAPI for Chat app (auth, friends, conversations, messages)',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            avatar: { type: 'string', nullable: true }
          }
        },
        FriendRequest: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            from: { $ref: '#/components/schemas/User' },
            to: { $ref: '#/components/schemas/User' },
            status: { type: 'string', enum: ['pending','accepted','rejected','canceled'] }
          }
        },
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['single','group'] },
            name: { type: 'string', nullable: true },
            members: { type: 'array', items: { $ref: '#/components/schemas/User' } },
            lastMessageAt: { type: 'string', format: 'date-time' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            conversationId: { type: 'string' },
            senderId: { type: 'string' },
            content: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  // Quét chú thích JSDoc trong các route:
  apis: ['./src/routes/*.js'], // đổi path nếu khác
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = { swaggerSpec };
