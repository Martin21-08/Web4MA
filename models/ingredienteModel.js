// Contiene las consultas MySQL relacionadas con los ingredientes.
const db = require('../config/db');

// Pide todos los ingredientes y los ordena por nombre.
const obtenerTodos = async () => {
    const [filas] = await db.query(`
        SELECT id_ingrediente, nombre
        FROM ingrediente
        ORDER BY nombre ASC
    `);
    return filas;
};

module.exports = { 
    
    obtenerTodos 

};
