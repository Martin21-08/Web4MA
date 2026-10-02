-- ============================================================
-- COOKIQ
-- ============================================================


-- ============================================================
-- 1. CREAR BASE DE DATOS
-- ============================================================

DROP DATABASE IF EXISTS CookIQ;

CREATE DATABASE CookIQ
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE CookIQ;


-- ============================================================
-- 2. CREAR TABLAS
-- ============================================================


-- ============================================================
-- 2.1 SUSCRIPCION
-- ============================================================

CREATE TABLE suscripcion (
    id_suscripcion INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    recetas_por_busqueda INT NOT NULL,
    tokens_mensuales INT NOT NULL,
    precio_clp INT NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_suscripcion_recetas
        CHECK (recetas_por_busqueda > 0),

    CONSTRAINT chk_suscripcion_tokens
        CHECK (tokens_mensuales >= 0),

    CONSTRAINT chk_suscripcion_precio
        CHECK (precio_clp >= 0)
);


-- ============================================================
-- 2.2 USUARIO
-- ============================================================
select*from usuario;
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(15) UNIQUE,

    contrasena_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,

    id_suscripcion INT NOT NULL DEFAULT 1,

    tokens_disponibles INT NOT NULL DEFAULT 0,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_usuario_suscripcion
        FOREIGN KEY (id_suscripcion)
        REFERENCES suscripcion(id_suscripcion)
        ON DELETE RESTRICT,

    CONSTRAINT chk_usuario_tokens
        CHECK (tokens_disponibles >= 0),

    CONSTRAINT chk_usuario_telefono
        CHECK (
            telefono IS NULL
            OR telefono LIKE '+569%'
        ),

    CONSTRAINT chk_usuario_autenticacion
        CHECK (
            contrasena_hash IS NOT NULL
            OR google_id IS NOT NULL
        )
);


-- ============================================================
-- 2.3 SUSCRIPCION_USUARIO
-- ============================================================

CREATE TABLE suscripcion_usuario (
    id_suscripcion_usuario INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,
    id_suscripcion INT NOT NULL,

    fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME,

    estado ENUM(
        'activa',
        'vencida',
        'cancelada'
    ) NOT NULL DEFAULT 'activa',

    CONSTRAINT fk_suscripcion_usuario_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_suscripcion_usuario_suscripcion
        FOREIGN KEY (id_suscripcion)
        REFERENCES suscripcion(id_suscripcion)
        ON DELETE RESTRICT
);


-- ============================================================
-- 2.4 PAGO
-- ============================================================

