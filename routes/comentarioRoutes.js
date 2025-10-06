// routes/comentarioRoutes.js
const express = require('express');
// La opción { mergeParams: true } es importante para acceder al :id del ticket
const router = express.Router({ mergeParams: true }); 
const comentariosController = require('../controllers/comentariosController');
const { proteger } = require('../middleware/authMiddleware');

// La ruta final será POST /api/tickets/:id/comentarios
router.post('/', proteger, comentariosController.agregarComentario);

module.exports = router;