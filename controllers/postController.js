// Este controlador todavía es un esqueleto: debe importar el pool de config/db.js.
const db =  require('../config/db.js');

// Punto de entrada previsto para listar publicaciones desde la base de datos.
const index = async (req, res) => {
	// Pendiente: consultar POSTS y responder con JSON o una vista.
}

// Punto de entrada previsto para crear una publicación nueva.
const create = async (req, res) => {
	// Pendiente: validar title/body, insertar la publicación y responder.
}

// Pendiente: exportar index y create cuando se conecten a las rutas.
