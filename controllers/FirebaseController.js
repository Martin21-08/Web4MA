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
 * Inicia sesión solo si el correo verificado ya existe en CookIQ.
 */
async function loginGoogle(req, res) {
    try {
        const { googleId, correo } = req.firebaseGoogleUser;
        let usuario = await firebaseModel.buscarPorCorreo(correo);

        if (!usuario) {
            return res.status(404).json({
                ok: false,
                error: 'Este Gmail no está registrado. Regístrate con Google para crear una cuenta.'
            });
        }

        const usuarioConGoogleId = await firebaseModel.buscarPorGoogleId(googleId);
        if (usuarioConGoogleId && usuarioConGoogleId.id_usuario !== usuario.id_usuario) {
            return res.status(409).json({
                ok: false,
                error: 'Esta cuenta de Google ya está vinculada a otro usuario.'
            });
        }

        if (usuario.google_id && usuario.google_id !== googleId) {
            return res.status(409).json({
                ok: false,
                error: 'El Gmail ya está registrado con otra cuenta de Google.'
            });
        }

        if (!usuario.google_id) {
            usuario = await firebaseModel.vincularGoogleId(usuario.id_usuario, googleId);
        }

        req.session.usuario = usuario;

        return res.json({
            ok: true,
            usuario
        });

    } catch (error) {

        console.error('Error en inicio de sesión con Google:', error);

        res.status(500).json({
            ok: false,
            error: 'No se pudo iniciar sesión con Google. Inténtalo nuevamente.'
        });
    }
}


/**
 * Registra una cuenta nueva después de que la persona completa sus datos.
 */
async function registrarGoogle(req, res) {
    try {
        const { googleId, correo } = req.firebaseGoogleUser;
        const nombres = String(req.body.nombres || '').trim();
        const apellidos = String(req.body.apellidos || '').trim();
        const telefonoIngresado = String(req.body.telefono || '').trim();
        const telefono = telefonoIngresado
            ? telefonoIngresado.replace(/[\s()-]/g, '')
            : null;
        const terminosAceptados = ['Terminos', 'on', true].includes(req.body.Terminos);

        if (!nombres || !apellidos) {
            return res.status(400).json({
                ok: false,
                error: 'Debes ingresar tu nombre y apellido.'
            });
        }

        if (!terminosAceptados) {
            return res.status(400).json({
                ok: false,
                error: 'Debes aceptar los términos y condiciones para registrarte.'
            });
        }

        if (telefono && !/^\+569\d{8}$/.test(telefono)) {
            return res.status(400).json({
                ok: false,
                error: 'El teléfono debe tener formato +56 9 1234 5678.'
            });
        }

        const usuarioExistente = await firebaseModel.buscarPorCorreo(correo);
        if (usuarioExistente) {
            return res.status(409).json({
                ok: false,
                error: 'Este Gmail ya está registrado. Inicia sesión con Google.'
            });
        }

        const googleIdExistente = await firebaseModel.buscarPorGoogleId(googleId);
        if (googleIdExistente) {
            return res.status(409).json({
                ok: false,
                error: 'Esta cuenta de Google ya está registrada. Inicia sesión con Google.'
            });
        }

        const usuario = await firebaseModel.crearUsuarioGoogle({
            nombres,
            apellidos,
            correo,
            telefono,
            googleId
        });

        req.session.usuario = usuario;
        return res.status(201).json({
            ok: true,
            usuario
        });
    } catch (error) {
        console.error('Error en registro con Google:', {
            code: error.code || 'UNKNOWN',
            message: error.message || 'Sin detalle'
        });

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                ok: false,
                error: 'El Gmail o teléfono ya está registrado.'
            });
        }

        return res.status(500).json({
            ok: false,
            error: 'No se pudo guardar el registro con Google. Inténtalo nuevamente.'
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
    registrarGoogle,
    loginTelefono,
    obtenerSesion,
    cerrarSesion
};