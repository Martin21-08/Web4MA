const pool = require('../config/db');

/**
 * Busca un usuario mediante su Google ID.
 */
async function buscarPorGoogleId(googleId) {
    const [rows] = await pool.query(
        `
        SELECT
            id_usuario,
            nombres,
            apellidos,
            correo,
            telefono,
            google_id,
            id_suscripcion,
            tokens_disponibles,
            activo,
            creado_en,
            actualizado_en
        FROM usuario
        WHERE google_id = ?
        LIMIT 1
        `,
        [googleId]
    );

    return rows[0] || null;
}

/**
 * Busca un usuario mediante su correo.
 */
async function buscarPorCorreo(correo) {
    const [rows] = await pool.query(
        `
        SELECT
            id_usuario,
            nombres,
            apellidos,
            correo,
            telefono,
            contrasena_hash,
            google_id,
            id_suscripcion,
            tokens_disponibles,
            activo,
            creado_en,
            actualizado_en
        FROM usuario
        WHERE correo = ?
        LIMIT 1
        `,
        [correo]
    );

    return rows[0] || null;
}

/**
 * Busca un usuario mediante su teléfono.
 */
async function buscarPorTelefono(telefono) {
    const [rows] = await pool.query(
        `
        SELECT
            id_usuario,
            nombres,
            apellidos,
            correo,
            telefono,
            google_id,
            id_suscripcion,
            tokens_disponibles,
            activo,
            creado_en,
            actualizado_en
        FROM usuario
        WHERE telefono = ?
        LIMIT 1
        `,
        [telefono]
    );

    return rows[0] || null;
}

/**
 * Vincula una cuenta existente de CookIQ
 * con su Google ID.
 */
async function vincularGoogleId(idUsuario, googleId) {
    await pool.query(
        `
        UPDATE usuario
        SET google_id = ?
        WHERE id_usuario = ?
        `,
        [googleId, idUsuario]
    );

    return buscarPorId(idUsuario);
}

/**
 * Busca un usuario por su ID interno.
 */
async function buscarPorId(idUsuario) {
    const [rows] = await pool.query(
        `
        SELECT
            id_usuario,
            nombres,
            apellidos,
            correo,
            telefono,
            google_id,
            id_suscripcion,
            tokens_disponibles,
            activo,
            creado_en,
            actualizado_en
        FROM usuario
        WHERE id_usuario = ?
        LIMIT 1
        `,
        [idUsuario]
    );

    return rows[0] || null;
}

/**
 * Crea un usuario proveniente de Google.
 *
 * No se agrega firebase_uid.
 * Se utiliza google_id porque ese campo existe
 * realmente en la base de datos.
 */
async function crearUsuarioGoogle({
    nombres,
    apellidos,
    correo,
    googleId
}) {
    const [resultado] = await pool.query(
        `
        INSERT INTO usuario
        (
            nombres,
            apellidos,
            correo,
            google_id
        )
        VALUES (?, ?, ?, ?)
        `,
        [
            nombres,
            apellidos,
            correo,
            googleId
        ]
    );

    return buscarPorId(resultado.insertId);
}

/**
 * Crea un usuario mediante teléfono.
 *
 * Firebase verifica el teléfono.
 * CookIQ solamente almacena el teléfono.
 */
async function crearUsuarioTelefono({
    nombres,
    apellidos,
    correo,
    telefono
}) {
    const [resultado] = await pool.query(
        `
        INSERT INTO usuario
        (
            nombres,
            apellidos,
            correo,
            telefono
        )
        VALUES (?, ?, ?, ?)
        `,
        [
            nombres,
            apellidos,
            correo || null,
            telefono
        ]
    );

    return buscarPorId(resultado.insertId);
}

/**
 * Actualiza los datos personales de un usuario.
 */
async function actualizarPerfil(idUsuario, {
    nombres,
    apellidos,
    correo,
    telefono
}) {
    await pool.query(
        `
        UPDATE usuario
        SET
            nombres = ?,
            apellidos = ?,
            correo = ?,
            telefono = ?
        WHERE id_usuario = ?
        `,
        [
            nombres,
            apellidos,
            correo,
            telefono || null,
            idUsuario
        ]
    );

    return buscarPorId(idUsuario);
}

module.exports = {
    buscarPorGoogleId,
    buscarPorCorreo,
    buscarPorTelefono,
    vincularGoogleId,
    buscarPorId,
    crearUsuarioGoogle,
    crearUsuarioTelefono,
    actualizarPerfil
};