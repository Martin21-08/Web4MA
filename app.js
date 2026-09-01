const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
    res.send('<h1> INDEX </h1>');
});

app.get('/servicios', (req, res) => {
    res.send('<h1> SERVICIOS </h1>');
});

app.get('/contacto', (req, res) => {
    res.send('<h1> CONTACTO </h1>');
});


app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});


