// Define las direcciones para mostrar formularios y recibir sus datos.
// Registro: register.ejs -> POST /usuarios/registro -> este archivo ->
// userController.register -> userModel -> db.query -> tabla usuario.
// El controlador devuelve al navegador la página que corresponde.
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
// Los nombres de los campos llegan en req.body al controlador.
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