const pool = require('../config/db');

const HistorialModel = {
  registrarBusqueda: async ({ idUsuario, textoBusqueda, dificultadSolicitada, minutosMaximos, porciones }) => {
    if (!Number.isInteger(idUsuario) || idUsuario < 1) {
      throw new Error('La sesión contiene un identificador de usuario inválido.');
    }

    // "Todas" no representa una fila del catálogo: se almacena como NULL,
    // permitido por la FK id_dificultad y su acción ON DELETE SET NULL.
    let idDificultad = null;
    if (dificultadSolicitada && dificultadSolicitada !== 'Todas') {
      const [filas] = await pool.execute(
        'SELECT id_dificultad FROM dificultad WHERE nombre = ? LIMIT 1',
        [dificultadSolicitada]
      );
      if (!filas.length) throw new Error('No existe la dificultad solicitada en el catálogo.');
      idDificultad = filas[0].id_dificultad;
    }

    const [resultado] = await pool.execute(
      `INSERT INTO historial_busqueda
        (id_usuario, texto_busqueda, id_dificultad, max_minutos, cantidad_porciones)
       VALUES (?, ?, ?, ?, ?)`,
      [idUsuario, textoBusqueda || null, idDificultad, minutosMaximos, porciones]
    );
    return resultado.insertId;
  },

  obtenerPorUsuario: async idUsuario => {
    const [filas] = await pool.execute(
      `SELECT h.id_busqueda, h.texto_busqueda, h.id_dificultad,
              d.nombre AS dificultad, h.minutos_maximos,
              h.cantidad_porciones, h.fecha_busqueda
       FROM historial_busqueda h
       LEFT JOIN dificultad d ON d.id_dificultad = h.id_dificultad
       WHERE h.id_usuario = ?
       ORDER BY h.fecha_busqueda DESC, h.id_busqueda DESC`,
      [idUsuario]
    );
    return filas;
  }
};

module.exports = HistorialModel;
