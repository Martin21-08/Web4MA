
async function buscarCandidatas(nombreReceta) {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!accessKey || !nombreReceta?.trim()) {
        return [];
    }

    try {
        const parametros = new URLSearchParams({
            query: `${nombreReceta.trim()} food`,
            per_page: "5",
            orientation: "landscape"
        });

        const respuesta = await fetch(
            `https://api.unsplash.com/search/photos?${parametros}`,
            {
                headers: {
                    Authorization: `Client-ID ${accessKey}`
                },
                signal: AbortSignal.timeout(8000)
            }
        );

        if (!respuesta.ok) {
            console.error(
                "Error de Unsplash:",
                respuesta.status
            );
            return [];
        }

        const datos = await respuesta.json();
        return datos.results || [];
    } catch (error) {
        console.error("Error buscando imagen:", error.message);
        return [];
    }
}

async function agregarImagenes(recetas) {
    // Lanza todas las búsquedas al mismo tiempo.
    const candidatasPorReceta = await Promise.all(
        recetas.map(receta => buscarCandidatas(receta.nombre))
    );

    // Evita reutilizar la misma fotografía entre recetas,
    // siempre que Unsplash ofrezca alternativas.
    const fotosUtilizadas = new Set();

    return recetas.map((receta, indice) => {
        const candidatas = candidatasPorReceta[indice];

        const foto =
            candidatas.find(
                candidata => !fotosUtilizadas.has(candidata.id)
            ) || candidatas[0];

        if (!foto) {
            return { ...receta, imagen: null };
        }

        fotosUtilizadas.add(foto.id);

        return {
            ...receta,
            imagen: {
                url: foto.urls.regular,
                alt: foto.alt_description || receta.nombre,
                autor: foto.user.name,
                autorUrl: foto.user.links.html,
                fuenteUrl: foto.links.html
            }
        };
    });
}

module.exports = { agregarImagenes };
