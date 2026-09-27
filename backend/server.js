require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE'] } });

app.use(cors());
app.use(express.json());
app.set('io', io);

app.get('/', (req, res) => res.json({ message: 'CodeAlpha Project Management API is running' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

io.on('connection', socket => {
  socket.on('join-project', projectId => socket.join(`project:${projectId}`));
  socket.on('leave-project', projectId => socket.leave(`project:${projectId}`));
});

const PORT = process.env.PORT || 5001;
connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
});
