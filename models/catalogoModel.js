// Importa la conexión compartida con MySQL.
const pool = require('../config/db');

// Obtiene todas las alergias que están activas en el catálogo.
const obtenerAlergias = async () => {

    const [filas] = await pool.query(`
        SELECT 
            id_alergia,
            nombre,
            descripcion
        FROM catalogo_alergia
        WHERE activo = TRUE
        ORDER BY nombre;
    `);

    return filas;
};

// Obtiene todas las intolerancias que están activas en el catálogo.
const obtenerIntolerancias = async () => {

    const [filas] = await pool.query(`
        SELECT 
            id_intolerancia,
            nombre,
            descripcion
        FROM catalogo_intolerancia
        WHERE activo = TRUE
        ORDER BY nombre;
    `);

    return filas;
};

// Exporta las funciones para que el controlador pueda utilizarlas.
module.exports = {
    obtenerAlergias,
    obtenerIntolerancias
};