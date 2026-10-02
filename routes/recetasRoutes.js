const express = require('express');
const router = express.Router();
const recetaController = require('../controllers/resetasController');
const validarGeneracion = require('../middlewares/validarGeneracion');

router.get('/api/ingredientes', recetaController.listarIngredientes);
router.post('/recetas/generar', validarGeneracion, recetaController.generarRecetas);

module.exports = router;
