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
 * Crea un nuevo ticket.
 * El cliente debe estar autenticado.
 */
const crearTicket = async (req, res) => {
  try {
    const { titulo, descripcion } = req.body;
    const clienteId = req.usuario.id; // Obtenemos el ID del cliente desde el token verificado

    // Validación simple
    if (!titulo || !descripcion) {
      return res.status(400).json({ error: 'El título y la descripción son obligatorios.' });
    }

    // Insertamos el nuevo ticket en la base de datos
    const query = `
      INSERT INTO tickets (titulo, descripcion, cliente_id)
      VALUES ($1, $2, $3)
      RETURNING *; 
    `;
    const values = [titulo, descripcion, clienteId];
    
    const result = await pool.query(query, values);
    const nuevoTicket = result.rows[0];

    res.status(201).json({
      message: 'Ticket creado exitosamente.',
      ticket: nuevoTicket,
    });

  } catch (err) {
    console.error('Error al crear el ticket:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};


/**
 * Obtiene los tickets.
 * Si el usuario es un cliente, solo ve sus propios tickets.
 * Si es un agente, ve todos los tickets Y EL NOMBRE DEL CLIENTE.
 */
const obtenerTickets = async (req, res) => {
  try {
    const { id: usuarioId, rol } = req.usuario;
    const { asignacion } = req.query; // <-- Obtenemos el filtro de la URL (ej: /api/tickets?asignacion=propios)

    let query;
    let values = [];

    // Construcción de la consulta base con JOIN
    let baseQuery = `
      SELECT t.*, u.nombre AS cliente_nombre 
      FROM tickets t
      LEFT JOIN usuarios u ON t.cliente_id = u.id
    `;

    if (rol === 'cliente') {
      query = `${baseQuery} WHERE t.cliente_id = $1 ORDER BY t.fecha_creacion DESC`;
      values = [usuarioId];
    } else { // Para agentes y admins
      if (asignacion === 'propios') {
        query = `${baseQuery} WHERE t.agente_id = $1 ORDER BY t.fecha_creacion DESC`;
        values = [usuarioId];
      } else if (asignacion === 'no_asignados') {
        query = `${baseQuery} WHERE t.agente_id IS NULL ORDER BY t.fecha_creacion DESC`;
      } else { // Por defecto, o si asignacion = 'todos'
        query = `${baseQuery} ORDER BY t.fecha_creacion DESC`;
      }
    }

    const result = await pool.query(query, values);
    res.json(result.rows);

  } catch (err) {
    console.error('Error al obtener tickets:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};


/**
 * Obtiene un ticket específico por su ID, incluyendo todos sus comentarios.
 */
const obtenerTicketPorId = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const { id: usuarioId, rol } = req.usuario;

    // --- PRIMERA CONSULTA: Obtener los datos del ticket ---
    const ticketQuery = 'SELECT * FROM tickets WHERE id = $1';
    const ticketResult = await pool.query(ticketQuery, [ticketId]);

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado.' });
    }

    const ticket = ticketResult.rows[0];

    // Verificación de seguridad: un cliente solo puede ver sus propios tickets
    if (rol === 'cliente' && ticket.cliente_id !== usuarioId) {
      return res.status(403).json({ error: 'No autorizado para ver este ticket.' });
    }

    // --- SEGUNDA CONSULTA: Obtener los comentarios de ese ticket ---
    const comentariosQuery = `
      SELECT * FROM comentarios 
      WHERE ticket_id = $1 
      ORDER BY fecha_creacion ASC
    `;
    const comentariosResult = await pool.query(comentariosQuery, [ticketId]);
    const comentarios = comentariosResult.rows;

    // --- UNIMOS TODO: Añadimos los comentarios al objeto del ticket ---
    ticket.comentarios = comentarios;

    res.json(ticket); // Devolvemos el objeto completo

  } catch (err) {
    console.error('Error al obtener el ticket:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};


/**
 * Actualiza un ticket. Solo para agentes.
 */
const actualizarTicket = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const { estado, prioridad, agente_id } = req.body; // Aceptamos agente_id
    const { id: usuarioId, rol } = req.usuario;

    let query, values;

    if (rol === 'admin') {
      query = `UPDATE tickets SET estado = $1, prioridad = $2, agente_id = $3, fecha_ultima_actualizacion = NOW() WHERE id = $4 RETURNING *;`;
      values = [estado, prioridad, agente_id, ticketId];
    } else { // Un agente se lo asigna a sí mismo
      query = `UPDATE tickets SET estado = $1, prioridad = $2, agente_id = $3, fecha_ultima_actualizacion = NOW() WHERE id = $4 RETURNING *;`;
      values = [estado, prioridad, usuarioId, ticketId];
    }

    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket no encontrado.' });

    res.json({ ticket: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

const obtenerEstadisticas = async (req, res) => {
  try {
    const query = `
      SELECT estado, COUNT(*) as count
      FROM tickets
      GROUP BY estado;
    `;
    const result = await pool.query(query);

    // Convertimos el resultado en un objeto fácil de usar para el frontend
    const stats = {
      abierto: 0,
      en_proceso: 0,
      cerrado: 0,
    };

    result.rows.forEach(row => {
      stats[row.estado] = parseInt(row.count, 10);
    });

    res.json(stats);

  } catch (err) {
    console.error('Error al obtener estadísticas:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

module.exports = {
  crearTicket,
  obtenerTickets,
  obtenerTicketPorId,
  actualizarTicket,
  obtenerEstadisticas,
};