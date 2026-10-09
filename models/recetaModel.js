const pool = require('../config/db'); // Ajusta la ruta si es necesario para llegar a tu db.js

const normalizarTexto = valor => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const aliasUnidades = {
  g: 'gramo', gramos: 'gramo', gr: 'gramo',
  kg: 'kilogramo', kilos: 'kilogramo', kilogramos: 'kilogramo',
  ml: 'mililitro', mililitros: 'mililitro',
  l: 'litro', litros: 'litro',
  un: 'unidad', u: 'unidad', unidades: 'unidad',
  tazas: 'taza',
  cda: 'cucharada', cdas: 'cucharada', cucharadas: 'cucharada',
  cdta: 'cucharadita', cdtas: 'cucharadita', cucharaditas: 'cucharadita'
};

const buscarUnidad = (unidades, valor) => {
  const normalizada = normalizarTexto(valor);
  const nombreCanonico = aliasUnidades[normalizada] || normalizada;
  return unidades.find(unidad => (
    normalizarTexto(unidad.nombre) === nombreCanonico ||
    normalizarTexto(unidad.abreviatura) === normalizada
  )) || null;
};

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
  },

  // Registra una búsqueda autenticada una sola vez por solicitud.
  registrarBusqueda: async ({ idUsuario, textoBusqueda, dificultadSolicitada, minutosMaximos, porciones }) => {
    if (!Number.isInteger(idUsuario) || idUsuario < 1) {
      throw new Error('La sesión contiene un identificador de usuario inválido.');
    }

    let dificultadSolicitadaId = null;
    if (dificultadSolicitada && dificultadSolicitada !== 'Todas') {
      const [dificultades] = await pool.execute(
        'SELECT id_dificultad FROM dificultad WHERE nombre = ? LIMIT 1',
        [dificultadSolicitada]
      );
      if (!dificultades.length) throw new Error('No existe la dificultad solicitada en el catálogo.');
      dificultadSolicitadaId = dificultades[0].id_dificultad;
    }

    await pool.execute(
      `INSERT INTO historial_busqueda
        (id_usuario, texto_busqueda, id_dificultad, minutos_maximos, cantidad_porciones)
       VALUES (?, ?, ?, ?, ?)`,
      [idUsuario, textoBusqueda || null, dificultadSolicitadaId, minutosMaximos, porciones]
    );
  },

  // Persiste recetas de Gemini y todas sus relaciones en el esquema actual.
  guardarGeneradas: async (recetas, { idUsuario = null, dificultadSolicitada, minutosMaximos, porciones }) => {
    const connection = await pool.getConnection();
    let transaccionIniciada = false;
    try {
      await connection.beginTransaction();
      transaccionIniciada = true;

      if (idUsuario !== null && (!Number.isInteger(idUsuario) || idUsuario < 1)) {
        throw new Error('La sesión contiene un identificador de usuario inválido.');
      }
      let dificultadSolicitadaId = null;
      if (dificultadSolicitada && dificultadSolicitada !== 'Todas') {
        const [dificultades] = await connection.execute(
          'SELECT id_dificultad FROM dificultad WHERE nombre = ? LIMIT 1',
          [dificultadSolicitada]
        );
        if (!dificultades.length) throw new Error('No existe la dificultad solicitada en el catálogo.');
        dificultadSolicitadaId = dificultades[0].id_dificultad;
      }
      const [unidades] = await connection.execute(
        'SELECT id_unidad, nombre, abreviatura, familia FROM unidad_medida'
      );

      for (const receta of recetas) {
        const [dificultadesReceta] = await connection.execute(
          'SELECT id_dificultad FROM dificultad WHERE nombre = ? LIMIT 1',
          [receta.dificultad]
        );
        if (!dificultadesReceta.length) throw new Error('La dificultad generada no existe en el catálogo.');

        const [resultadoReceta] = await connection.execute(
          `INSERT INTO receta
            (id_usuario, nombre, descripcion, id_dificultad, minutos_preparacion,
             cantidad_porciones, origen, generada_por_ia, visibilidad, estado, imagen_url)
           VALUES (?, ?, ?, ?, ?, ?, 'ia', 1, 'privada', 'generada', ?)`,
          [
            idUsuario,
            receta.nombre,
            receta.descripcion || null,
            dificultadesReceta[0].id_dificultad,
            Number(receta.minutosPreparacion),
            Number(receta.porciones),
            receta.imagenUrl || null
          ]
        );
        const idReceta = resultadoReceta.insertId;

        let idGeneracion = null;
        if (idUsuario !== null) {
          const [resultadoGeneracion] = await connection.execute(
            `INSERT INTO generacion_ia
              (id_usuario, id_receta, tipo, modelo, dificultad_solicitada,
               minutos_maximos_solicitados, porciones_solicitadas, estado)
             VALUES (?, ?, 'generada_nueva', 'gemini-3.8-flash', ?, ?, ?, 'exito')`,
            [idUsuario, idReceta, dificultadSolicitadaId, minutosMaximos, porciones]
          );
          idGeneracion = resultadoGeneracion.insertId;
        }

        for (let indice = 0; indice < receta.pasos.length; indice += 1) {
          await connection.execute(
            'INSERT INTO paso_receta (id_receta, numero_paso, descripcion) VALUES (?, ?, ?)',
            [idReceta, indice + 1, receta.pasos[indice]]
          );
        }

        const ingredientesPorId = new Map();
        for (const ingrediente of receta.ingredientes) {
          const nombre = String(ingrediente.nombre || '').trim();
          if (!nombre) throw new Error('Una receta contiene un ingrediente sin nombre.');
          const unidad = buscarUnidad(unidades, ingrediente.unidad);
          const familia = unidad?.familia || (/(ml|litro|taza|cucharad|cdta|mililitro)/i.test(ingrediente.unidad) ? 'volumen' : 'unidad');
          const [resultadoIngrediente] = await connection.execute(
            `INSERT INTO ingrediente (nombre, familia_unidad, creado_por_ia, estado, activo)
             VALUES (?, ?, 1, 'pendiente', 1)
             ON DUPLICATE KEY UPDATE id_ingrediente = LAST_INSERT_ID(id_ingrediente)`,
            [nombre, familia]
          );
          const idIngrediente = resultadoIngrediente.insertId;
          const dato = {
            cantidad: Number(ingrediente.cantidad),
            unidad,
            unidadOriginal: String(ingrediente.unidad || '').trim()
          };
          const grupo = ingredientesPorId.get(idIngrediente) || [];
          grupo.push(dato);
          ingredientesPorId.set(idIngrediente, grupo);
        }

        for (const [idIngrediente, grupo] of ingredientesPorId) {
          const unidadUnica = grupo[0].unidad;
          const mismaUnidad = Boolean(unidadUnica) && grupo.every(dato => dato.unidad?.id_unidad === unidadUnica.id_unidad);
          const cantidad = mismaUnidad ? grupo.reduce((total, dato) => total + dato.cantidad, 0) : null;
          const indicacion = mismaUnidad ? null : grupo
            .map(dato => `${dato.cantidad} ${dato.unidadOriginal}`.trim())
            .join('; ');

          await connection.execute(
            `INSERT INTO receta_ingrediente (id_receta, id_ingrediente, cantidad, id_unidad, indicacion)
             VALUES (?, ?, ?, ?, ?)`,
            [idReceta, idIngrediente, cantidad, mismaUnidad ? unidadUnica.id_unidad : null, indicacion]
          );

          if (idGeneracion !== null) {
            await connection.execute(
              `INSERT INTO generacion_ia_ingrediente (id_generacion, id_ingrediente, cantidad, id_unidad)
               VALUES (?, ?, ?, ?)`,
              [idGeneracion, idIngrediente, cantidad, mismaUnidad ? unidadUnica.id_unidad : null]
            );
          }
        }
      }

      await connection.commit();
      transaccionIniciada = false;
    } catch (error) {
      if (transaccionIniciada) {
        try {
          await connection.rollback();
        } catch {
          // Conserva el error original si también falla el rollback.
        }
      }
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = RecetaModel;
