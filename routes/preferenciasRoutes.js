const express = require('express');

const router = express.Router();

const preferenciasController = require('../controllers/preferenciasController');

// Guarda las alergias e intolerancias del usuario.
router.post('/', preferenciasController.guardarPreferencias);

// Recupera las alergias e intolerancias del usuario autenticado.
router.get('/', preferenciasController.obtenerPreferencias);

module.exports = router;
