// Copia mensajes temporales para que las vistas puedan mostrarlos.
const flashMiddleware = (req, res, next) => {

    // Pasar los mensajes de flash a las vistas
    res.locals.messages = req.flash();

    // Continuar
    next();
};


module.exports = flashMiddleware;

