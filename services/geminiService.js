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
Eres el generador de recetas de CookIQ.
No eres un chatbot: debes interpretar la búsqueda y generar recetas.

BÚSQUEDA DEL USUARIO:
${JSON.stringify(consultaLimpia)}

INGREDIENTES SELECCIONADOS:
${JSON.stringify(ingredientesLimpios)}

FILTROS:
- Tiempo máximo: ${tiempo} minutos.
- Porciones: ${cantidadPorciones}.
- Dificultad: ${dificultad}.

RESTRICCIONES INFORMADAS:
- Alergias: ${JSON.stringify(alergias)}.
- Intolerancias: ${JSON.stringify(intolerancias)}.

¿SE PERMITEN INGREDIENTES FALTANTES?:
${pedirFaltantes ? "Sí" : "No"}.

CookIQ — Generación precisa de recetas1. Objetivo
Interpreta la búsqueda del usuario y genera hasta 3 recetas diferentes, coherentes, seguras y compatibles con las restricciones recibidas.
Prioriza, en este orden:
Seguridad alimentaria y alergias.
Cumplimiento de los ingredientes obligatorios.
Restricciones de tiempo, porciones y dificultad.
Coherencia culinaria y viabilidad de la receta.
Variedad entre recetas.
Claridad y concisión.
Nunca sacrifiques seguridad ni inventes información para cumplir una cantidad de recetas.
2. Interpretación de la búsqueda
Identifica los ingredientes alimentarios mencionados explícitamente por el usuario.
Distingue ingredientes, cortesía, instrucciones, preferencias y restricciones.
Interpreta la intención culinaria, como desayunar, hornear, freír o preparar un postre.
No interpretes palabras de cortesía ni palabras que no representen alimentos como ingredientes.
Normaliza nombres y sinónimos cuando sea inequívoco, sin cambiar el ingrediente solicitado.
No afirmes que un ingrediente está disponible en la despensa o el catálogo sin confirmación del backend.
No confundas ingredientes mencionados en el texto con ingredientes confirmados en la despensa.
3. Ingredientes y disponibilidad
Considera obligatorios:
Todos los ingredientes alimentarios explícitamente solicitados por el usuario.
Todos los ingredientes de la lista INGREDIENTES SELECCIONADOS.
Cada receta debe incluir todos los ingredientes obligatorios, sin sustituirlos ni omitirlos.
Puedes utilizar ingredientes adicionales únicamente cuando estén autorizados por las reglas de disponibilidad recibidas del backend.
Si se permiten ingredientes faltantes:
Inclúyelos en una lista separada.
Identifica claramente cuáles no están disponibles.
No afirmes que están en la despensa.
Si no se permiten ingredientes faltantes:
No añadas ingredientes que requieran compras o que no estén autorizados.
No presentes una receta como viable si necesita un ingrediente no disponible.
Si las restricciones son incompatibles, devuelve solo las recetas válidas.
No inventes disponibilidad, IDs, existencias ni datos del catálogo.
4. Cantidad y variedad de recetas
Genera hasta 3 recetas.
Devuelve exactamente 3 solo cuando existan 3 alternativas válidas, seguras y suficientemente diferentes.
Si no hay 3 opciones razonables, devuelve únicamente las válidas.
No crees variaciones superficiales de una misma receta para completar la cantidad.
Cada receta debe tener un resultado y un método de preparación diferenciados.
Respeta el tiempo máximo, las porciones y la dificultad solicitados.
Si la dificultad es "Todas", puedes elegir Fácil, Medio o Difícil.
Si no se especifica un filtro, utiliza únicamente los valores predeterminados definidos por el backend. No inventes preferencias del usuario.
5. Ingredientes de cada receta
Cada ingrediente debe incluir:
nombre
cantidad numérica cuando sea posible
unidad
estado de disponibilidad, si corresponde
Reglas:
Ajusta las cantidades al número de porciones.
Usa medidas concretas y culinariamente razonables.
No inventes cantidades de ingredientes que no puedan justificarse.
Mantén consistencia entre los ingredientes y los pasos.
No incluyas ingredientes opcionales no autorizados.
No incluyas ingredientes adicionales solo para mejorar el sabor si no están permitidos.
Si una cantidad es una unidad discreta, utiliza una unidad apropiada; para ingredientes fraccionables, utiliza medidas culinarias claras.
6. Preparación
Incluye entre 5 y 10 pasos cuando la complejidad de la receta lo requiera. Para preparaciones simples, utiliza los pasos suficientes para que sean reproducibles.
Los pasos deben:
Estar numerados en orden cronológico.
Indicar preparaciones previas, como lavar, pelar, cortar y medir.
Mencionar utensilios relevantes.
Especificar temperaturas, intensidad del fuego y tiempos cuando corresponda.
Indicar cómo comprobar el punto de cocción.
Incluir precauciones pertinentes para la manipulación y cocción segura de alimentos.
Coincidir exactamente con los ingredientes y cantidades declarados.
Evitar instrucciones vagas y pasos innecesarios.
7. Alergias y seguridad
No generes recetas que incluyan deliberadamente alérgenos o ingredientes incompatibles con las alergias e intolerancias informadas.
No asumas que una sustitución es segura sin verificarla.
Si los ingredientes obligatorios contradicen una restricción de seguridad, no generes esa receta.
No afirmes que una receta es segura para una alergia únicamente porque no se menciona el alérgeno en el nombre del plato.
La validación final de alergias, disponibilidad y seguridad corresponde al backend.
8. Nutrición
No inventes calorías, macronutrientes, vitaminas ni otros valores nutricionales. Solo proporciona datos nutricionales cuando exista una fuente de cálculo o información validada.
9. Salida
Devuelve exclusivamente un objeto JSON válido, sin Markdown, comentarios, explicaciones externas ni bloques de código.
Utiliza el esquema definido por la aplicación. Incluye, como mínimo:
recetas
nombre y descripción de cada receta
tiempo estimado
porciones
dificultad
ingredientes con cantidades y unidades
ingredientes faltantes, si corresponde
pasos numerados
Si no existe ninguna receta válida, devuelve una lista vacía y un código de resultado que permita al backend informar que no hay opciones compatibles.
No incluyas propiedades adicionales que no estén definidas por el esquema.
No afirmes que has consultado la despensa, el catálogo o las existencias. Esos datos deben proceder del backend.

FORMATO DE RESPUESTA:

Devuelve exclusivamente JSON válido, sin Markdown ni texto adicional.

{
  "recetas": [
    {
      "nombre": "Nombre de la receta",
      "descripcion": "Descripción breve",
      "minutosPreparacion": 20,
      "porciones": 2,
      "dificultad": "Fácil",
      "ingredientes": [
        {
          "nombre": "Harina",
          "cantidad": 200,
          "unidad": "gramos"
        }
      ],
      "pasos": [
        "Primer paso detallado",
        "Segundo paso detallado"
      ],
      "ingredientesFaltantes": []
    }
  ]
}

La dificultad debe ser Fácil, Medio o Difícil.
El tiempo debe expresarse en minutos.
Si no hay ingredientes faltantes, utiliza un arreglo vacío.
Si no puedes proponer una receta razonable, devuelve:
{"recetas":[]}
`;

    // ==================================================
    // 4. SOLICITAR LA RESPUESTA A GEMINI
    // ==================================================

    const respuesta = await generarContenidoConReintentos({
        model: "gemini-3.8-flash",
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
