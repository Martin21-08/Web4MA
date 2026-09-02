require('dotenv').config();

const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
console.log(PORT);

const user = process.env.DB_USER;
console.log(user);

const path = require('path');

//configuracion de ejs
app.set('view engine', 'ejs');

//Archivos estaticos
// CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS
// Esta línea le dice a Express que sirva todo lo que esté en la carpeta 'public' [2]
app.use(express.static(path.join(__dirname, 'public'))); // [1, 6]

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


app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});


