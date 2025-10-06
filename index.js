// index.js

// Dependencias base
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Rutas
const userRoutes = require('./routes/userRoutes');           // /api/agentes
const authRoutes = require('./routes/authRoutes');           // /api/auth
const ticketRoutes = require('./routes/ticketRoutes');       // /api/tickets
const comentarioRoutes = require('./routes/comentarioRoutes'); // /api/tickets/:id/comentarios
const adminRoutes = require('./routes/adminRoutes'); // <-- LA QUE PROBABLEMENTE FALTA


// App Express
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Pool para el endpoint de prueba (tus controladores ya crean su propio Pool)
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

// ===== Socket.io =====
// Crear servidor HTTP desde la app de Express
const server = http.createServer(app);

// Instancia de Socket.io (esto es "io")
const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', credentials: true },
});

// Rooms por ticket
io.on('connection', (socket) => {
  socket.on('join_ticket', (ticketId) => socket.join(`ticket:${ticketId}`));
  socket.on('leave_ticket', (ticketId) => socket.leave(`ticket:${ticketId}`));
});

// Exponer io en la app para usarlo en controladores: req.app.get('io')
app.set('io', io);

// ===== Rutas =====
app.use('/api/agentes', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
// Rutas de comentarios anidadas bajo /api/tickets/:id/comentarios
app.use('/api/tickets/:id/comentarios', comentarioRoutes);
app.use('/api/admin', adminRoutes); // <-- AÑADE ESTA LÍNEA


// ===== Endpoint de prueba de BD =====
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      message: '¡Conexión a la base de datos exitosa!',
      timestamp: result.rows[0].now,
    });
  } catch (err) {
    console.error('Error al conectar con la base de datos', err);
    res.status(500).json({ error: 'No se pudo conectar a la base de datos' });
  }
});

// ===== Levantar servidor HTTP (NO usar app.listen cuando hay sockets) =====
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  console.log('Probando la conexión a la base de datos al iniciar...');
  pool
    .query('SELECT NOW()')
    .then((res) =>
      console.log('✅ Conexión inicial a la BD exitosa:', res.rows[0].now)
    )
    .catch((err) => console.error('❌ Error en la conexión inicial a la BD:', err));
});
