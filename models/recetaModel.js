const pool = require('../config/db'); // Ajusta la ruta si es necesario para llegar a tu db.js

const RecetaModel = {
  // 1. Crear una nueva receta
  crear: async (datosReceta) => {
    const { titulo, descripcion, tiempo_preparacion, porciones, usuario_id } = datosReceta;
    const query = `
      INSERT INTO recetas (titulo, descripcion, tiempo_preparacion, porciones, usuario_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [resultado] = await pool.execute(query, [titulo, descripcion, tiempo_preparacion, porciones, usuario_id]);
    return resultado.insertId; // Retorna el ID de la receta recién creada
  },

  // 2. Obtener todas las recetas
  obtenerTodas: async () => {
    const query = 'SELECT * FROM recetas';
    const [filas] = await pool.execute(query);
    return filas;
  },

  // 3. Obtener una receta específica por su ID
  obtenerPorId: async (id) => {
    const query = 'SELECT * FROM recetas WHERE id = ?';
    const [filas] = await pool.execute(query, [id]);
    return filas[0] || null; // Retorna la receta o null si no existe
  },

  // 4. Actualizar una receta
  actualizar: async (id, datosActualizados) => {
    const { titulo, descripcion, tiempo_preparacion, porciones } = datosActualizados;
    const query = `
      UPDATE recetas 
      SET titulo = ?, descripcion = ?, tiempo_preparacion = ?, porciones = ?
      WHERE id = ?
    `;
    const [resultado] = await pool.execute(query, [titulo, descripcion, tiempo_preparacion, porciones, id]);
    return resultado.affectedRows > 0;
  },

  // 5. Eliminar una receta
  eliminar: async (id) => {
    const query = 'DELETE FROM recetas WHERE id = ?';
    const [resultado] = await pool.execute(query, [id]);
    return resultado.affectedRows > 0;
  }
};

module.exports = RecetaModel;
