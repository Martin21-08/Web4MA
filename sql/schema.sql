-- Crea la base de datos de publicaciones si todavía no existe.
-- =========================================================
--                    BASE DE DATOS COOKIQ
-- =========================================================

DROP DATABASE IF EXISTS CookIQ;
CREATE DATABASE CookIQ
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE CookIQ;


-- =========================================================
-- 1. SUSCRIPCIONES
-- =========================================================

CREATE TABLE suscripcion (
    id_suscripcion INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    recetas_por_busqueda INT NOT NULL CHECK (recetas_por_busqueda > 0),
    tokens_mensuales INT NOT NULL CHECK (tokens_mensuales >= 0),
    precio_clp INT NOT NULL CHECK (precio_clp >= 0)
);


INSERT INTO suscripcion
(nombre, recetas_por_busqueda, tokens_mensuales, precio_clp)
VALUES
('Gratis', 3, 50, 0),
('Premium', 5, 200, 9990),
('Essential', 8, 500, 15990);


-- =========================================================
-- 2. USUARIOS
-- =========================================================

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,

    nombres VARCHAR(80) NOT NULL,
    apellidos VARCHAR(80) NOT NULL,

    correo VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(20) UNIQUE,

    fecha_nacimiento DATE,

    -- Nunca se guarda la contraseña directamente.
    -- Aquí se guarda el hash generado por bcrypt/Argon2.
    contrasena_hash VARCHAR(255),

    -- Identificador de la cuenta de Google.
    google_id VARCHAR(255) UNIQUE,

    id_suscripcion INT NOT NULL DEFAULT 1,

    tokens_disponibles INT NOT NULL DEFAULT 50
        CHECK (tokens_disponibles >= 0),

    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_actualizacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_usuario_suscripcion
        FOREIGN KEY (id_suscripcion)
        REFERENCES suscripcion(id_suscripcion)
        ON DELETE RESTRICT,

    CONSTRAINT chk_usuario_correo
        CHECK (correo LIKE '%@%'),

    CONSTRAINT chk_usuario_telefono
        CHECK (
            telefono IS NULL
            OR telefono LIKE '+569%'
        )
);


-- =========================================================
-- 3. RECUPERACIÓN DE CONTRASEÑA
-- =========================================================

CREATE TABLE token_recuperacion (
    id_token INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    token VARCHAR(255) NOT NULL UNIQUE,

    fecha_expiracion DATETIME NOT NULL,

    utilizado BOOLEAN NOT NULL DEFAULT FALSE,

    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_token_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);


-- =========================================================
-- 4. CÓDIGOS DE VERIFICACIÓN SMS
-- =========================================================

CREATE TABLE codigo_verificacion (
    id_codigo INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NULL,

    telefono VARCHAR(20) NOT NULL,

    codigo VARCHAR(10) NOT NULL,

    proposito ENUM(
        'registro',
        'inicio_sesion',
        'recuperacion'
    ) NOT NULL,

    intentos INT NOT NULL DEFAULT 0,

    fecha_expiracion DATETIME NOT NULL,

    utilizado BOOLEAN NOT NULL DEFAULT FALSE,

    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_codigo_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);


-- =========================================================
-- 5. CATÁLOGO DE ALERGIAS
-- =========================================================

CREATE TABLE catalogo_alergia (
    id_alergia INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL UNIQUE,

    descripcion VARCHAR(255)
);


-- =========================================================
-- 6. CATÁLOGO DE INTOLERANCIAS
-- =========================================================

CREATE TABLE catalogo_intolerancia (
    id_intolerancia INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL UNIQUE,

    descripcion VARCHAR(255)
);


-- =========================================================
-- 7. ALERGIAS DEL USUARIO
-- =========================================================

CREATE TABLE alergia_usuario (
    id_usuario INT NOT NULL,
    id_alergia INT NOT NULL,

    PRIMARY KEY (id_usuario, id_alergia),

    CONSTRAINT fk_alergia_usuario_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_alergia_usuario_alergia
        FOREIGN KEY (id_alergia)
        REFERENCES catalogo_alergia(id_alergia)
        ON DELETE RESTRICT
);


-- =========================================================
-- 8. INTOLERANCIAS DEL USUARIO
-- =========================================================

CREATE TABLE intolerancia_usuario (
    id_usuario INT NOT NULL,
    id_intolerancia INT NOT NULL,

    PRIMARY KEY (id_usuario, id_intolerancia),

    CONSTRAINT fk_intolerancia_usuario_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_intolerancia_usuario_intolerancia
        FOREIGN KEY (id_intolerancia)
        REFERENCES catalogo_intolerancia(id_intolerancia)
        ON DELETE RESTRICT
);


