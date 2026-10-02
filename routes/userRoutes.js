const express = require("express");

const router = express.Router();

const userController = require("../controllers/userController");


// ================================
// REGISTRO
// ================================

// Mostrar formulario
router.get(
    "/registro",
    userController.mostrarRegistro
);


// Recibir formulario
router.post(
    "/registro",
    userController.register
);


// ================================
// LOGIN
// ================================

// Mostrar formulario
router.get(
    "/login",
    userController.mostrarLogin
);


// Recibir formulario
router.post(
    "/login",
    userController.login
);


module.exports = router;