// Atiende las peticiones de recetas y usa el modelo cuando necesita ingredientes.
const ingredienteModel = require('../models/ingredienteModel');

const listarIngredientes = async (req, res, next) => {
    try {
        // El modelo consulta MySQL y el controlador devuelve el resultado como JSON.
        const ingredientes = await ingredienteModel.obtenerTodos();
        res.json({ ok: true, ingredientes });
    } catch (error) {
        next(error);
    }
};

const generarRecetas = async (req, res, next) => {
    try {
        // Los ingredientes ya fueron revisados por el middleware de la ruta.
        const { ingredientes } = req.body;
        // Aquí se conectará Gemini más adelante.
        const recetas = ingredientes.map((ingrediente) => ({
            nombre: `Receta con ${ingrediente}`
        }));
        res.json({ ok: true, recetas });
    } catch (error) {
        next(error);
    }
};

module.exports = { listarIngredientes, generarRecetas };