-- =========================================================
-- 9. TIPO DE ALIMENTO
-- =========================================================

CREATE TABLE tipo_alimento (
    id_tipo_alimento INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(80) NOT NULL UNIQUE
);


-- =========================================================
-- 10. UNIDAD DE MEDIDA
-- =========================================================

CREATE TABLE unidad_medida (
    id_unidad INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(50) NOT NULL UNIQUE,

    abreviatura VARCHAR(10),

    familia ENUM(
        'peso',
        'volumen',
        'unidad'
    ) NOT NULL,

    factor_a_base DECIMAL(12,6) NOT NULL
        CHECK (factor_a_base > 0)
);


-- =========================================================
-- 11. INGREDIENTES
-- =========================================================

CREATE TABLE ingrediente (
    id_ingrediente INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL UNIQUE,

    id_tipo_alimento INT NULL,

    id_ingrediente_base INT NULL,

    creado_por_ia BOOLEAN NOT NULL DEFAULT FALSE,

    estado ENUM(
        'pendiente',
        'validado',
        'rechazado'
    ) NOT NULL DEFAULT 'validado',

    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ingrediente_tipo
        FOREIGN KEY (id_tipo_alimento)
        REFERENCES tipo_alimento(id_tipo_alimento)
        ON DELETE SET NULL,

    CONSTRAINT fk_ingrediente_base
        FOREIGN KEY (id_ingrediente_base)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE SET NULL
);


-- =========================================================
-- 12. ALIAS DE INGREDIENTES
-- =========================================================

CREATE TABLE ingrediente_alias (
    id_alias INT AUTO_INCREMENT PRIMARY KEY,

    id_ingrediente INT NOT NULL,

    alias VARCHAR(100) NOT NULL,

    UNIQUE (id_ingrediente, alias),

    CONSTRAINT fk_alias_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE CASCADE
);


-- =========================================================
-- 13. ALERGIAS RELACIONADAS CON INGREDIENTES
-- =========================================================

CREATE TABLE alergia_ingrediente (
    id_alergia INT NOT NULL,

    id_ingrediente INT NOT NULL,

    PRIMARY KEY (id_alergia, id_ingrediente),

    CONSTRAINT fk_ai_alergia
        FOREIGN KEY (id_alergia)
        REFERENCES catalogo_alergia(id_alergia)
        ON DELETE CASCADE,

    CONSTRAINT fk_ai_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE CASCADE
);


-- =========================================================
-- 14. INTOLERANCIAS RELACIONADAS CON INGREDIENTES
-- =========================================================

CREATE TABLE intolerancia_ingrediente (
    id_intolerancia INT NOT NULL,

    id_ingrediente INT NOT NULL,

    PRIMARY KEY (id_intolerancia, id_ingrediente),

    CONSTRAINT fk_ii_intolerancia
        FOREIGN KEY (id_intolerancia)
        REFERENCES catalogo_intolerancia(id_intolerancia)
        ON DELETE CASCADE,

    CONSTRAINT fk_ii_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE CASCADE
);


-- =========================================================
-- 15. DIFICULTAD
-- =========================================================

CREATE TABLE dificultad (
    id_dificultad INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(30) NOT NULL UNIQUE
);


INSERT INTO dificultad (nombre)
VALUES
('Fácil'),
('Medio'),
('Difícil');


-- =========================================================
-- 16. RECETAS
-- =========================================================

CREATE TABLE receta (
    id_receta INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NULL,

    nombre VARCHAR(150) NOT NULL,

    descripcion TEXT,

    id_dificultad INT NOT NULL,

    minutos_preparacion INT NOT NULL
        CHECK (minutos_preparacion > 0),

    cantidad_porciones INT NOT NULL
        CHECK (cantidad_porciones > 0),

    /*
    La IA puede generar una imagen del plato.
    MySQL almacena solamente la dirección de la imagen.
    La imagen física se guarda fuera de la base de datos.
    */
    imagen_url VARCHAR(500),

    generada_por_ia BOOLEAN NOT NULL DEFAULT FALSE,

    -- TRUE = la receta puede ser pública.
    es_publica BOOLEAN NOT NULL DEFAULT TRUE,

    estado_validacion ENUM(
        'pendiente',
        'validada',
        'rechazada'
    ) NOT NULL DEFAULT 'pendiente',

    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    fecha_actualizacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_receta_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_receta_dificultad
        FOREIGN KEY (id_dificultad)
        REFERENCES dificultad(id_dificultad)
        ON DELETE RESTRICT
);


-- =========================================================
-- 17. GENERACIONES REALIZADAS POR LA IA
-- =========================================================