CREATE TABLE pago (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,

    id_suscripcion_usuario INT NOT NULL,

    monto_clp INT NOT NULL,
    fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    estado ENUM(
        'pendiente',
        'aprobado',
        'rechazado'
    ) NOT NULL DEFAULT 'pendiente',

    id_transaccion_externa VARCHAR(150),

    CONSTRAINT fk_pago_suscripcion_usuario
        FOREIGN KEY (id_suscripcion_usuario)
        REFERENCES suscripcion_usuario(id_suscripcion_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_pago_monto
        CHECK (monto_clp >= 0)
);


-- ============================================================
-- 2.5 MOVIMIENTO_TOKENS
-- ============================================================
CREATE TABLE movimiento_tokens (
    id_movimiento INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,
    id_generacion INT,

    tipo ENUM(
        'recarga_mensual',
        'consumo',
        'ajuste_manual'
    ) NOT NULL,

    cantidad INT NOT NULL,
    saldo_resultante INT NOT NULL,

    fecha_movimiento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_movimiento_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT chk_movimiento_saldo
        CHECK (saldo_resultante >= 0)
);


-- ============================================================
-- 2.6 TOKEN_RECUPERACION
-- ============================================================

CREATE TABLE token_recuperacion (
    id_token_recuperacion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    token_hash VARCHAR(255) NOT NULL,

    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL,

    usado BOOLEAN NOT NULL DEFAULT FALSE,

    fecha_uso DATETIME,

    CONSTRAINT fk_token_recuperacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);


-- ============================================================
-- 2.7 CODIGO_VERIFICACION
-- ============================================================

CREATE TABLE codigo_verificacion (
    id_codigo_verificacion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT,

    telefono VARCHAR(15) NOT NULL,

    codigo_hash VARCHAR(255) NOT NULL,

    proposito ENUM(
        'registro',
        'inicio_sesion',
        'recuperacion'
    ) NOT NULL,

    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL,

    usado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_uso DATETIME,

    intentos INT NOT NULL DEFAULT 0,
    max_intentos INT NOT NULL DEFAULT 5,

    bloqueado BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_codigo_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE SET NULL,

    CONSTRAINT chk_codigo_intentos
        CHECK (
            intentos >= 0
            AND intentos <= max_intentos
        ),

    CONSTRAINT chk_codigo_max_intentos
        CHECK (max_intentos > 0),

    CONSTRAINT chk_codigo_telefono
        CHECK (telefono LIKE '+569%'),

    CONSTRAINT chk_codigo_uso
        CHECK (
            (usado = FALSE AND fecha_uso IS NULL)
            OR
            (usado = TRUE AND fecha_uso IS NOT NULL)
        )
);


-- ============================================================
-- 2.8 CATALOGO_ALERGIA
-- ============================================================

CREATE TABLE catalogo_alergia (
    id_alergia INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE
);


-- ============================================================
-- 2.9 CATALOGO_INTOLERANCIA
-- ============================================================

CREATE TABLE catalogo_intolerancia (
    id_intolerancia INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE
);


-- ============================================================
-- 2.10 ALERGIA_USUARIO
-- ============================================================

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


-- ============================================================
-- 2.11 INTOLERANCIA_USUARIO
-- ============================================================

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


-- ============================================================
-- 2.12 TIPO_ALIMENTO
-- ============================================================

CREATE TABLE tipo_alimento (
    id_tipo_alimento INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL UNIQUE
);


-- ============================================================
-- 2.13 UNIDAD_MEDIDA
-- ============================================================

CREATE TABLE unidad_medida (
    id_unidad INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(50) NOT NULL UNIQUE,
    abreviatura VARCHAR(10) NOT NULL UNIQUE,

    familia ENUM(
        'peso',
        'volumen',
        'unidad'
    ) NOT NULL,

    factor_a_base DECIMAL(12,6) NOT NULL,

    es_base BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT chk_unidad_factor
        CHECK (factor_a_base > 0)
);


-- ============================================================
-- 2.14 INGREDIENTE
-- ============================================================
CREATE TABLE ingrediente (
    id_ingrediente INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(150) NOT NULL UNIQUE,

    id_tipo_alimento INT,

    familia_unidad ENUM(
        'peso',
        'volumen',
        'unidad'
    ) NOT NULL,

    creado_por_ia BOOLEAN NOT NULL DEFAULT FALSE,

    estado ENUM(
        'pendiente',
        'validado',
        'rechazado'
    ) NOT NULL DEFAULT 'pendiente',

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ingrediente_tipo
        FOREIGN KEY (id_tipo_alimento)
        REFERENCES tipo_alimento(id_tipo_alimento)
        ON DELETE SET NULL
);


-- ============================================================
-- 2.15 INGREDIENTE_ALIAS
-- ============================================================

CREATE TABLE ingrediente_alias (
    id_alias INT AUTO_INCREMENT PRIMARY KEY,

    id_ingrediente INT NOT NULL,

    alias VARCHAR(150) NOT NULL UNIQUE,

    CONSTRAINT fk_alias_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE CASCADE
);


-- ============================================================
-- 2.16 ALERGIA_INGREDIENTE
-- ============================================================

CREATE TABLE alergia_ingrediente (
    id_alergia INT NOT NULL,
    id_ingrediente INT NOT NULL,

    PRIMARY KEY (id_alergia, id_ingrediente),

    CONSTRAINT fk_alergia_ingrediente_alergia
        FOREIGN KEY (id_alergia)
        REFERENCES catalogo_alergia(id_alergia)
        ON DELETE RESTRICT,

    CONSTRAINT fk_alergia_ingrediente_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE CASCADE
);


-- ============================================================
-- 2.17 INTOLERANCIA_INGREDIENTE
-- ============================================================

CREATE TABLE intolerancia_ingrediente (
    id_intolerancia INT NOT NULL,
    id_ingrediente INT NOT NULL,

    PRIMARY KEY (id_intolerancia, id_ingrediente),

    CONSTRAINT fk_intolerancia_ingrediente_intolerancia
        FOREIGN KEY (id_intolerancia)
        REFERENCES catalogo_intolerancia(id_intolerancia)
        ON DELETE RESTRICT,

    CONSTRAINT fk_intolerancia_ingrediente_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE CASCADE
);


-- ============================================================
-- 2.18 DIFICULTAD
-- ============================================================

CREATE TABLE dificultad (
    id_dificultad INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(50) NOT NULL UNIQUE
);


-- ============================================================
-- 2.19 RECETA
-- ============================================================

CREATE TABLE receta (
    id_receta INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT,

    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,

    id_dificultad INT NOT NULL,

    minutos_preparacion INT NOT NULL,
    cantidad_porciones DECIMAL(6,2) NOT NULL,

    origen ENUM(
        'ia',
        'sistema'
    ) NOT NULL DEFAULT 'ia',

    generada_por_ia BOOLEAN NOT NULL DEFAULT TRUE,

    visibilidad ENUM(
        'publica',
        'privada'
    ) NOT NULL DEFAULT 'privada',

    estado ENUM(
        'borrador',
        'generada',
        'validada',
        'publicada',
        'rechazada',
        'archivada'
    ) NOT NULL DEFAULT 'borrador',

    imagen_url VARCHAR(500),

    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_receta_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_receta_dificultad
        FOREIGN KEY (id_dificultad)
        REFERENCES dificultad(id_dificultad)
        ON DELETE RESTRICT,

    CONSTRAINT chk_receta_minutos
        CHECK (minutos_preparacion > 0),

    CONSTRAINT chk_receta_porciones
        CHECK (cantidad_porciones > 0),

    CONSTRAINT chk_receta_visibilidad
        CHECK (
            visibilidad = 'privada'
            OR estado IN ('validada', 'publicada')
        )
);


-- ============================================================
-- 2.20 RECETA_MODERACION
-- ============================================================

CREATE TABLE receta_moderacion (
    id_moderacion INT AUTO_INCREMENT PRIMARY KEY,

    id_receta INT NOT NULL,
    id_usuario_moderador INT NOT NULL,

    decision ENUM(
        'validada',
        'rechazada'
    ) NOT NULL,

    motivo VARCHAR(500),

    fecha_moderacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_moderacion_receta
        FOREIGN KEY (id_receta)
        REFERENCES receta(id_receta)
        ON DELETE CASCADE,

    CONSTRAINT fk_moderacion_usuario
        FOREIGN KEY (id_usuario_moderador)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT
);


-- ============================================================
-- 2.21 GENERACION_IA
-- ============================================================
CREATE TABLE generacion_ia (
    id_generacion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,
    id_receta INT,

    tipo ENUM(
        'generada_nueva',
        'recomendada_existente'
    ) NOT NULL,

    modelo VARCHAR(100) NOT NULL,
    version_reglas VARCHAR(50),

    dificultad_solicitada INT,
    minutos_maximos_solicitados INT,
    porciones_solicitadas DECIMAL(6,2),

    tokens_consumidos INT NOT NULL DEFAULT 0,

    latencia_ms INT,

    operacion_externa_id VARCHAR(150),

    estado ENUM(
        'exito',
        'error',
        'cancelada'
    ) NOT NULL,

    mensaje_error TEXT,

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
        ON DELETE SET NULL,

    CONSTRAINT chk_generacion_tokens
        CHECK (tokens_consumidos >= 0),

    CONSTRAINT chk_generacion_latencia
        CHECK (
            latencia_ms IS NULL
            OR latencia_ms >= 0
        ),

    CONSTRAINT chk_generacion_minutos
        CHECK (
            minutos_maximos_solicitados IS NULL
            OR minutos_maximos_solicitados > 0
        ),

    CONSTRAINT chk_generacion_porciones
        CHECK (
            porciones_solicitadas IS NULL
            OR porciones_solicitadas > 0
        )
);


-- ============================================================
-- 2.22 GENERACION_IA_INGREDIENTE
-- ============================================================

CREATE TABLE generacion_ia_ingrediente (
    id_generacion INT NOT NULL,
    id_ingrediente INT NOT NULL,

    cantidad DECIMAL(10,3),
    id_unidad INT,

    PRIMARY KEY (id_generacion, id_ingrediente),

    CONSTRAINT fk_gen_ingrediente_generacion
        FOREIGN KEY (id_generacion)
        REFERENCES generacion_ia(id_generacion)
        ON DELETE CASCADE,

    CONSTRAINT fk_gen_ingrediente_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE RESTRICT,

    CONSTRAINT fk_gen_ingrediente_unidad
        FOREIGN KEY (id_unidad)
        REFERENCES unidad_medida(id_unidad)
        ON DELETE RESTRICT,

    CONSTRAINT chk_gen_ingrediente_cantidad
        CHECK (
            cantidad IS NULL
            OR cantidad > 0
        ),

    CONSTRAINT chk_gen_ingrediente_unidad
        CHECK (
            (cantidad IS NULL AND id_unidad IS NULL)
            OR
            (cantidad IS NOT NULL AND id_unidad IS NOT NULL)
        )
);


-- ============================================================
-- 2.23 PASO_RECETA
-- ============================================================

CREATE TABLE paso_receta (
    id_paso INT AUTO_INCREMENT PRIMARY KEY,

    id_receta INT NOT NULL,

    numero_paso INT NOT NULL,

    descripcion TEXT NOT NULL,

    CONSTRAINT fk_paso_receta
        FOREIGN KEY (id_receta)
        REFERENCES receta(id_receta)
        ON DELETE CASCADE,

    CONSTRAINT chk_paso_numero
        CHECK (numero_paso > 0),

    CONSTRAINT uq_paso_receta_numero
        UNIQUE (id_receta, numero_paso)
);


-- ============================================================
-- 2.24 RECETA_INGREDIENTE
-- ============================================================

CREATE TABLE receta_ingrediente (
    id_receta INT NOT NULL,
    id_ingrediente INT NOT NULL,

    cantidad DECIMAL(10,3),
    id_unidad INT,

    indicacion VARCHAR(255),

    PRIMARY KEY (id_receta, id_ingrediente),

    CONSTRAINT fk_receta_ingrediente_receta
        FOREIGN KEY (id_receta)
        REFERENCES receta(id_receta)
        ON DELETE CASCADE,

    CONSTRAINT fk_receta_ingrediente_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE RESTRICT,

    CONSTRAINT fk_receta_ingrediente_unidad
        FOREIGN KEY (id_unidad)
        REFERENCES unidad_medida(id_unidad)
        ON DELETE RESTRICT,

    CONSTRAINT chk_receta_ingrediente_cantidad
        CHECK (
            cantidad IS NULL
            OR cantidad > 0
        ),

    CONSTRAINT chk_receta_ingrediente_unidad
        CHECK (
            (
                cantidad IS NOT NULL
                AND id_unidad IS NOT NULL
            )
            OR
            (
                cantidad IS NULL
                AND id_unidad IS NULL
                AND indicacion IS NOT NULL
            )
        )
);


-- ============================================================
-- 2.25 FAVORITO
-- ============================================================

CREATE TABLE favorito (
    id_usuario INT NOT NULL,
    id_receta INT NOT NULL,

    fecha_agregado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

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


-- ============================================================
-- 2.26 RESENA
-- ============================================================

CREATE TABLE resena (
    id_resena INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,
    id_receta INT NOT NULL,

    estrellas INT NOT NULL,
    comentario TEXT,

    fecha_resena DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_resena_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_resena_receta
        FOREIGN KEY (id_receta)
        REFERENCES receta(id_receta)
        ON DELETE CASCADE,

    CONSTRAINT chk_resena_estrellas
        CHECK (estrellas BETWEEN 1 AND 5),

    CONSTRAINT uq_resena_usuario_receta
        UNIQUE (id_usuario, id_receta)
);


-- ============================================================
-- 2.27 HISTORIAL_BUSQUEDA
-- ============================================================

CREATE TABLE historial_busqueda (
    id_busqueda INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    texto_busqueda VARCHAR(500),

    id_dificultad INT,

    minutos_maximos INT,
    cantidad_porciones DECIMAL(6,2),

    fecha_busqueda DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_historial_busqueda_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_historial_busqueda_dificultad
        FOREIGN KEY (id_dificultad)
        REFERENCES dificultad(id_dificultad)
        ON DELETE SET NULL,

    CONSTRAINT chk_historial_minutos
        CHECK (
            minutos_maximos IS NULL
            OR minutos_maximos > 0
        ),

    CONSTRAINT chk_historial_porciones
        CHECK (
            cantidad_porciones IS NULL
            OR cantidad_porciones > 0
        )
);


-- ============================================================
-- 2.28 HISTORIAL_INGREDIENTE
-- ============================================================

CREATE TABLE historial_ingrediente (
    id_busqueda INT NOT NULL,
    id_ingrediente INT NOT NULL,

    PRIMARY KEY (id_busqueda, id_ingrediente),

    CONSTRAINT fk_historial_ingrediente_busqueda
        FOREIGN KEY (id_busqueda)
        REFERENCES historial_busqueda(id_busqueda)
        ON DELETE CASCADE,

    CONSTRAINT fk_historial_ingrediente_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE RESTRICT
);


-- ============================================================
-- 2.29 RESULTADO_BUSQUEDA
-- ============================================================

CREATE TABLE resultado_busqueda (
    id_busqueda INT NOT NULL,
    id_receta INT NOT NULL,

    posicion INT NOT NULL,

    tipo_resultado ENUM(
        'ia',
        'existente'
    ) NOT NULL,

    porcentaje_compatibilidad DECIMAL(5,2),

    ingredientes_faltantes INT DEFAULT 0,

    seleccionada BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (id_busqueda, id_receta),

    CONSTRAINT fk_resultado_busqueda
        FOREIGN KEY (id_busqueda)
        REFERENCES historial_busqueda(id_busqueda)
        ON DELETE CASCADE,

    CONSTRAINT fk_resultado_receta
        FOREIGN KEY (id_receta)
        REFERENCES receta(id_receta)
        ON DELETE RESTRICT,

    CONSTRAINT uq_resultado_posicion
        UNIQUE (id_busqueda, posicion),

    CONSTRAINT chk_resultado_posicion
        CHECK (posicion > 0),

    CONSTRAINT chk_resultado_porcentaje
        CHECK (
            porcentaje_compatibilidad IS NULL
            OR (
                porcentaje_compatibilidad >= 0
                AND porcentaje_compatibilidad <= 100
            )
        ),

    CONSTRAINT chk_resultado_faltantes
        CHECK (ingredientes_faltantes >= 0)
);


-- ============================================================
-- 2.30 HISTORIAL_RECETA
-- ============================================================

CREATE TABLE historial_receta (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,
    id_receta INT NOT NULL,

    tipo_interaccion ENUM(
        'vista',
        'seleccionada',
        'generada'
    ) NOT NULL,

    fecha_interaccion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_historial_receta_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_historial_receta_receta
        FOREIGN KEY (id_receta)
        REFERENCES receta(id_receta)
        ON DELETE RESTRICT
);


-- ============================================================
-- 2.31 DESPENSA
-- ============================================================

CREATE TABLE despensa (
    id_usuario INT NOT NULL,
    id_ingrediente INT NOT NULL,

    cantidad DECIMAL(10,3) NOT NULL,
    id_unidad INT NOT NULL,

    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id_usuario, id_ingrediente),

    CONSTRAINT fk_despensa_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_despensa_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE CASCADE,

    CONSTRAINT fk_despensa_unidad
        FOREIGN KEY (id_unidad)
        REFERENCES unidad_medida(id_unidad)
        ON DELETE RESTRICT,

    CONSTRAINT chk_despensa_cantidad
        CHECK (cantidad > 0)
);


-- ============================================================
-- 2.32 LISTA_COMPRA
-- ============================================================

CREATE TABLE lista_compra (
    id_lista INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    nombre VARCHAR(150) NOT NULL,

    estado ENUM(
        'activa',
        'eliminada'
    ) NOT NULL DEFAULT 'activa',

    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_lista_compra_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);


-- ============================================================
-- 2.33 LISTA_COMPRA_INGREDIENTE
-- ============================================================

CREATE TABLE lista_compra_ingrediente (
    id_lista INT NOT NULL,
    id_ingrediente INT NOT NULL,

    cantidad DECIMAL(10,3),
    id_unidad INT,

    comprado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_compra DATETIME,

    PRIMARY KEY (id_lista, id_ingrediente),

    CONSTRAINT fk_lista_ingrediente_lista
        FOREIGN KEY (id_lista)
        REFERENCES lista_compra(id_lista)
        ON DELETE CASCADE,

    CONSTRAINT fk_lista_ingrediente_ingrediente
        FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente(id_ingrediente)
        ON DELETE RESTRICT,

    CONSTRAINT fk_lista_ingrediente_unidad
        FOREIGN KEY (id_unidad)
        REFERENCES unidad_medida(id_unidad)
        ON DELETE RESTRICT,

    CONSTRAINT chk_lista_ingrediente_cantidad
        CHECK (
            cantidad IS NULL
            OR cantidad > 0
        ),

    CONSTRAINT chk_lista_ingrediente_unidad
        CHECK (
            (cantidad IS NULL AND id_unidad IS NULL)
            OR
            (cantidad IS NOT NULL AND id_unidad IS NOT NULL)
        ),

    CONSTRAINT chk_lista_ingrediente_compra
        CHECK (
            (comprado = FALSE AND fecha_compra IS NULL)
            OR
            (comprado = TRUE AND fecha_compra IS NOT NULL)
        )
);



-- ============================================================
-- 3. INSERT INTO
-- DATOS INICIALES DE LA BASE DE DATOS
-- ============================================================

USE CookIQ;

-- ============================================================
-- 3.1 SUSCRIPCION
-- ============================================================
INSERT INTO suscripcion
(codigo, nombre, recetas_por_busqueda, tokens_mensuales, precio_clp, activo)
VALUES
('gratis', 'Gratis', 3, 50, 0, TRUE),
('essential', 'Essential', 5, 200, 7990, TRUE),
('premium', 'Premium', 8, 500, 15990, TRUE);

-- ============================================================
-- 3.2 TIPO_ALIMENTO
-- ============================================================
INSERT INTO tipo_alimento (nombre)
VALUES
('Fruta'),
('Verdura'),
('Carne'),
('Pescado'),
('Lácteo'),
('Cereal'),
('Legumbre'),
('Condimento'),
('Aceite'),
('Fruto seco'),
('Huevo'),
('Bebida');

-- ============================================================
-- 3.3 UNIDAD_MEDIDA
-- ============================================================
INSERT INTO unidad_medida
(nombre, abreviatura, familia, factor_a_base, es_base)
VALUES
('Gramo', 'g', 'peso', 1, TRUE),
('Kilogramo', 'kg', 'peso', 1000, FALSE),
('Mililitro', 'ml', 'volumen', 1, TRUE),
('Litro', 'l', 'volumen', 1000, FALSE),
('Unidad', 'un', 'unidad', 1, TRUE),
('Taza', 'taza', 'volumen', 240, FALSE),
('Cucharada', 'cda', 'volumen', 15, FALSE),
('Cucharadita', 'cdta', 'volumen', 5, FALSE);

-- ============================================================
-- 3.4 DIFICULTAD
-- ============================================================
INSERT INTO dificultad (nombre)
VALUES
('Fácil'),
('Medio'),
('Difícil');

-- ============================================================
-- 3.5 CATALOGO_ALERGIA
-- ============================================================
INSERT INTO catalogo_alergia (nombre, descripcion, activo)
VALUES
('Maní', 'Alergia al maní', TRUE),
('Nueces', 'Alergia a frutos secos tipo nuez', TRUE),
('Mariscos', 'Alergia a mariscos', TRUE),
('Pescado', 'Alergia al pescado', TRUE),
('Huevo', 'Alergia al huevo', TRUE),
('Leche', 'Alergia a proteínas de la leche', TRUE);

-- ============================================================
-- 3.6 CATALOGO_INTOLERANCIA
-- ============================================================
INSERT INTO catalogo_intolerancia (nombre, descripcion, activo)
VALUES
('Lactosa', 'Intolerancia a la lactosa', TRUE),
('Gluten', 'Intolerancia al gluten', TRUE),
('Fructosa', 'Intolerancia a la fructosa', TRUE);

-- ============================================================
-- 3.7 INGREDIENTE
-- ============================================================
INSERT INTO ingrediente
(nombre, id_tipo_alimento, familia_unidad, creado_por_ia, estado, activo)
VALUES
('Arroz', 6, 'peso', FALSE, 'validado', TRUE),
('Pollo', 3, 'peso', FALSE, 'validado', TRUE),
('Tomate', 2, 'peso', FALSE, 'validado', TRUE),
('Cebolla', 2, 'peso', FALSE, 'validado', TRUE),
('Huevo', 11, 'unidad', FALSE, 'validado', TRUE),
('Leche', 5, 'volumen', FALSE, 'validado', TRUE),
('Aceite', 9, 'volumen', FALSE, 'validado', TRUE),
('Sal', 8, 'peso', FALSE, 'validado', TRUE),
('Lechuga', 2, 'peso', FALSE, 'validado', TRUE);

-- ============================================================
-- 3.8 INGREDIENTE_ALIAS
-- ============================================================
INSERT INTO ingrediente_alias (id_ingrediente, alias)
VALUES
(1, 'Arroz blanco'),
(2, 'Pechuga de pollo'),
(3, 'Tomate rojo'),
(4, 'Cebolla blanca'),
(5, 'Huevo de gallina'),
(9, 'Lechuga verde');

-- ============================================================
-- 3.9 ALERGIA_INGREDIENTE
-- ============================================================
INSERT INTO alergia_ingrediente (id_alergia, id_ingrediente)
VALUES
(5, 5),
(6, 6);

-- ============================================================
-- 3.10 INTOLERANCIA_INGREDIENTE
-- ============================================================
INSERT INTO intolerancia_ingrediente (id_intolerancia, id_ingrediente)
VALUES
(1, 6);

-- ============================================================
-- 3.11 USUARIO
-- ============================================================
INSERT INTO usuario
(nombres, apellidos, correo, telefono, contrasena_hash,
 id_suscripcion, tokens_disponibles)
VALUES
('Ana', 'Pérez', 'ana@cookiq.cl', '+56911111111',
 '2b10$ejemplo_hash_ana', 1, 50),
('Juan', 'González', 'juan@cookiq.cl', '+56922222222',
 '2b10$ejemplo_hash_juan', 2, 200);

-- ============================================================
-- 3.12 SUSCRIPCION_USUARIO
-- ============================================================
INSERT INTO suscripcion_usuario
(id_usuario, id_suscripcion, fecha_inicio, estado)
VALUES
(1, 1, CURRENT_TIMESTAMP, 'activa'),
(2, 2, CURRENT_TIMESTAMP, 'activa');

-- ============================================================
-- 3.13 PAGO
-- ============================================================
INSERT INTO pago
(id_suscripcion_usuario, monto_clp, estado, id_transaccion_externa)
VALUES
(2, 7990, 'aprobado', 'TXN-001');

-- ============================================================
-- 3.14 TOKEN_RECUPERACION
-- ============================================================
INSERT INTO token_recuperacion
(id_usuario, token_hash, fecha_expiracion, usado, fecha_uso)
VALUES
(1, 'hash_token_ana_001',
 DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 HOUR), FALSE, NULL);

