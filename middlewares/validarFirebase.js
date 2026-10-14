/**
 * Comprueba que existan los datos necesarios
 * antes de llegar al controlador.
 */
async function validarFirebase(req, res, next) {

    const {
        nombres,
        apellidos,
        correo,
        telefono,
        googleId
    } = req.body;

    // Google necesita un token vigente y los datos de identidad que debe validar el servidor.
    if (googleId) {

        const idToken = req.body.idToken;
        const correoNormalizado = typeof correo === 'string'
            ? correo.trim().toLowerCase()
            : '';

        if (typeof googleId !== 'string' || !googleId || !correoNormalizado || typeof idToken !== 'string' || !idToken) {
            return res.status(400).json({
                ok: false,
                error: 'Faltan las credenciales verificables de Google.'
            });
        }

        if (!process.env.FIREBASE_API_KEY) {
            return res.status(503).json({
                ok: false,
                error: 'La autenticación Firebase no está configurada en el servidor.'
            });
        }

        try {
            const respuesta = await fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(process.env.FIREBASE_API_KEY)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken })
                }
            );
            const datos = await respuesta.json();
            const usuarioVerificado = datos.users?.find(usuario =>
                usuario.localId === googleId &&
                String(usuario.email || '').toLowerCase() === correoNormalizado &&
                usuario.emailVerified === true
            );

            if (!respuesta.ok || !usuarioVerificado) {
                return res.status(401).json({
                    ok: false,
                    error: 'No se pudo verificar la cuenta de Google.'
                });
            }

            req.firebaseGoogleUser = {
                googleId: usuarioVerificado.localId,
                correo: usuarioVerificado.email
            };
            return next();
        } catch (error) {
            console.error('No se pudo verificar el token de Firebase:', error.message);
            return res.status(502).json({
                ok: false,
                error: 'No se pudo verificar la cuenta de Google. Inténtalo nuevamente.'
            });
        }
    }

    /*
     * SMS necesita:
     * nombres
     * apellidos
     * teléfono
     */
    if (telefono) {

        if (typeof nombres !== 'string' || !nombres.trim() ||
            typeof apellidos !== 'string' || !apellidos.trim()) {

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