CREATE TABLE generacion_ia (
    id_generacion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    id_receta INT NULL,

    tipo ENUM(
        'generada_nueva',
        'recomendada_existente'
    ) NOT NULL,

    modelo VARCHAR(100),

    version_reglas VARCHAR(50),

    dificultad_solicitada INT NULL,

    max_minutos INT NULL,

    porciones_solicitadas INT NULL,

    estado ENUM(
        'exito',
        'error',
        'cancelada'
    ) NOT NULL DEFAULT 'exito',

    resumen_error VARCHAR(500),

    fecha_generacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_generacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_generacion_receta
        FOREIGN KEY (id_receta)
        REFERENCES receta(id_receta)
        ON DELETE SET NULL,

    CONSTRAINT fk_generacion_dificultad
        FOREIGN KEY (dificultad_solicitada)
        REFERENCES dificultad(id_dificultad)
        ON DELETE SET NULL
);


-- =========================================================
-- 18. INGREDIENTES INGRESADOS PARA UNA GENERACIÓN DE IA
-- =========================================================

CREATE TABLE generacion_ia_ingrediente (
    id_generacion INT NOT NULL,

    id_ingrediente INT NOT NULL,

    cantidad DECIMAL(12,3) NULL,

    id_unidad INT NULL,

    PRIMARY KEY (id_generacion, id_ingrediente),

    CONSTRAINT fk_gii_generacion
        FOREIGN KEY (id_generacion)
        REFERENCES generacion_ia(id_generacion)
        ON DELETE CASCADE,

    CONSTRAINT fk_gii_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE RESTRICT,

    CONSTRAINT fk_gii_unidad
        FOREIGN KEY (id_unidad)
        REFERENCES unidad_medida(id_unidad)
        ON DELETE SET NULL
);


-- =========================================================
-- 19. PASOS DE LA RECETA
-- =========================================================

CREATE TABLE paso_receta (
    id_paso INT AUTO_INCREMENT PRIMARY KEY,

    id_receta INT NOT NULL,

    numero_paso INT NOT NULL
        CHECK (numero_paso > 0),

    descripcion TEXT NOT NULL,

    UNIQUE (id_receta, numero_paso),

    CONSTRAINT fk_paso_receta
        FOREIGN KEY (id_receta)
        REFERENCES receta(id_receta)
        ON DELETE CASCADE
);


-- =========================================================
-- 20. INGREDIENTES DE CADA RECETA
-- =========================================================

CREATE TABLE receta_ingrediente (
    id_receta INT NOT NULL,
    id_ingrediente INT NOT NULL,
    cantidad DECIMAL(12,3) NULL,
    id_unidad INT NULL,
    indicacion VARCHAR(255),

    PRIMARY KEY (id_receta, id_ingrediente),

    CONSTRAINT fk_ri_receta
        FOREIGN KEY (id_receta)
        REFERENCES receta(id_receta)
        ON DELETE CASCADE,

    CONSTRAINT fk_ri_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ri_unidad
        FOREIGN KEY (id_unidad)
        REFERENCES unidad_medida(id_unidad)
        ON DELETE SET NULL
);



-- =========================================================
-- 21. FAVORITOS
-- =========================================================

CREATE TABLE favorito (
    id_usuario INT NOT NULL,

    id_receta INT NOT NULL,

    fecha_guardado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_usuario, id_receta),

    CONSTRAINT fk_favorito_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_favorito_receta
        FOREIGN KEY (id_receta)
        REFERENCES receta(id_receta)
        ON DELETE CASCADE
);


-- =========================================================
-- 22. RESEÑAS / CALIFICACIONES
-- =========================================================

CREATE TABLE resena (
    id_resena INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    id_receta INT NOT NULL,

    comentario TEXT,

    estrellas TINYINT NOT NULL
        CHECK (estrellas BETWEEN 1 AND 5),

    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    fecha_actualizacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE (id_usuario, id_receta),

    CONSTRAINT fk_resena_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_resena_receta
        FOREIGN KEY (id_receta)
        REFERENCES receta(id_receta)
        ON DELETE CASCADE
);


-- =========================================================
-- 23. HISTORIAL DE BÚSQUEDAS
-- =========================================================

CREATE TABLE historial_busqueda (
    id_busqueda INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    texto_busqueda VARCHAR(500),

    id_dificultad INT NULL,

    max_minutos INT NULL,

    cantidad_porciones INT NULL,

    fecha_busqueda DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_busqueda_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_busqueda_dificultad
        FOREIGN KEY (id_dificultad)
        REFERENCES dificultad(id_dificultad)
        ON DELETE SET NULL
);


-- =========================================================
-- 24. INGREDIENTES UTILIZADOS EN UNA BÚSQUEDA
-- =========================================================

