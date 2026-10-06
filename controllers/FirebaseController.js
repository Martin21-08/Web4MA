const firebaseModel = require('../models/firebaseModel');

/**
 * Entrega al frontend la configuración pública
 * necesaria para inicializar Firebase.
 */
function obtenerConfiguracionFirebase(req, res) {
    const configuracion = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    };

    const faltantes = Object.entries(configuracion)
        .filter(([_, valor]) => !valor)
        .map(([nombre]) => nombre);

    if (faltantes.length > 0) {
        return res.status(500).json({
            error: 'Firebase no está configurado correctamente.',
            faltantes
        });
    }

    res.json(configuracion);
}


/**
 * Login mediante Google.
 *
 * Busca primero por google_id.
 * Si no existe, busca por correo.
 * Si tampoco existe, crea el usuario.
 */
async function loginGoogle(req, res) {
    try {
        const {
            googleId,
            nombres,
            apellidos,
            correo
        } = req.body;

        let usuario = await firebaseModel.buscarPorGoogleId(googleId);

        if (usuario) {
            req.session.usuario = usuario;

            return res.json({
                ok: true,
                nuevo: false,
                usuario
            });
        }

        usuario = await firebaseModel.buscarPorCorreo(correo);

        if (usuario) {

            /*
             * El usuario ya tenía una cuenta CookIQ.
             * Ahora vinculamos su Google ID.
             */
            usuario = await firebaseModel.vincularGoogleId(
                usuario.id_usuario,
                googleId
            );

            req.session.usuario = usuario;

            return res.json({
                ok: true,
                nuevo: false,
                usuario
            });
        }

        /*
         * No existe.
         * Creamos una cuenta nueva.
         */
        usuario = await firebaseModel.crearUsuarioGoogle({
            nombres,
            apellidos,
            correo,
            googleId
        });

        req.session.usuario = usuario;

        res.status(201).json({
            ok: true,
            nuevo: true,
            usuario
        });

    } catch (error) {

        console.error('Error en login Google:', error);

        res.status(500).json({
            ok: false,
            error: 'No se pudo iniciar sesión con Google.'
        });
    }
}


/**
 * Login mediante teléfono.
 *
 * Firebase verifica previamente el SMS.
 * Aquí solamente sincronizamos el usuario con MySQL.
 */
async function loginTelefono(req, res) {
    try {

        const {
            nombres,
            apellidos,
            correo,
            telefono
        } = req.body;

        let usuario =
            await firebaseModel.buscarPorTelefono(telefono);

        if (usuario) {

            req.session.usuario = usuario;

            return res.json({
                ok: true,
                nuevo: false,
                usuario
            });
        }

        /*
         * Si no existe el teléfono,
         * buscamos por correo si existe.
         */
        if (correo) {

            usuario =
                await firebaseModel.buscarPorCorreo(correo);

            if (usuario) {

                usuario =
                    await firebaseModel.actualizarPerfil(
                        usuario.id_usuario,
                        {
                            nombres,
                            apellidos,
                            correo,
                            telefono
                        }
                    );

                req.session.usuario = usuario;

                return res.json({
                    ok: true,
                    nuevo: false,
                    usuario
                });
            }
        }

        /*
         * Usuario completamente nuevo.
         */
        usuario =
            await firebaseModel.crearUsuarioTelefono({
                nombres,
                apellidos,
                correo,
                telefono
            });

        req.session.usuario = usuario;

        res.status(201).json({
            ok: true,
            nuevo: true,
            usuario
        });

    } catch (error) {

        console.error('Error en login SMS:', error);

        res.status(500).json({
            ok: false,
            error: 'No se pudo sincronizar el usuario.'
        });
    }
}


/**
 * Devuelve el usuario que actualmente tiene
 * una sesión de CookIQ.
 */
async function obtenerSesion(req, res) {

    if (!req.session.usuario) {
        return res.status(401).json({
            ok: false,
            usuario: null
        });
    }

    const usuario =
        await firebaseModel.buscarPorId(
            req.session.usuario.id_usuario
        );

    if (!usuario) {

        req.session.destroy(() => {});

        return res.status(401).json({
            ok: false,
            usuario: null
        });
    }

    res.json({
        ok: true,
        usuario
    });
}


/**
 * Cierra la sesión de CookIQ.
 */
function cerrarSesion(req, res) {

    req.session.destroy((error) => {

        if (error) {

            return res.status(500).json({
                ok: false,
                error: 'No se pudo cerrar la sesión.'
            });
        }

        res.json({
            ok: true
        });
    });
}


module.exports = {
    obtenerConfiguracionFirebase,
    loginGoogle,
    loginTelefono,
    obtenerSesion,
    cerrarSesion
};