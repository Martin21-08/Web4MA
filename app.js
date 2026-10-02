// Punto de entrada: prepara Express, recibe los formularios y conecta las rutas.
// En el registro, los datos pasan del formulario a req.body y luego a MySQL.
const express = require("express");
const path = require("path");

const session = require("express-session");

const flash = require("connect-flash");

require("dotenv").config();

const sessionSecret = process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === "production"
        ? undefined
        : require("crypto").randomBytes(32).toString("hex"));

if (!sessionSecret) {
    throw new Error("Define SESSION_SECRET en el entorno antes de iniciar en producción.");
}


const userRoutes =
    require("./routes/userRoutes");
const viewsRoutes =
    require("./routes/viewsRoutes");
const recetasRoutes =
    require("./routes/recetasRoutes");

const app = express();


// ======================================
// CONFIGURACIÓN EJS
// ======================================

app.set("view engine", "ejs");


// ======================================
// RECIBIR DATOS DE FORMULARIOS
// ======================================

// Convierte los campos HTML en un objeto que se puede leer como req.body.correo.
app.use(
    express.urlencoded({
        extended: true
    })
);


// ======================================
// RECIBIR JSON
// ======================================

app.use(express.json());


// ======================================
// ARCHIVOS PÚBLICOS
// ======================================

app.use(express.static("public"));


// ======================================
// SESSION
// ======================================

app.use(
    session({

        secret: sessionSecret,

        resave: false,

        saveUninitialized: false,

        cookie: { secure: process.env.NODE_ENV === "production" }
    })
);


// ======================================
// FLASH
// ======================================

//crear variables locales
app.use(flash()); //para poder usar los mensajes de error o exito en la vista

    app.use((req, res, next) => {

        res.locals.success = req.flash('success');

        res.locals.error = req.flash('error');

        res.locals.user = req.session.usuario || null;

        next();

    });


// ======================================
// RUTAS
// ======================================

// Estas rutas conectan las direcciones web con sus controladores.
// Publica únicamente el módulo de autenticación de Google desde su ubicación actual.
app.get("/Js/firebase-auth.js", (req, res, next) => {
    res.type("application/javascript");
    res.sendFile(path.join(__dirname, "controllers", "firebase-auth.js"), error => {
        if (error) next(error);
    });
});

// Publica solo la configuración web de Firebase que necesita el SDK del navegador.
app.get("/api/firebase-config", (req, res) => {
    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };
    const requiredKeys = [
        "apiKey",
        "authDomain",
        "projectId",
        "storageBucket",
        "messagingSenderId",
        "appId"
    ];
    const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

    // Evita almacenar una respuesta incompleta en caché mientras se corrige .env.
    res.set("Cache-Control", "no-store");
    if (missingKeys.length) {
        return res.status(503).json({
            error: "La autenticación Firebase no está configurada en el servidor.",
            faltantes: missingKeys
        });
    }

    return res.json(firebaseConfig);
});

app.get("/", (req, res) => {
    res.redirect("/usuarios/login");
});

app.use("/usuarios", userRoutes);
app.use("/", viewsRoutes);
app.use("/", recetasRoutes);


// ======================================
// SERVIDOR
// ======================================

app.listen(3000, () => {

    console.log(
        "Servidor funcionando en http://localhost:3000"
    );

});