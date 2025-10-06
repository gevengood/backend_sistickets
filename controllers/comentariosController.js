// controllers/comentariosController.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

/**
 * Agrega un nuevo comentario a un ticket.
 * Puede ser ejecutado por un cliente o un agente.
 */
const agregarComentario = async (req, res) => {
  try {
    const ticketId = req.params.id;           // ID del ticket desde la URL
    const { contenido, es_privado } = req.body;
    const { id: usuarioId, rol } = req.usuario || {}; // del middleware de auth

    if (!contenido) {
      return res.status(400).json({ error: 'El contenido del comentario es obligatorio.' });
    }

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }

    // Un cliente no puede crear comentarios privados
    const esPrivadoFinal = rol === 'cliente' ? false : !!es_privado;

    const insert = `
      INSERT INTO comentarios (contenido, ticket_id, usuario_id, es_privado)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const { rows } = await pool.query(insert, [contenido, ticketId, usuarioId, esPrivadoFinal]);
    const nuevoComentario = rows[0];

    // 🔊 Emitir evento en tiempo real al room del ticket
    const io = req.app.get('io');
    if (io) {
      io.to(`ticket:${ticketId}`).emit('comment:created', nuevoComentario);
    }

    return res.status(201).json({
      message: 'Comentario agregado exitosamente.',
      comentario: nuevoComentario,
    });
  } catch (err) {
    console.error('Error al agregar comentario:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

module.exports = { agregarComentario };
