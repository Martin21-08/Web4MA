const express = require('express');
const router = express.Router();
const viewsController = require('../controllers/viewsController');

router.get('/login', (req, res) => res.redirect('/usuarios/login'));
router.get('/register', (req, res) => res.redirect('/usuarios/registro'));
router.get('/lobby', viewsController.mostrarLobby);
router.get('/despensa', viewsController.mostrarDespensa);
router.get('/favoritos', viewsController.mostrarFavoritos);
router.get('/historial', viewsController.mostrarHistorial);
router.get('/perfil', viewsController.mostrarPerfil);


module.exports = router;
