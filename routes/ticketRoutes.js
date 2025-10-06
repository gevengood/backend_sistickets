const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { proteger } = require('../middleware/authMiddleware'); // <-- Importamos nuestro guardia

// Aplicamos el middleware "proteger" a estas rutas.
// Nadie podrá acceder a ellas sin un token válido.
router.post('/', proteger, ticketController.crearTicket);
router.get('/', proteger, ticketController.obtenerTickets);


// --- NUEVA RUTA PARA ESTADÍSTICAS ---
router.get('/stats', proteger, ticketController.obtenerEstadisticas);

// Obtener un ticket por ID: GET /api/tickets/1
router.get('/:id', proteger, ticketController.obtenerTicketPorId);

// Actualizar un ticket por ID: PUT /api/tickets/1
router.put('/:id', proteger, ticketController.actualizarTicket);



module.exports = router;