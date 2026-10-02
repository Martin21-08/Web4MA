const express = require("express");

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