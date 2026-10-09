// Cada función entrega a Express la vista de una página del sitio.
const mostrarLobby = (req, res) => res.render('lobby');
const mostrarDespensa = (req, res) => res.render('despensa');
const mostrarFavoritos = (req, res) => res.render('favoritos');
const mostrarHistorial = (req, res) => res.render('historial');
const mostrarPerfil = (req, res) => res.render('perfil');
// Muestra la página de suscripciones.
const mostrarSuscripciones = (req, res) => res.render('suscripciones');

// La ruta /usuarios/terminos llega aquí y Express entrega la página informativa.
const mostrarTerminos = (req, res) => res.render('Terminos');

module.exports = {
    mostrarLobby,
    mostrarDespensa,
    mostrarFavoritos,
    mostrarHistorial,
    mostrarPerfil,
    mostrarTerminos,
    mostrarSuscripciones
};
