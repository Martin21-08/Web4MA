const preferenciasModel = require('../models/preferenciasModel');

// Devuelve las preferencias de la cuenta autenticada.
const obtenerPreferencias = async (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).json({
            ok: false,
            mensaje: 'Debes iniciar sesión.'
        });
    }

    try {
        const id_usuario = req.session.usuario.id_usuario;
        const preferencias = await preferenciasModel.obtenerPreferencias(id_usuario);

        return res.json({
            ok: true,
            alergias: preferencias.alergias,
            intolerancias: preferencias.intolerancias
        });
    } catch (error) {
        console.error('Error al obtener preferencias:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'No se pudieron obtener las preferencias.'
        });
    }
};

// Guarda las alergias e intolerancias del usuario.
const guardarPreferencias = async (req, res) => {

    try {

        // Comprobamos que haya una sesión iniciada.
        if (!req.session.usuario) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Debes iniciar sesión.'
            });
        }

        // Obtenemos el ID del usuario desde la sesión.
        const id_usuario = req.session.usuario.id_usuario;

        // Obtenemos los datos enviados desde el frontend.
        const alergias = Array.isArray(req.body.alergias)
            ? req.body.alergias
            : [];

        const intolerancias = Array.isArray(req.body.intolerancias)
            ? req.body.intolerancias
            : [];

        // Convertimos los valores a números.
        const idsAlergias = alergias.map(Number);
        const idsIntolerancias = intolerancias.map(Number);

        // Guardamos las preferencias en la base de datos.
        await preferenciasModel.guardarPreferencias(
            id_usuario,
            idsAlergias,
            idsIntolerancias
        );

        // Respondemos al frontend.
        return res.json({
            ok: true,
            mensaje: 'Preferencias guardadas correctamente.'
        });

    } catch (error) {

        console.error('Error al guardar preferencias:', error);

        return res.status(500).json({
            ok: false,
            mensaje: 'No se pudieron guardar las preferencias.'
        });
    }
};

module.exports = {
    obtenerPreferencias,
    guardarPreferencias
};
