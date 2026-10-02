const db = require('../config/db');

// Busca un usuario por su correo (login).
const userModel = {
    // Busca una cuenta por correo para comprobarla al entrar o registrarse.
    buscarPorCorreo: async (correo) => {
        const sql = 'SELECT * FROM usuario WHERE correo = ?';

        const [rows] = await db.query(sql, [correo]);
        return rows[0];

    },

// Inserta un usuario nuevo (registro).
    crearUsuario: async ({ nombres, apellidos, correo, telefono, contrasena_hash }) => {
        // Los signos ? se rellenan con los valores de forma segura.
        // Mantiene los valores separados del SQL para que mysql2 ejecute una consulta parametrizada.
        const sql = 'INSERT INTO usuario (nombres, apellidos, correo, telefono, contrasena_hash) VALUES (?, ?, ?, ?, ?)';
        const [result] = await db.query(sql, [nombres, apellidos, correo, telefono, contrasena_hash]);
        return result.insertId;

    },

};

module.exports = userModel;