-- ============================================================
-- 3.15 CODIGO_VERIFICACION
-- ============================================================
INSERT INTO codigo_verificacion
(id_usuario, telefono, codigo_hash, proposito, fecha_expiracion,
 usado, fecha_uso, intentos, max_intentos, bloqueado)
VALUES
(1, '+56911111111', 'hash_codigo_ana_001', 'inicio_sesion',
 DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE),
 FALSE, NULL, 0, 5, FALSE),
(2, '+56922222222', 'hash_codigo_juan_001', 'recuperacion',
 DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE),
 TRUE, CURRENT_TIMESTAMP, 1, 5, FALSE);

-- ============================================================
-- 3.16 MOVIMIENTO_TOKENS
-- ============================================================
INSERT INTO movimiento_tokens
(id_usuario, id_generacion, tipo, cantidad, saldo_resultante)
VALUES
(1, NULL, 'recarga_mensual', 50, 50),
(2, NULL, 'recarga_mensual', 200, 200);

-- ============================================================
-- 3.17 ALERGIA_USUARIO
-- ============================================================
INSERT INTO alergia_usuario (id_usuario, id_alergia)
VALUES
(1, 5);

-- ============================================================
-- 3.18 INTOLERANCIA_USUARIO
-- ============================================================
INSERT INTO intolerancia_usuario (id_usuario, id_intolerancia)
VALUES
(2, 1);

