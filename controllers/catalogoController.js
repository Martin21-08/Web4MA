// Importa las funciones que consultan los catálogos en MySQL.
const {
    obtenerAlergias,
    obtenerIntolerancias
} = require('../models/catalogomodel');


// Controlador que obtiene las alergias e intolerancias.
const mostrarCatalogos = async (req, res) => {

    try {

        // Obtiene las alergias activas desde la base de datos.
        const alergias = await obtenerAlergias();

        // Obtiene las intolerancias activas desde la base de datos.
        const intolerancias = await obtenerIntolerancias();

        // Devuelve los datos en formato JSON.
        res.json({
            alergias,
            intolerancias
        });

    } catch (error) {

        // Muestra el error en la consola para poder identificar el problema.
        console.error('Error al obtener los catálogos:', error);

        // Si ocurre un error, muestra un mensaje al usuario.
        res.status(500).send('Error al cargar alergias e intolerancias.');
    }
};


// Exporta el controlador para utilizarlo en las rutas.
module.exports = {
    mostrarCatalogos
};