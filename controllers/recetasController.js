
const ingredienteModel = require('../models/ingredienteModel');
const recetaModel = require('../models/recetaModel');

const {
    generarRecetasConGemini
} = require('../services/geminiService');
const { generarImagenReceta } = require('../services/imagenRecetaService');

const sanitizarMensajeError = mensaje => {
    const credenciales = [process.env.GEMINI_API_KEY, process.env.MYSQL_PASSWORD]
        .filter(Boolean);
    return credenciales.reduce(
        (texto, credencial) => texto.replaceAll(credencial, '[REDACTED]'),
        String(mensaje || 'Sin mensaje de error')
    ).replace(/(api[-_ ]?key|password|authorization|bearer)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');
};


// ==================================================
// 1. LISTAR INGREDIENTES DESDE MYSQL
// ==================================================

const listarIngredientes = async (req, res, next) => {
    try {
        // Consulta los ingredientes guardados en la base de datos.
        const ingredientes = await ingredienteModel.obtenerTodos();

        // Devuelve los ingredientes al frontend.
        return res.json({
            ok: true,
            ingredientes
        });

    } catch (error) {
        next(error);
    }
};


// ==================================================
// 2. GENERAR RECETAS CON GEMINI
// ==================================================

const generarRecetas = async (req, res, next) => {
    try {
        // Recibe la frase, los ingredientes y los filtros.
        const {
            consulta = '',
            ingredientes = [],
            tiempoMaximo = 30,
            porciones = 2,
            dificultad = 'Todas',
            pedirFaltantes = false
        } = req.body;

        // Comprueba el formato de la frase.
        if (typeof consulta !== 'string') {
            return res.status(400).json({
                ok: false,
                mensaje: 'La búsqueda debe ser un texto válido.'
            });
        }

        // Comprueba el formato de los ingredientes.
        if (!Array.isArray(ingredientes)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Los ingredientes deben enviarse como una lista.'
            });
        }

        // Evita recibir ingredientes con tipos incorrectos.
        if (
            ingredientes.some(
                ingrediente =>
                    typeof ingrediente !== 'string' ||
                    !ingrediente.trim()
            )
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La lista contiene ingredientes inválidos.'
            });
        }

        // La búsqueda debe contener una frase o ingredientes.
        if (!consulta.trim() && ingredientes.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Escribe algo en el buscador o selecciona ingredientes.'
            });
        }

        // Valida el tiempo máximo.
        const tiempo = Number(tiempoMaximo);

        if (!Number.isFinite(tiempo) || tiempo <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El tiempo máximo debe ser un número positivo.'
            });
        }

        // Valida las porciones.
        const cantidadPorciones = Number(porciones);

        if (
            !Number.isInteger(cantidadPorciones) ||
            cantidadPorciones < 1
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La cantidad de porciones no es válida.'
            });
        }

        // Valida la dificultad.
        const dificultadesValidas = [
            'Todas',
            'Fácil',
            'Medio',
            'Difícil'
        ];

        if (!dificultadesValidas.includes(dificultad)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La dificultad seleccionada no es válida.'
            });
        }

        // Valida la opción de ingredientes faltantes.
        if (typeof pedirFaltantes !== 'boolean') {
            return res.status(400).json({
                ok: false,
                mensaje: 'La opción de ingredientes faltantes no es válida.'
            });
        }

        // Por ahora, las restricciones pueden llegar en la solicitud.
        // Más adelante se obtendrán de las preferencias verificadas en MySQL.
        const { alergias = [], intolerancias = [] } = req.body;

        if (
            !Array.isArray(alergias) ||
            !Array.isArray(intolerancias)
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Las alergias e intolerancias deben enviarse como listas.'
            });
        }

        const idUsuarioSesion = req.session?.usuario?.id_usuario;
        const idUsuario = idUsuarioSesion === undefined || idUsuarioSesion === null
            ? null
            : Number(idUsuarioSesion);
        const textoBusqueda = [consulta.trim(), ...ingredientes.map(ingrediente => ingrediente.trim())]
            .filter(Boolean)
            .join(' | ')
            .slice(0, 500);

        if (idUsuario !== null) {
            try {
                await recetaModel.registrarBusqueda({
                    idUsuario,
                    textoBusqueda,
                    dificultadSolicitada: dificultad,
                    minutosMaximos: tiempo,
                    porciones: cantidadPorciones
                });
            } catch (error) {
                console.error('[MySQL historial_busqueda] Falló el INSERT del historial:', {
                    code: error?.code || null,
                    errno: error?.errno || null,
                    message: sanitizarMensajeError(error?.sqlMessage || error?.message)
                });
                return res.status(500).json({
                    ok: false,
                    mensaje: 'No se pudo guardar el historial de búsqueda. Inténtalo nuevamente más tarde.'
                });
            }
        }

        // Llama al servicio que se comunica con Gemini.
        let recetas;
        try {
            recetas = await generarRecetasConGemini({
                consulta: consulta.trim(),
                ingredientes: ingredientes.map(
                    ingrediente => ingrediente.trim()
                ),
                tiempoMaximo: tiempo,
                porciones: cantidadPorciones,
                dificultad,
                alergias,
                intolerancias,
                pedirFaltantes
            });
        } catch (error) {
            const statusOriginal = error?.status ?? error?.response?.status ?? null;
            const codigoOriginal = error?.code ?? error?.error?.code ?? statusOriginal;
            const statusGemini = Number(statusOriginal ?? codigoOriginal);
            const mensajeGemini = sanitizarMensajeError(error?.message || String(error));
            console.error('[Gemini texto] Falló generateContent:', {
                httpStatus: statusOriginal !== null && Number.isFinite(Number(statusOriginal))
                    ? Number(statusOriginal)
                    : null,
                code: codigoOriginal === null ? null : sanitizarMensajeError(codigoOriginal),
                message: mensajeGemini
            });
            const servicioOcupado = statusGemini === 503 ||
                /high demand|overload(?:ed)?|resource exhausted|temporarily unavailable|service unavailable|\bUNAVAILABLE\b/i.test(mensajeGemini);

            if (servicioOcupado) {
                return res.status(503).json({
                    ok: false,
                    mensaje: 'El servicio de recetas está ocupado. Inténtalo nuevamente en unos minutos.'
                });
            }

            return res.status(502).json({
                ok: false,
                mensaje: 'No se pudieron generar las recetas en este momento. Inténtalo nuevamente más tarde.'
            });
        }

        const recetasConImagen = await Promise.all(recetas.map(async receta => {
            try {
                const imagenUrl = await generarImagenReceta(receta);
                return { ...receta, imagenUrl: imagenUrl || null };
            } catch (error) {
                console.error('Error inesperado al generar la imagen de una receta:', error?.code || error?.name || 'Error');
                return { ...receta, imagenUrl: null };
            }
        }));

        try {
            await recetaModel.guardarGeneradas(recetasConImagen, {
                idUsuario,
                dificultadSolicitada: dificultad === 'Todas' ? 'Todas' : dificultad,
                minutosMaximos: tiempo,
                porciones: cantidadPorciones
            });
        } catch (error) {
            console.error('[MySQL recetas] Falló la transacción de guardado:', {
                code: error?.code || null,
                errno: error?.errno || null,
                message: sanitizarMensajeError(error?.sqlMessage || error?.message)
            });
            return res.status(500).json({
                ok: false,
                mensaje: 'Gemini generó las recetas, pero no se pudieron guardar. Inténtalo nuevamente más tarde.'
            });
        }

        // Devuelve las recetas generadas.
        return res.json({
            ok: true,
            cantidad: recetasConImagen.length,
            recetas: recetasConImagen
        });

    } catch (error) {
        next(error);
    }
};


// ==================================================
// 3. EXPORTAR FUNCIONES
// ==================================================

module.exports = {
    listarIngredientes,
    generarRecetas
};
