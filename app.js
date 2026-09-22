require('dotenv').config();

// Crea la aplicación HTTP que recibe las peticiones del navegador.
const express = require('express');
const app = express();

// Usa el puerto definido en .env o 3000 cuando se ejecuta localmente.
const PORT = process.env.PORT || 3000;
console.log(PORT);

const user = process.env.DB_USER;
console.log(user);

const path = require('path');

// EJS permite renderizar HTML en el servidor usando las vistas de /views.
app.set('view engine', 'ejs');

// Convierte cuerpos JSON enviados por fetch en req.body.
app.use(express.json());
// Convierte datos de formularios HTML en req.body.
app.use(express.urlencoded({ extended: true }));

// Expone CSS, JavaScript e imágenes sin pasar por una ruta de controlador.
app.use(express.static(path.join(__dirname, 'public')));

/*
 * Firebase Authentication se ejecuta en el navegador porque allí se muestra la
 * ventana de Google. Esta ruta entrega ÚNICAMENTE la configuración web del
 * proyecto al módulo del navegador. Esa configuración (incluida apiKey) es
 * pública por diseño; no debe confundirse con una clave privada de servidor.
 *
 * Copia los valores que Firebase muestra en:
 * Configuración del proyecto > Tus apps > SDK setup and configuration
 * a las variables FIREBASE_* del archivo .env.
 */
app.get('/api/firebase-config', (req, res) => {
    // La configuración puede cambiar durante el desarrollo: nunca enviamos una
    // respuesta en caché que pudiera conservar el antiguo error 503.
    res.set('Cache-Control', 'no-store');

    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };

    // Sin estos datos el SDK no sabe a qué proyecto de Firebase conectarse.
    const faltantes = Object.entries(firebaseConfig)
        .filter(([, valor]) => !valor)
        .map(([clave]) => clave);

    if (faltantes.length > 0) {
        return res.status(503).json({
            error: 'Firebase aún no está configurado.',
            faltantes
        });
    }

    res.json(firebaseConfig);
});

// Estas rutas solo renderizan pantallas; la autorización real todavía es provisional.
app.get('/', (req, res) => {
    res.render('login');
});

app.get('/lobby', (req, res) => {
    res.render('lobby');
});

app.get('/favoritos', (req, res) => {
    res.render('favoritos');
});

app.get('/historial', (req, res) => {
    res.render('historial');
});

app.get('/despensa', (req, res) => {
    res.render('despensa');
});

app.get('/perfil', (req, res) => {
    res.render('perfil');
});

app.get('/register', (req, res) => {
    res.render('register');
});

// Recibe los cambios del frontend. Por ahora acusa recibo, pero no persiste en MySQL.
app.post('/api/datos', (req, res) => {
    const { clave, datos } = req.body;

    if (!clave) {
        return res.status(400).json({ error: 'La clave es obligatoria.' });
    }

    console.log('Datos recibidos del frontend:', clave, datos);
    res.status(200).json({ guardado: true });
});

// Registro clásico provisional: valida campos y devuelve al login.
app.post('/register', (req, res) => {
    const { nombre, apellido, correo, telefono, nacimiento, password } = req.body;

    if (!nombre || !apellido || !correo || !password) {
        return res.status(400).render('register', {
            mensaje: 'Completa los campos obligatorios.'
        });
    }

    console.log('-------------------------------------------------');
    console.log('Datos recibidos del formulario de registro:');
    console.log('Nombre:', nombre);
    console.log('Apellido:', apellido);
    console.log('Correo:', correo);
    console.log('Teléfono:', telefono);
    console.log('Fecha de nacimiento:', nacimiento);
    // No se debería imprimir una contraseña en producción; se conserva solo como aviso del flujo actual.
    console.log('Contraseña:', password);

    res.render('login', { mensaje: 'Registro exitoso' });
});

// Login clásico provisional; el navegador valida las credenciales contra localStorage.

app.post('/login', (req, res) => {
    const { 'email-login': email, 'password-login': password } = req.body;

    if (!email || !password) {
        return res.status(400).render('login', {
            mensaje: 'Completa los campos obligatorios.'
        });
    }

    console.log('-------------------------------------------------');
    console.log('Datos recibidos del formulario de inicio de sesión:');
    console.log('Correo:', email);
    // No se debería imprimir una contraseña en producción; se conserva solo como aviso del flujo actual.
    console.log('Contraseña:', password);

    res.render('lobby', { mensaje: 'Inicio de sesión exitoso' });
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
