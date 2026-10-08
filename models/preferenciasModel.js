const db = require('../config/db');

// Guarda las alergias e intolerancias seleccionadas por un usuario.
const preferenciasModel = {

    // Recupera los IDs de las preferencias actuales del usuario.
    obtenerPreferencias: async (id_usuario) => {
        const [alergias] = await db.query(
            'SELECT id_alergia FROM alergia_usuario WHERE id_usuario = ?',
            [id_usuario]
        );

        const [intolerancias] = await db.query(
            'SELECT id_intolerancia FROM intolerancia_usuario WHERE id_usuario = ?',
            [id_usuario]
        );

        return {
            alergias: alergias.map(fila => fila.id_alergia),
            intolerancias: intolerancias.map(fila => fila.id_intolerancia)
        };
    },

    guardarPreferencias: async (id_usuario, alergias, intolerancias) => {

        // Obtenemos una conexión del pool.
        const conexion = await db.getConnection();

        try {

            // Comenzamos una transacción.
            await conexion.beginTransaction();

            // -------------------------------------------------
            // ELIMINAR ALERGIAS ANTERIORES
            // -------------------------------------------------

            await conexion.query(
                'DELETE FROM alergia_usuario WHERE id_usuario = ?',
                [id_usuario]
            );

            // -------------------------------------------------
            // GUARDAR NUEVAS ALERGIAS
            // -------------------------------------------------

            if (alergias.length > 0) {

                const valoresAlergias = alergias.map(id_alergia => [
                    id_usuario,
                    id_alergia
                ]);

                await conexion.query(
                    'INSERT INTO alergia_usuario (id_usuario, id_alergia) VALUES ?',
                    [valoresAlergias]
                );
            }

            // -------------------------------------------------
            // ELIMINAR INTOLERANCIAS ANTERIORES
            // -------------------------------------------------

            await conexion.query(
                'DELETE FROM intolerancia_usuario WHERE id_usuario = ?',
                [id_usuario]
            );

            // -------------------------------------------------
            // GUARDAR NUEVAS INTOLERANCIAS
            // -------------------------------------------------

            if (intolerancias.length > 0) {

                const valoresIntolerancias = intolerancias.map(id_intolerancia => [
                    id_usuario,
                    id_intolerancia
                ]);

                await conexion.query(
                    'INSERT INTO intolerancia_usuario (id_usuario, id_intolerancia) VALUES ?',
                    [valoresIntolerancias]
                );
            }

            // Confirmamos todos los cambios.
            await conexion.commit();

        } catch (error) {

            // Si algo falla, deshacemos todos los cambios.
            await conexion.rollback();

            throw error;

        } finally {

            // Liberamos la conexión.
            conexion.release();
        }
    }
};

module.exports = preferenciasModel;
