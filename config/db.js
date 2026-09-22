// Importa el cliente asíncrono de MySQL para poder usar async/await.
const mysql = require('mysql2/promise');

// El pool reutiliza conexiones y evita abrir una conexión nueva por cada petición.
const pool = mysql.createPool({
    // Todas estas credenciales se leen desde .env y no deben escribirse en el código.
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    port: process.env.MYSQL_PUERTO,
    // Limita la cantidad de conexiones simultáneas contra MySQL.
    waitForConnections: true,
    connectionLimit: 10,
    // 0 significa que no se limita la cola de solicitudes pendientes.
    queueLimit:0,
    ssl: {
        // Rechaza certificados TLS que no puedan verificarse.
        rejectUnauthorized: true
    }



});

// Exporta el pool para que los controladores puedan ejecutar consultas.
module.exports = pool;

