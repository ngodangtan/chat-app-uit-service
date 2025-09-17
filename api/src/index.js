require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connect } = require('./db');
const socketInit = require('./socket');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const convRoutes = require('./routes/conversations');
const msgRoutes = require('./routes/messages');

const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./swagger');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/friends', friendRoutes);
app.use('/conversations', convRoutes);
app.use('/messages', msgRoutes);

const server = http.createServer(app);
socketInit(server); // socket.io

const PORT = process.env.PORT || 3000;
connect(process.env.MONGO_URI).then(() => {
  server.listen(PORT, () => console.log(`API http://localhost:${PORT}`));
});
