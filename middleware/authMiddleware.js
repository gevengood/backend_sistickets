const jwt = require('jsonwebtoken');
require('dotenv').config();

const proteger = (req, res, next) => {
  let token;

  // 1. Revisar si el token viene en los headers y tiene el formato correcto
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 2. Extraer el token del string "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // 3. Verificar el token con la frase secreta
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4. Añadir los datos del usuario (del token) al objeto `req`
      // Así, las rutas protegidas sabrán quién está haciendo la petición
      req.usuario = {
        id: decoded.usuarioId,
        rol: decoded.rol
      };
      
      next(); // Si todo está bien, le damos paso a la siguiente función (el controlador)

    } catch (error) {
      console.error('Error de autenticación:', error);
      res.status(401).json({ error: 'No autorizado, token inválido.' });
    }
  }

  if (!token) {
    res.status(401).json({ error: 'No autorizado, no se encontró un token.' });
  }
};

module.exports = { proteger };