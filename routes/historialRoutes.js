const express = require('express');
const historialController = require('../controllers/historialController');

const router = express.Router();
router.get('/', historialController.listarHistorial);

module.exports = router;
