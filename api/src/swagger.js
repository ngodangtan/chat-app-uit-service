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
            _id: { type: 'string' },           // added to match real responses
            id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            avatar: { type: 'string', nullable: true }
          }
        },
        FriendRequest: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            id: { type: 'string', nullable: true },
            from: {
              oneOf: [
                { $ref: '#/components/schemas/User' },
                { type: 'string', format: 'objectId' }
              ],
              description: 'Sender user object (populated) or user id'
            },
            to: {
              oneOf: [
                { $ref: '#/components/schemas/User' },
                { type: 'string', format: 'objectId' }
              ],
              description: 'Recipient user object (populated) or user id'
            },
            status: { type: 'string', enum: ['pending','accepted','rejected','canceled'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
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
