const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Reutilizamos la configuración del pool de index.js
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

// Función para crear un cliente nuevo
const crearCliente = async (req, res) => {
  try {
    const { nombre, email } = req.body;

    // 1. Validación simple de los datos de entrada
    if (!nombre || !email) {
      return res.status(400).json({ error: 'El nombre y el email son obligatorios.' });
    }

    // 2. Generar una contraseña temporal aleatoria
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    
    // 3. Hashear la contraseña antes de guardarla
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);
    
    // 4. Insertar el nuevo usuario en la base de datos
    const query = `
      INSERT INTO usuarios (nombre, email, password_hash, rol)
      VALUES ($1, $2, $3, 'cliente')
      RETURNING id, nombre, email, rol;
    `;
    const values = [nombre, email, passwordHash];
    
    const result = await pool.query(query, values);
    const nuevoUsuario = result.rows[0];

    // 5. Devolver una respuesta exitosa con la contraseña temporal
    res.status(201).json({
      message: 'Cliente creado exitosamente.',
      usuario: nuevoUsuario,
      passwordTemporal: tempPassword, // El agente le dará esto al cliente
    });

  } catch (err) {
    console.error('Error al crear el cliente:', err);
    // Manejar error de email duplicado
    if (err.code === '23505') {
        return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
    }
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// Exportamos la función para poder usarla en las rutas
module.exports = {
  crearCliente,
};