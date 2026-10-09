
const { GoogleGenAI } = require("@google/genai");

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

INTERPRETACIÓN DE LA BÚSQUEDA:

1. Interpreta frases naturales como:
   "Hola, quiero hacer algo con pan, huevo y harina".
2. Identifica los ingredientes que menciona el usuario.
3. Distingue los ingredientes de las palabras de cortesía.
4. Si el usuario expresa una intención culinaria concreta,
   tenla en cuenta al generar las recetas.
5. No interpretes como ingrediente una palabra que claramente
   no representa un alimento.
6. Prioriza los ingredientes que el usuario indicó.
7. No afirmes que un ingrediente existe en la despensa o en
   el catálogo de CookIQ sin que el backend lo haya comprobado.

REGLAS PARA LAS RECETAS:

1. Genera hasta 3 recetas distintas.
2. Respeta el tiempo máximo y las porciones solicitadas.
3. Respeta la dificultad elegida; si es "Todas", puedes elegir
   entre Fácil, Medio y Difícil.
4. Si no se permiten ingredientes faltantes, no agregues
   ingredientes opcionales que el usuario no haya autorizado.
5. Si se permiten ingredientes faltantes, indícalos por separado.
6. No inventes información nutricional.
7. No generes recetas que incluyan deliberadamente ingredientes
   asociados a las alergias o intolerancias informadas.
8. La respuesta de la IA no sustituye la validación de seguridad
   alimentaria que debe realizar el backend.

REGLAS PARA LOS INGREDIENTES:

1. Cada ingrediente debe tener nombre, cantidad y unidad.
2. Utiliza cantidades coherentes con las porciones.
3. Evita cantidades imprecisas cuando puedas indicar una medida.
4. Los ingredientes deben coincidir con los utilizados en los pasos.
5. Los ingredientes faltantes deben identificarse por separado.

REGLAS PARA LOS PASOS:

1. Incluye entre 5 y 10 pasos cuando la receta lo requiera.
2. Numera los pasos en orden cronológico.
3. Explica las preparaciones previas: lavar, pelar, cortar o medir.
4. Indica utensilios cuando sea relevante.
5. Especifica temperatura, intensidad del fuego y tiempos
   cuando corresponda.
6. Explica cómo comprobar que los alimentos están cocidos.
7. Divide las tareas complejas en pasos concretos.
8. No omitas etapas necesarias.
9. Evita instrucciones vagas como "cocina hasta que esté listo".
10. Asegura que los pasos coincidan con las cantidades indicadas.
11. Incluye medidas de seguridad alimentaria cuando corresponda.

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

    // Devuelve las recetas al controlador.
    return resultado.recetas;
};

// ==================================================
// 6. EXPORTAR LA FUNCIÓN
// ==================================================

module.exports = {
    generarRecetasConGemini
};
