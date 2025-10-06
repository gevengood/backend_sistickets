// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { proteger } = require('../middleware/authMiddleware'); // <-- FALTABA ESTA IMPORTACIÓN

// Rutas de autenticación
router.post('/login', authController.login);
router.get('/mi-perfil', proteger, authController.obtenerMiPerfil); // <-- Ahora sí funciona
router.post('/cambiar-password', proteger, authController.cambiarPassword);

module.exports = router;