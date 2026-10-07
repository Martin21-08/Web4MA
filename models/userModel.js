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
    crearUsuario: async ({ 
        nombres, 
        apellidos, 
        correo, 
        telefono, 
        contrasena_hash }) => {
        // Los signos ? se rellenan con los valores de forma segura.
        // Mantiene los valores separados del SQL para que mysql2 ejecute una consulta parametrizada.
        const sql = 'INSERT INTO usuario (nombres, apellidos, correo, telefono, contrasena_hash) VALUES (?, ?, ?, ?, ?)';
        const [result] = await db.query(sql, [
            nombres, 
            apellidos, 
            correo, 
            telefono, 
            contrasena_hash]);
        return result.insertId;

    },
    
// Guarda el token de recuperación en la base de datos.
guardarTokenRecuperacion: async ({ id_usuario, token_hash, fecha_expiracion }) => {

    const sql = `
        INSERT INTO token_recuperacion
        (id_usuario, token_hash, fecha_expiracion)
        VALUES (?, ?, ?)
    `;

    const [result] = await db.query(sql, [
        id_usuario,
        token_hash,
        fecha_expiracion
    ]);

    return result.insertId;
},


// Busca un token de recuperación que todavía no haya sido utilizado.
buscarTokenRecuperacion: async (token_hash) => {

    const sql = `
        SELECT *
        FROM token_recuperacion
        WHERE token_hash = ?
        AND usado = FALSE
        LIMIT 1
    `;

    const [rows] = await db.query(sql, [token_hash]);

    return rows[0];
},


// Cambia la contraseña del usuario.
actualizarContrasena: async (id_usuario, contrasena_hash) => {

    const sql = `
        UPDATE usuario
        SET contrasena_hash = ?
        WHERE id_usuario = ?
    `;

    const [result] = await db.query(sql, [
        contrasena_hash,
        id_usuario
    ]);

    return result.affectedRows;
},


// Marca el token como utilizado para que no pueda volver a usarse.
marcarTokenUsado: async (id_token_recuperacion) => {

    const sql = `
        UPDATE token_recuperacion
        SET usado = TRUE,
            fecha_uso = CURRENT_TIMESTAMP
        WHERE id_token_recuperacion = ?
    `;

    const [result] = await db.query(sql, [
        id_token_recuperacion
    ]);

    return result.affectedRows;
},

};

module.exports = userModel;