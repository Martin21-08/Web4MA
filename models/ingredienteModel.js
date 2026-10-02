const db = require('../config/db');

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
