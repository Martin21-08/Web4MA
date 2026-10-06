const express = require('express');

const router = express.Router();

const firebaseController =
    require('../controllers/FirebaseController');

const validarFirebase =
    require('../middlewares/validarFirebase');


/*
 * Configuración pública de Firebase
 */
router.get(
    '/firebase-config',
    firebaseController.obtenerConfiguracionFirebase
);


/*
 * Login con Google
 */
router.post(
    '/firebase/google',
    validarFirebase,
    firebaseController.loginGoogle
);


/*
 * Login mediante SMS
 */
router.post(
    '/firebase/telefono',
    validarFirebase,
    firebaseController.loginTelefono
);


/*
 * Obtener sesión actual
 */
router.get(
    '/firebase/sesion',
    firebaseController.obtenerSesion
);


/*
 * Cerrar sesión
 */
router.post(
    '/firebase/logout',
    firebaseController.cerrarSesion
);


module.exports = router;