-- ============================================================
-- 3.19 RECETA
-- ============================================================
INSERT INTO receta
(id_usuario, nombre, descripcion, id_dificultad, minutos_preparacion,
 cantidad_porciones, origen, generada_por_ia, visibilidad, estado, imagen_url)
VALUES
(1, 'Arroz con pollo',
 'Arroz preparado con pollo, tomate y cebolla.',
 1, 30, 2, 'ia', TRUE, 'publica', 'publicada', NULL),
(1, 'Pollo con tomate',
 'Pollo acompañado de tomate y cebolla.',
 1, 25, 2, 'ia', TRUE, 'publica', 'publicada', NULL),
(2, 'Arroz con huevo',
 'Arroz acompañado de huevo.',
 1, 20, 1, 'ia', TRUE, 'publica', 'publicada', NULL);

-- ============================================================
-- 3.20 RECETA_MODERACION
-- ============================================================
INSERT INTO receta_moderacion
(id_receta, id_usuario_moderador, decision, motivo)
VALUES
(1, 1, 'validada', 'Receta revisada y validada.'),
(2, 1, 'validada', 'Receta revisada y validada.'),
(3, 2, 'validada', 'Receta revisada y validada.');

-- ============================================================
-- 3.21 GENERACION_IA
-- ============================================================
INSERT INTO generacion_ia
(id_usuario, id_receta, tipo, modelo, version_reglas,
 dificultad_solicitada, minutos_maximos_solicitados,
 porciones_solicitadas, tokens_consumidos, latencia_ms,
 operacion_externa_id, estado, mensaje_error)
