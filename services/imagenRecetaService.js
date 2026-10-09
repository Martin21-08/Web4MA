const { GoogleGenAI } = require('@google/genai');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const generarImagenReceta = async receta => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('No se puede generar la imagen: GEMINI_API_KEY no está configurada.');
      return null;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const ingredientes = Array.isArray(receta.ingredientes)
      ? receta.ingredientes.map(ingrediente => {
        if (typeof ingrediente === 'string') return ingrediente;
        return [ingrediente.nombre, ingrediente.cantidad, ingrediente.unidad]
          .filter(valor => valor !== undefined && valor !== null && valor !== '')
          .join(' ');
      }).join(', ')
      : '';
    const prompt = [
      'Genera una fotografía gastronómica fotorrealista del plato terminado.',
      'Presentación atractiva, luz natural suave, enfoque nítido y fondo discreto.',
      'Composición horizontal 16:9, sin texto, letras, marcas de agua ni elementos gráficos.',
      `Plato: ${receta.nombre || ''}.`,
      `Descripción: ${receta.descripcion || ''}.`,
      `Ingredientes: ${ingredientes}.`
    ].join('\n');

    const respuesta = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: prompt,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '16:9',
          imageSize: '1K'
        }
      }
    });

    const parteImagen = respuesta.candidates
      ?.flatMap(candidato => candidato.content?.parts || [])
      .filter(parte => parte.inlineData?.data)
      .at(-1);
    if (!parteImagen) {
      console.error(`Gemini no devolvió datos de imagen para la receta "${receta.nombre || 'sin nombre'}".`);
      return null;
    }

    const mimeType = parteImagen.inlineData.mimeType || 'image/png';
    const extension = ({
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp'
    })[mimeType];
    if (!extension) {
      console.error(`Gemini devolvió un formato de imagen no compatible para la receta "${receta.nombre || 'sin nombre'}".`);
      return null;
    }

    const nombreArchivo = `receta-${randomUUID()}.${extension}`;
    const carpetaImagenes = path.join(__dirname, '..', 'public', 'images', 'recetas-generadas');
    await fs.mkdir(carpetaImagenes, { recursive: true });
    await fs.writeFile(
      path.join(carpetaImagenes, nombreArchivo),
      Buffer.from(parteImagen.inlineData.data, 'base64')
    );

    return `/images/recetas-generadas/${nombreArchivo}`;
  } catch (error) {
    const clave = process.env.GEMINI_API_KEY;
    const mensaje = String(error?.message || 'Error desconocido')
      .replace(clave || '\u0000', '[REDACTED]');
    const codigo = error?.status || error?.code || error?.name || 'Error';
    console.error(`Falló la generación/guardado de imagen para "${receta?.nombre || 'receta sin nombre'}" (${codigo}): ${mensaje}`);
    return null;
  }
};

module.exports = { generarImagenReceta };
