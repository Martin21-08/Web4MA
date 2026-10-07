/**
 * Comprueba que existan los datos necesarios
 * antes de llegar al controlador.
 */
function validarFirebase(req, res, next) {

    const {
        nombres,
        apellidos,
        correo,
        telefono,
        googleId
    } = req.body;

    /*
     * Google necesita:
     * nombres
     * apellidos
     * correo
     * googleId
     */
    if (googleId) {

        if (!nombres || !apellidos || !correo) {

            return res.status(400).json({
                ok: false,
                error: 'Faltan datos obligatorios de Google.'
            });
        }

        return next();
    }

    /*
     * SMS necesita:
     * nombres
     * apellidos
     * teléfono
     */
    if (telefono) {

        if (!nombres || !apellidos) {

            return res.status(400).json({
                ok: false,
                error: 'Faltan nombres o apellidos.'
            });
        }

        if (!telefono.startsWith('+569')) {

            return res.status(400).json({
                ok: false,
                error: 'El teléfono debe comenzar con +569.'
            });
        }

        return next();
    }

    return res.status(400).json({
        ok: false,
        error: 'No se identificó un método de autenticación.'
    });
}


module.exports = validarFirebase;