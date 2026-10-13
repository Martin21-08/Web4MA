const { GoogleGenAI } = require("@google/genai");
const { agregarImagenes } = require("./unsplashService");

// ==================================================
// 1. CONFIGURAR GEMINI
// ==================================================

if (!process.env.GEMINI_API_KEY) {
    throw new Error(
        "Falta configurar GEMINI_API_KEY en el archivo .env"
    );
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const esperasReintentoMs = [1000, 2000, 4000];

const obtenerCodigoTemporalGemini = error => {
    const status = Number(error?.status ?? error?.response?.status);
    if (status === 429 || status === 503) return status;

    const detalles = [error?.code, error?.error?.status, error?.message]
        .filter(Boolean)
        .join(' ');
    if (/\bRESOURCE_EXHAUSTED\b/i.test(detalles)) return 429;
    if (/\bUNAVAILABLE\b/i.test(detalles)) return 503;
    return null;
};

const generarContenidoConReintentos = async solicitud => {
    for (let intento = 0; ; intento += 1) {
        try {
            return await ai.models.generateContent(solicitud);
        } catch (error) {
            const codigoTemporal = obtenerCodigoTemporalGemini(error);
            const codigoRegistro = error?.status ?? error?.code ?? codigoTemporal ?? 'sin código';
            console.error(`[Gemini texto] Intento ${intento + 1}/${esperasReintentoMs.length + 1} falló; código ${codigoRegistro}.`);

            if (codigoTemporal === null) throw error;

            if (intento >= esperasReintentoMs.length) {
                const nombreCodigo = codigoTemporal === 429 ? 'RESOURCE_EXHAUSTED' : 'UNAVAILABLE';
                const errorFinal = new Error(
                    `Gemini no respondió después de ${intento + 1} intentos (HTTP ${codigoTemporal} ${nombreCodigo}). Inténtalo de nuevo más tarde.`
                );
                errorFinal.status = codigoTemporal;
                errorFinal.code = error?.code || nombreCodigo;
                errorFinal.cause = error;
                throw errorFinal;
            }

            await new Promise(resolve => setTimeout(resolve, esperasReintentoMs[intento]));
        }
    }
};

const normalizarIngrediente = valor => String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/s$/, '');

const extraerIngredientesConsulta = consulta => {
    const coincidencia = consulta.match(/\b(?:con|usando|ingredientes?:)\s+(.+)$/i);
    if (!coincidencia) return [];
    return coincidencia[1]
        .replace(/\b(?:para\s+\d+\s+porciones?|rapido|rapida|facil|faciles)\b.*$/i, '')
        .split(/\s*(?:,|;|\+|\by\b|\be\b)\s*/i)
        .map(item => item.replace(/^(?:un|una|unos|unas|el|la|los|las)\s+/i, '').trim())
        .filter(item => item && item.split(/\s+/).length <= 5);
};

const contieneIngrediente = (ingredientesReceta, solicitado) => {
    const objetivo = normalizarIngrediente(solicitado);
    if (!objetivo) return true;
    return ingredientesReceta.some(ingrediente => {
        const nombre = normalizarIngrediente(ingrediente.nombre);
        return nombre === objetivo || nombre.startsWith(`${objetivo} `) || objetivo.startsWith(`${nombre} `);
    });
};

const firmaReceta = receta => [
    receta.ingredientes
        .map(ingrediente => normalizarIngrediente(ingrediente.nombre))
        .sort()
        .join('|'),
    receta.pasos.map(paso => normalizarIngrediente(paso)).join('|')
].join('::');

// ==================================================
// 2. GENERAR RECETAS
// ==================================================

