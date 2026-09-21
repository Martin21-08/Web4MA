const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    port: process.env.MYSQL_PUERTO,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit:0,
    ssl: {
        rejectUnauthorized: true
    }



});

module.exports = pool;

