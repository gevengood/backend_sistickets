const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Definimos la ruta: POST /api/agentes/crear-cliente
// Cuando se llame a esta URL, se ejecutará la función "crearCliente"
router.post('/crear-cliente', userController.crearCliente);

module.exports = router;