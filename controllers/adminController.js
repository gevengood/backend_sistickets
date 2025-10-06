const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

// Obtener todos los usuarios
const obtenerTodosUsuarios = async (req, res) => {
  try {
    const query = `
      SELECT id, nombre, email, rol, forzar_cambio_password, fecha_creacion 
      FROM usuarios 
      ORDER BY fecha_creacion DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// Obtener un usuario por ID
const obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT id, nombre, email, rol, forzar_cambio_password, fecha_creacion 
      FROM usuarios 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// Crear usuario
const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, rol } = req.body;

    if (!nombre || !email || !rol) {
      return res.status(400).json({ error: 'Nombre, email y rol son obligatorios.' });
    }

    const rolesValidos = ['cliente', 'agente_n1', 'agente_n2', 'admin'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ error: 'El rol proporcionado no es válido.' });
    }

    const tempPassword = Math.random().toString(36).slice(-8) + 'TdB1!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    const query = `
      INSERT INTO usuarios (nombre, email, password_hash, rol)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nombre, email, rol, forzar_cambio_password, fecha_creacion;
    `;
    const values = [nombre, email, passwordHash, rol];

    const result = await pool.query(query, values);
    const nuevoUsuario = result.rows[0];

    res.status(201).json({
      message: 'Usuario creado exitosamente.',
      usuario: nuevoUsuario,
      passwordTemporal: tempPassword,
    });

  } catch (err) {
    console.error('Error al crear el usuario:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
    }
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// Actualizar usuario
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol } = req.body;

    if (!nombre || !email || !rol) {
      return res.status(400).json({ error: 'Nombre, email y rol son obligatorios.' });
    }

    const rolesValidos = ['cliente', 'agente_n1', 'agente_n2', 'admin'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ error: 'El rol proporcionado no es válido.' });
    }

    const query = `
      UPDATE usuarios 
      SET nombre = $1, email = $2, rol = $3
      WHERE id = $4
      RETURNING id, nombre, email, rol, forzar_cambio_password, fecha_creacion;
    `;
    const values = [nombre, email, rol, id];

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json({
      message: 'Usuario actualizado exitosamente.',
      usuario: result.rows[0]
    });

  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
    }
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// Eliminar usuario
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que no sea el último admin
    const checkAdminQuery = `
      SELECT COUNT(*) as admin_count 
      FROM usuarios 
      WHERE rol = 'admin' AND id != $1
    `;
    const adminResult = await pool.query(checkAdminQuery, [id]);
    
    if (parseInt(adminResult.rows[0].admin_count) === 0) {
      return res.status(400).json({ error: 'No se puede eliminar el único administrador.' });
    }

    const query = 'DELETE FROM usuarios WHERE id = $1 RETURNING id;';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json({ message: 'Usuario eliminado exitosamente.' });

  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// Obtener agentes
const obtenerAgentes = async (req, res) => {
  try {
    const query = "SELECT id, nombre, rol FROM usuarios WHERE rol <> 'cliente' ORDER BY nombre ASC";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

module.exports = {
  obtenerAgentes,
  crearUsuario,
  obtenerTodosUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  eliminarUsuario
};