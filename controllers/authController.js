const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

// Función para el login de un usuario
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validar que email y password existan
    if (!email || !password) {
      return res.status(400).json({ error: 'El email y la contraseña son obligatorios.' });
    }

    // 2. Buscar al usuario en la base de datos por su email
    const query = 'SELECT * FROM usuarios WHERE email = $1';
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas.' }); // No decir si es usuario o clave
    }

    const usuario = result.rows[0];

    // 3. Comparar la contraseña enviada con el hash guardado en la BD
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // 4. Si todo es correcto, crear el Token (JWT)
    const payload = {
      usuarioId: usuario.id,
      rol: usuario.rol,
      nombre: usuario.nombre
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h', // El token expirará en 1 hora
    });

    // 5. Enviar el token al cliente
    res.json({
      message: 'Login exitoso.',
      token: token,
    });

  } catch (err) {
    console.error('Error en el login:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// controllers/authController.js - Agrega esta función
const obtenerMiPerfil = async (req, res) => {
  try {
    const query = `
      SELECT id, nombre, email, rol, forzar_cambio_password 
      FROM usuarios 
      WHERE id = $1
    `;
    const result = await pool.query(query, [req.usuario.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener perfil:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Y la función cambiarPassword que te envié antes
const cambiarPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const usuarioId = req.usuario.id;

    // Verificar contraseña actual
    const userQuery = 'SELECT password_hash FROM usuarios WHERE id = $1';
    const userResult = await pool.query(userQuery, [usuarioId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Hashear nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Actualizar en BD
    const updateQuery = `
      UPDATE usuarios 
      SET password_hash = $1, forzar_cambio_password = false 
      WHERE id = $2
      RETURNING id, nombre, email, rol, forzar_cambio_password;
    `;
    const updateResult = await pool.query(updateQuery, [newPasswordHash, usuarioId]);

    res.json({ 
      message: 'Contraseña cambiada exitosamente',
      usuario: updateResult.rows[0]
    });

  } catch (err) {
    console.error('Error al cambiar password:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  login, 
  obtenerMiPerfil, 
  cambiarPassword
};