VALUES
(1, 1, 'generada_nueva', 'Gemini', '1.0',
 1, 40, 2, 0, 1200, 'IA-001', 'exito', NULL),
(1, 2, 'recomendada_existente', 'Gemini', '1.0',
 1, 30, 2, 0, 900, 'IA-002', 'exito', NULL),
(2, 3, 'generada_nueva', 'Gemini', '1.0',
 1, 30, 1, 0, 1100, 'IA-003', 'exito', NULL);

-- ============================================================
-- 3.22 GENERACION_IA_INGREDIENTE
-- ============================================================
INSERT INTO generacion_ia_ingrediente
(id_generacion, id_ingrediente, cantidad, id_unidad)
VALUES
(1, 1, 200, 1),
(1, 2, 300, 1),
(2, 2, 300, 1),
(2, 3, 200, 1),
(3, 1, 150, 1),
(3, 5, 1, 5);

-- ============================================================
-- 3.23 PASO_RECETA
-- ============================================================
INSERT INTO paso_receta
(id_receta, numero_paso, descripcion)
VALUES
(1, 1, 'Lavar y preparar el arroz.'),
(1, 2, 'Cortar el pollo en trozos.'),
(1, 3, 'Cocinar el pollo con tomate y cebolla.'),
(1, 4, 'Agregar el arroz y cocinar hasta que esté listo.'),

