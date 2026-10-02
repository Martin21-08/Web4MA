const mostrarLobby = (req, res) => res.render('lobby');
const mostrarDespensa = (req, res) => res.render('despensa');
const mostrarFavoritos = (req, res) => res.render('favoritos');
const mostrarHistorial = (req, res) => res.render('historial');
const mostrarPerfil = (req, res) => res.render('perfil');

module.exports = {
    mostrarLobby,
    mostrarDespensa,
    mostrarFavoritos,
    mostrarHistorial,
    mostrarPerfil
};
