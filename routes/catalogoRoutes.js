// Define las rutas relacionadas con el catálogo
// de alergias e intolerancias.

const express = require("express");

const router = express.Router();

const catalogoController = require("../controllers/catalogoController");


// ================================
// CATÁLOGOS
// ================================

// Obtener las alergias e intolerancias disponibles.
router.get(
    "/",
    catalogoController.mostrarCatalogos
);


module.exports = router;