(2, 1, 'Cortar el pollo y el tomate.'),
(2, 2, 'Cocinar el pollo en una sartén.'),
(2, 3, 'Agregar el tomate y cocinar hasta integrar.'),

(3, 1, 'Cocinar el arroz.'),
(3, 2, 'Preparar el huevo.'),
(3, 3, 'Servir el arroz acompañado del huevo.');

-- ============================================================
-- 3.24 RECETA_INGREDIENTE
-- ============================================================
INSERT INTO receta_ingrediente
(id_receta, id_ingrediente, cantidad, id_unidad, indicacion)
VALUES
(1, 1, 200, 1, NULL),
(1, 2, 300, 1, NULL),
(1, 3, 150, 1, NULL),
(1, 4, 100, 1, NULL),
(1, 7, 15, 7, NULL),
(1, 8, 5, 1, NULL),

(2, 2, 300, 1, NULL),
(2, 3, 200, 1, NULL),
(2, 4, 100, 1, NULL),
(2, 7, 15, 7, NULL),

(3, 1, 150, 1, NULL),
(3, 5, 1, 5, NULL),
(3, 8, 3, 1, NULL);

-- ============================================================
-- 3.25 FAVORITO
-- ============================================================
INSERT INTO favorito (id_usuario, id_receta)
VALUES
(1, 1),
(2, 3);

