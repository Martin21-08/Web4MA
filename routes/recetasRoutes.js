// Direcciones de la API para consultar ingredientes y pedir recetas.
const express = require('express');
const router = express.Router();
const recetaController = require('../controllers/resetasController');
const validarGeneracion = require('../middlewares/validarGeneracion');

// GET devuelve los ingredientes disponibles en formato JSON.
router.get('/api/ingredientes', recetaController.listarIngredientes);
// POST revisa los ingredientes antes de pasarlos al controlador.
router.post('/recetas/generar', validarGeneracion, recetaController.generarRecetas);

module.exports = router;
