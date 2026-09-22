-- Crea la base de datos de publicaciones si todavía no existe.
CREATE DATABASE CRUD_POST_4A;
-- Selecciona la base para las instrucciones siguientes.
USE CRUD_POST_4A;

-- Guarda una publicación básica creada por un usuario.
CREATE TABLE POSTS (
	-- Identificador único generado automáticamente por MySQL.
	id INT AUTO_INCREMENT PRIMARY KEY,
	-- Título obligatorio, limitado a 255 caracteres.
	title VARCHAR(255) NOT NULL,
	-- Contenido obligatorio sin un límite corto de longitud.
	body TEXT NOT NULL,
	-- Fecha asignada por MySQL al momento de insertar el registro.
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