-- ============================================================
-- 3.26 RESENA
-- ============================================================
INSERT INTO resena
(id_usuario, id_receta, estrellas, comentario)
VALUES
(2, 1, 5, 'Muy buena receta y fácil de preparar.');

-- ============================================================
-- 3.27 HISTORIAL_BUSQUEDA
-- ============================================================
INSERT INTO historial_busqueda
(id_usuario, texto_busqueda, id_dificultad, minutos_maximos, cantidad_porciones)
VALUES
(1, 'pollo con arroz', 1, 40, 2),
(2, 'recetas con huevo', 1, 30, 1);

-- ============================================================
-- 3.28 HISTORIAL_INGREDIENTE
-- ============================================================
INSERT INTO historial_ingrediente (id_busqueda, id_ingrediente)
VALUES
(1, 1),
(1, 2),
(2, 5);

-- ============================================================
-- 3.29 RESULTADO_BUSQUEDA
-- ============================================================
INSERT INTO resultado_busqueda
(id_busqueda, id_receta, posicion, tipo_resultado,
 porcentaje_compatibilidad, ingredientes_faltantes, seleccionada)
VALUES
(1, 1, 1, 'existente', 100.00, 0, TRUE),
(1, 2, 2, 'existente', 80.00, 1, FALSE),
(2, 3, 1, 'existente', 100.00, 0, TRUE);

-- ============================================================
-- 3.30 HISTORIAL_RECETA
-- ============================================================
INSERT INTO historial_receta
(id_usuario, id_receta, tipo_interaccion)
VALUES
(1, 1, 'vista'),
(1, 1, 'seleccionada'),
(2, 3, 'vista');

-- ============================================================
-- 3.31 DESPENSA
-- ============================================================
INSERT INTO despensa
(id_usuario, id_ingrediente, cantidad, id_unidad)
VALUES
(1, 1, 500, 1),
(1, 2, 500, 1),
(1, 3, 300, 1),
(2, 5, 6, 5);

-- ============================================================
-- 3.32 LISTA_COMPRA
-- ============================================================
INSERT INTO lista_compra (id_usuario, nombre, estado)
VALUES
(1, 'Compra semanal', 'activa'),
(2, 'Ingredientes para recetas', 'activa');

-- ============================================================
-- 3.33 LISTA_COMPRA_INGREDIENTE
-- ============================================================
INSERT INTO lista_compra_ingrediente
(id_lista, id_ingrediente, cantidad, id_unidad, comprado, fecha_compra)
VALUES
(1, 4, 200, 1, FALSE, NULL),
(1, 7, 250, 3, FALSE, NULL),
(2, 2, 500, 1, TRUE, CURRENT_TIMESTAMP);

-- ============================================================
-- FIN DE INSERTS
-- ============================================================






-- ============================================================
-- 4. FOREIGN KEY QUE DEPENDE DE UNA TABLA CREADA DESPUES
-- ============================================================

ALTER TABLE movimiento_tokens
    ADD CONSTRAINT fk_movimiento_generacion
        FOREIGN KEY (id_generacion)
        REFERENCES generacion_ia(id_generacion)
        ON DELETE SET NULL;



-- ============================================================
-- 5. INDICES
-- ============================================================



-- Buscar rápidamente el historial de recetas de un usuario
-- filtrando además por receta.

CREATE INDEX idx_historial_receta_usuario_receta
    ON historial_receta(id_usuario, id_receta);


-- Buscar rápidamente las búsquedas realizadas por un usuario
-- ordenadas por fecha.

CREATE INDEX idx_historial_busqueda_usuario_fecha
    ON historial_busqueda(id_usuario, fecha_busqueda);


-- Buscar rápidamente las generaciones realizadas por un usuario.

CREATE INDEX idx_generacion_usuario_fecha
    ON generacion_ia(id_usuario, fecha_generacion);


-- Buscar rápidamente los pagos de una suscripción de usuario.

CREATE INDEX idx_pago_suscripcion_fecha
    ON pago(id_suscripcion_usuario, fecha_pago);


-- Buscar rápidamente las recetas creadas por un usuario
-- según su estado.

CREATE INDEX idx_receta_usuario_estado
    ON receta(id_usuario, estado);


-- Buscar rápidamente las listas de compra de un usuario.

CREATE INDEX idx_lista_compra_usuario_estado
    ON lista_compra(id_usuario, estado);





START TRANSACTION;

-- UPDATE 1: cambiar la cantidad de porciones
UPDATE receta
SET cantidad_porciones = 4
WHERE id_receta = 1;

SELECT id_receta, nombre, cantidad_porciones
FROM receta
WHERE id_receta = 1;


-- UPDATE 2: cambiar el tiempo de preparación
UPDATE receta
SET minutos_preparacion = 30
WHERE id_receta = 2;