const generarRecetasConGemini = async ({
    consulta = "",
    ingredientes = [],
    tiempoMaximo = 30,
    porciones = 2,
    dificultad = "Todas",
    alergias = [],
    intolerancias = [],
    pedirFaltantes = false
}) => {

    // Comprueba que los ingredientes tengan un formato válido.
    if (!Array.isArray(ingredientes)) {
        throw new Error("Los ingredientes deben ser una lista.");
    }

    // Limpia los ingredientes recibidos.
    const ingredientesLimpios = ingredientes
        .filter(item => typeof item === "string")
        .map(item => item.trim())
        .filter(Boolean);

    // Limpia la frase escrita en el buscador.
    const consultaLimpia =
        typeof consulta === "string" ? consulta.trim() : "";

    // Debe existir una frase o al menos un ingrediente.
    if (!consultaLimpia && ingredientesLimpios.length === 0) {
        throw new Error(
            "Escribe una búsqueda o selecciona ingredientes."
        );
    }

    // Valida los filtros numéricos.
    const tiempo = Number(tiempoMaximo);
    const cantidadPorciones = Number(porciones);

    if (!Number.isFinite(tiempo) || tiempo <= 0) {
        throw new Error("El tiempo máximo no es válido.");
    }

    if (
        !Number.isInteger(cantidadPorciones) ||
        cantidadPorciones < 1
    ) {
        throw new Error("La cantidad de porciones no es válida.");
    }

    // Valida la dificultad.
    const dificultadesValidas = [
        "Todas",
        "Fácil",
        "Medio",
        "Difícil"
    ];

    if (!dificultadesValidas.includes(dificultad)) {
        throw new Error("La dificultad no es válida.");
    }

    // Comprueba las restricciones.
    if (!Array.isArray(alergias) ||
        !Array.isArray(intolerancias)) {
        throw new Error(
            "Las alergias e intolerancias deben ser listas."
        );
    }

    if (typeof pedirFaltantes !== "boolean") {
        throw new Error(
            "La opción de ingredientes faltantes no es válida."
        );
    }

    // ==================================================
    // 3. INSTRUCCIONES PARA GEMINI
    // ==================================================

    const prompt = `
Eres el generador de recetas de CookIQ. No conversas: solo generas recetas.

DATOS:
busqueda: ${JSON.stringify(consultaLimpia)}
ingredientes: ${JSON.stringify(ingredientesLimpios)}
tiempoMax: ${tiempo} min | porciones: ${cantidadPorciones} | dificultad: ${dificultad}
alergias: ${JSON.stringify(alergias)} | intolerancias: ${JSON.stringify(intolerancias)}
permitirFaltantes: ${pedirFaltantes ? "si" : "no"}

REGLAS:
1. Genera hasta 3 recetas. Devuelve solo las validas y claramente distintas; sin variaciones triviales para completar.
2. Prioridad: seguridad > ingredientes obligatorios > filtros (tiempo, porciones, dificultad) > coherencia culinaria.
3. Todos los ingredientes de "busqueda" e "ingredientes" son obligatorios: incluyelos completos, sin sustituir ni omitir. Ajusta cantidades a las porciones.
4. Nunca uses alergenos ni ingredientes incompatibles con alergias/intolerancias. Si un obligatorio contradice una restriccion, no generes esa receta. No supongas sustituciones seguras sin verificarlas.
5. Solo agrega ingredientes extra si permitirFaltantes es "si"; en ese caso listalos en ingredientesFaltantes sin afirmar que estan en la despensa. Si es "no", no uses nada no disponible y no presentes la receta como viable si le falta algo.
6. Pasos: 5 a 10, numerados, con preparacion previa, temperaturas, tiempos y punto de coccion. Deben coincidir exactamente con los ingredientes y cantidades.
7. No inventes datos nutricionales, disponibilidad del catalogo, IDs ni existencias. Eso lo valida el backend.
8. Al interpretar la busqueda, ignora cortesias y palabras que no sean alimentos.

SALIDA: exclusivamente JSON valido, sin Markdown ni texto adicional:
{"recetas":[{"nombre":"","descripcion":"","minutosPreparacion":0,"porciones":0,"dificultad":"Facil|Medio|Dificil","ingredientes":[{"nombre":"","cantidad":0,"unidad":""}],"pasos":["paso 1"],"ingredientesFaltantes":[]}]}
Sin recetas validas: {"recetas":[]}
No agregues propiedades extra.
`;

    // ==================================================
    // 4. SOLICITAR LA RESPUESTA A GEMINI
    // ==================================================

    const respuesta = await generarContenidoConReintentos({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            httpOptions: {
                retryOptions: {
                    attempts: 1,
                    httpStatusCodes: [429, 503]
                }
            }
        }
    });

    const texto = respuesta.text;

    if (!texto) {
        throw new Error("Gemini no devolvió una respuesta.");
    }

    // ==================================================
    // 5. PROCESAR Y VALIDAR EL JSON
    // ==================================================

    let resultado;

    try {
        resultado = JSON.parse(texto);
    } catch {
        throw new Error(
            "Gemini devolvió una respuesta JSON inválida."
        );
    }

    if (!resultado ||
        !Array.isArray(resultado.recetas)) {
        throw new Error(
            "La respuesta de Gemini no contiene una lista válida."
        );
    }

    // Comprueba los datos básicos de las recetas generadas.
    for (const receta of resultado.recetas) {
        if (
            typeof receta.nombre !== "string" ||
            !receta.nombre.trim() ||
            !Array.isArray(receta.ingredientes) ||
            !Array.isArray(receta.pasos) ||
            receta.pasos.length === 0
        ) {
            throw new Error(
                "Gemini generó una receta con datos incompletos."
            );
        }

        if (
            !Number.isFinite(Number(receta.minutosPreparacion)) ||
            Number(receta.minutosPreparacion) <= 0 ||
            Number(receta.minutosPreparacion) > tiempo
        ) {
            throw new Error(
                "Una receta no cumple el tiempo máximo solicitado."
            );
        }

        if (Number(receta.porciones) !== cantidadPorciones) {
            throw new Error(
                "Una receta no cumple las porciones solicitadas."
            );
        }

        if (!dificultadesValidas.includes(receta.dificultad)) {
            throw new Error(
                "Gemini devolvió una dificultad inválida."
            );
        }

        for (const ingrediente of receta.ingredientes) {
            if (
                typeof ingrediente.nombre !== "string" ||
                !Number.isFinite(Number(ingrediente.cantidad)) ||
                Number(ingrediente.cantidad) <= 0 ||
                typeof ingrediente.unidad !== "string"
            ) {
                throw new Error(
                    "Una receta contiene un ingrediente inválido."
                );
            }
        }
    }

    // Valida ingredientes explicitados en la frase y los seleccionados.
    const ingredientesSolicitados = [
        ...ingredientesLimpios,
        ...extraerIngredientesConsulta(consultaLimpia)
    ];
    const recetasValidas = resultado.recetas.filter(receta =>
        ingredientesSolicitados.every(solicitado => contieneIngrediente(receta.ingredientes, solicitado))
    );

    // Descarta variantes que repiten exactamente los mismos ingredientes.
    const firmas = new Set();
    const recetasDistintas = recetasValidas.filter(receta => {
        const firma = firmaReceta(receta);
        if (firmas.has(firma)) return false;
        firmas.add(firma);
        return true;
    }).slice(0, 3);

    // Conserva el contrato del controlador: devuelve un arreglo, que puede
    // tener menos de tres elementos cuando no haya suficientes opciones válidas.
    return await agregarImagenes(recetasDistintas);
};

// ==================================================
// 6. EXPORTAR LA FUNCIÓN
// ==================================================

module.exports = {
    generarRecetasConGemini
};
