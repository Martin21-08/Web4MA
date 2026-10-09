// Relaciona cada página del sitio con la vista que debe mostrar.
const express = require('express');
const router = express.Router();
const viewsController = require('../controllers/viewsController');

router.get('/login', (req, res) => res.redirect('/usuarios/login'));
router.get('/register', (req, res) => res.redirect('/usuarios/registro'));
// Estas páginas muestran su vista; sus cambios interactivos se manejan en el navegador.
router.get('/lobby', viewsController.mostrarLobby);
router.get('/despensa', viewsController.mostrarDespensa);
router.get('/favoritos', viewsController.mostrarFavoritos);
router.get('/historial', viewsController.mostrarHistorial);
router.get('/perfil', viewsController.mostrarPerfil);
router.get('/suscripciones', viewsController.mostrarSuscripciones);
// El enlace de registro solicita esta URL; el controlador responde con la vista Terminos.
router.get('/usuarios/terminos', viewsController.mostrarTerminos);

module.exports = router;