SELECT id_receta, nombre, minutos_preparacion
FROM receta
WHERE id_receta = 2;


-- UPDATE 3: cambiar el nombre de la receta
UPDATE receta
SET nombre = 'Pastel de choclo'
WHERE id_receta = 3;

SELECT id_receta, nombre
FROM receta
WHERE id_receta = 3;

-- Deshacer todos los cambios
ROLLBACK;

START TRANSACTION;

DELETE FROM historial_busqueda
WHERE id_busqueda = 1;

SELECT *
FROM historial_busqueda
WHERE id_busqueda = 1;

ROLLBACK;






-- ============================================================
-- CONSULTAS PARA COOKIQ
-- ============================================================


-- ============================================================
-- CONSULTA 1
-- ¿Cuántos usuarios tiene cada nivel de suscripción?
--
-- Sirve para saber cuántos usuarios pertenecen a cada
-- tipo de suscripción.
--
-- Utiliza: LEFT JOIN + GROUP BY + COUNT
-- ============================================================

SELECT 
    s.nombre AS suscripcion,
    COUNT(u.id_usuario) AS cantidad_usuarios
FROM suscripcion s
LEFT JOIN usuario u
    ON s.id_suscripcion = u.id_suscripcion
GROUP BY s.id_suscripcion, s.nombre;


-- ============================================================
-- CONSULTA 2
-- ¿Qué niveles de dificultad tienen más de una receta?
--
-- Sirve para mostrar solamente las dificultades que tienen
-- más de una receta registrada.
--
-- Utiliza: INNER JOIN + GROUP BY + COUNT + HAVING
-- ============================================================

SELECT 
    d.nombre AS dificultad,
    COUNT(r.id_receta) AS cantidad_recetas
FROM dificultad d
INNER JOIN receta r
    ON d.id_dificultad = r.id_dificultad
GROUP BY d.id_dificultad, d.nombre
HAVING COUNT(r.id_receta) > 1;


-- ============================================================
-- CONSULTA 3
-- ¿Cuáles son las recetas que tardan más de 20 minutos
-- y tienen al menos 2 porciones?
--
-- Sirve para buscar recetas que cumplan dos condiciones
-- al mismo tiempo.
--
-- Utiliza: WHERE + AND
-- ============================================================

SELECT 
    r.id_receta,
    r.nombre,
    r.minutos_preparacion,
    r.cantidad_porciones
FROM receta r
WHERE r.minutos_preparacion > 20
  AND r.cantidad_porciones >= 2;


-- ============================================================
-- CONSULTA 4
-- ¿Cuáles son las recetas cuyo nombre contiene la palabra
-- "pollo"?
--
-- Sirve para buscar recetas por una palabra específica
-- dentro de su nombre.
--
-- Utiliza: WHERE + LIKE
-- ============================================================

SELECT 
    r.id_receta,
    r.nombre,
    r.minutos_preparacion
FROM receta r
WHERE r.nombre LIKE '%pollo%';


-- ============================================================
-- CONSULTA 5
-- ¿Cuál es el historial de búsquedas del usuario 1,
-- desde la más reciente a la más antigua?
--
-- Sirve para consultar las búsquedas realizadas por
-- un usuario específico.
--
-- Utiliza: INNER JOIN + WHERE + ORDER BY
-- ============================================================

SELECT 
    h.id_busqueda,
    h.texto_busqueda,
    h.fecha_busqueda
FROM historial_busqueda h
INNER JOIN usuario u
    ON h.id_usuario = u.id_usuario
WHERE u.id_usuario = 1
ORDER BY h.fecha_busqueda DESC;


-- ============================================================
-- CONSULTA 6
-- ¿Cuál es el tiempo promedio de preparación de las recetas
-- según su dificultad?
--
-- Sirve para conocer cuánto tiempo demora en promedio
-- preparar recetas de cada dificultad.
--
-- Utiliza: INNER JOIN + GROUP BY + AVG
-- ============================================================

SELECT 
    d.nombre AS dificultad,
    AVG(r.minutos_preparacion) AS promedio_minutos
FROM dificultad d
INNER JOIN receta r
    ON d.id_dificultad = r.id_dificultad
GROUP BY d.id_dificultad, d.nombre;


-- ============================================================
-- CONSULTA 7
-- ¿Cuál es el menor y el mayor tiempo de preparación
-- de las recetas?
--
-- Sirve para conocer el tiempo mínimo y máximo que puede
-- tomar la preparación de una receta.
--
-- Utiliza: MIN + MAX
-- ============================================================

SELECT 
    MIN(minutos_preparacion) AS menor_tiempo,
    MAX(minutos_preparacion) AS mayor_tiempo
FROM receta;


-- ============================================================
-- CONSULTA 8
-- ¿Cuántos tokens ha registrado en total cada usuario?
--
-- Sirve para sumar los movimientos de tokens asociados
-- a cada usuario.
--
-- Utiliza: INNER JOIN + GROUP BY + SUM
-- ============================================================

SELECT 
    u.id_usuario,
    u.nombres,
    u.apellidos,
    SUM(mt.cantidad) AS total_tokens
FROM usuario u
INNER JOIN movimiento_tokens mt
    ON u.id_usuario = mt.id_usuario
GROUP BY u.id_usuario, u.nombres, u.apellidos;









SELECT CONCAT('SELECT * FROM ', table_name, ';')
FROM information_schema.tables
WHERE table_schema = 'CookIQ';

USE CookIQ;



show tables;