CREATE TABLE historial_ingrediente (
    id_busqueda INT NOT NULL,

    id_ingrediente INT NOT NULL,

    PRIMARY KEY (id_busqueda, id_ingrediente),

    CONSTRAINT fk_hi_busqueda
        FOREIGN KEY (id_busqueda)
        REFERENCES historial_busqueda(id_busqueda)
        ON DELETE CASCADE,

    CONSTRAINT fk_hi_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE RESTRICT
);


-- =========================================================
-- 25. RESULTADOS DE UNA BÚSQUEDA
-- =========================================================

CREATE TABLE resultado_busqueda (
    id_busqueda INT NOT NULL,

    id_receta INT NOT NULL,

    posicion INT NOT NULL
        CHECK (posicion > 0),

    tipo_resultado ENUM(
        'ia',
        'existente'
    ) NOT NULL,

    seleccionada BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (id_busqueda, id_receta),

    CONSTRAINT fk_resultado_busqueda
        FOREIGN KEY (id_busqueda)
        REFERENCES historial_busqueda(id_busqueda)
        ON DELETE CASCADE,

    CONSTRAINT fk_resultado_receta
        FOREIGN KEY (id_receta)
        REFERENCES receta(id_receta)
        ON DELETE CASCADE
);


-- =========================================================
-- 26. HISTORIAL DE RECETAS VISTAS / COCINADAS
-- =========================================================

CREATE TABLE historial_receta (
    id_usuario INT NOT NULL,

    id_receta INT NOT NULL,

    tipo_interaccion ENUM(
        'vista',
        'cocinada'
    ) NOT NULL,

    fecha_interaccion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (
        id_usuario,
        id_receta,
        tipo_interaccion
    ),

    CONSTRAINT fk_hr_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_hr_receta
        FOREIGN KEY (id_receta)
        REFERENCES receta(id_receta)
        ON DELETE CASCADE
);


-- =========================================================
-- 27. DESPENSA
-- =========================================================

CREATE TABLE despensa (
    id_usuario INT NOT NULL,

    id_ingrediente INT NOT NULL,

    cantidad DECIMAL(12,3) NOT NULL
        CHECK (cantidad >= 0),

    id_unidad INT NOT NULL,

    fecha_actualizacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id_usuario, id_ingrediente),

    CONSTRAINT fk_despensa_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_despensa_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE RESTRICT,

    CONSTRAINT fk_despensa_unidad
        FOREIGN KEY (id_unidad)
        REFERENCES unidad_medida(id_unidad)
        ON DELETE RESTRICT
);


-- =========================================================
-- 28. LISTA DE COMPRA
-- =========================================================

CREATE TABLE lista_compra (
    id_lista INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    nombre VARCHAR(100) NOT NULL,

    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    estado ENUM(
        'activa',
        'completada',
        'eliminada'
    ) NOT NULL DEFAULT 'activa',

    CONSTRAINT fk_lista_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);


-- =========================================================
-- 29. INGREDIENTES DE LA LISTA DE COMPRA
-- =========================================================

CREATE TABLE lista_compra_ingrediente (
    id_lista INT NOT NULL,

    id_ingrediente INT NOT NULL,

    cantidad DECIMAL(12,3),

    id_unidad INT NULL,

    comprado BOOLEAN NOT NULL DEFAULT FALSE,

    fecha_compra DATETIME NULL,

    PRIMARY KEY (id_lista, id_ingrediente),

    CONSTRAINT fk_lci_lista
        FOREIGN KEY (id_lista)
        REFERENCES lista_compra(id_lista)
        ON DELETE CASCADE,

    CONSTRAINT fk_lci_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE RESTRICT,

    CONSTRAINT fk_lci_unidad
        FOREIGN KEY (id_unidad)
        REFERENCES unidad_medida(id_unidad)
        ON DELETE SET NULL
);


-- =========================================================
--                    ÍNDICES
-- =========================================================

CREATE INDEX idx_receta_nombre
ON receta(nombre);

CREATE INDEX idx_receta_publica
ON receta(es_publica, estado_validacion);

CREATE INDEX idx_receta_ingrediente
ON receta_ingrediente(id_ingrediente);

CREATE INDEX idx_resena_receta
ON resena(id_receta);

CREATE INDEX idx_busqueda_usuario
ON historial_busqueda(id_usuario);

CREATE INDEX idx_generacion_usuario
ON generacion_ia(id_usuario);

CREATE INDEX idx_resultado_receta
ON resultado_busqueda(id_receta);

CREATE INDEX idx_despensa_usuario
ON despensa(id_usuario);

CREATE INDEX idx_lista_usuario
ON lista_compra(id_usuario);
