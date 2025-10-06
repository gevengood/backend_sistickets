const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { proteger } = require('../middleware/authMiddleware');

const soloAdmin = (req, res, next) => {
  if (req.usuario && req.usuario.rol === 'admin') next();
  else res.status(403).json({ error: 'Acceso denegado.' });
};

// Rutas de administración
router.get('/agentes', proteger, soloAdmin, adminController.obtenerAgentes);
router.get('/usuarios', proteger, soloAdmin, adminController.obtenerTodosUsuarios);
router.get('/usuarios/:id', proteger, soloAdmin, adminController.obtenerUsuarioPorId);
router.post('/usuarios', proteger, soloAdmin, adminController.crearUsuario);
router.put('/usuarios/:id', proteger, soloAdmin, adminController.actualizarUsuario);
router.delete('/usuarios/:id', proteger, soloAdmin, adminController.eliminarUsuario);

module.exports = router;