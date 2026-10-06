const express = require('express');
const router = express.Router();

// Importamos tu controlador (el que tiene listarIngredientes y generarRecetas)
const recetasController = require('../controllers/recetasController');

// 1. Ruta para obtener la lista de ingredientes desde MySQL
// Responderá a: GET http://localhost:3000/ingredientes
router.get('/ingredientes', recetasController.listarIngredientes);

// 2. Ruta temporal para simular la generación de recetas
// Responderá a: POST http://localhost:3000/generar
router.post('/generar', recetasController.generarRecetas);

// Exportamos las rutas para que app.js las pueda usar
module.exports = router;
