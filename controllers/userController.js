const bcrypt = require("bcrypt");
const crypto = require("crypto");

const userModel = require("../models/userModel");
const emailService = require("../services/emailService");

// Traduce fallos de conexión frecuentes a instrucciones útiles para la interfaz.
const mensajeErrorBaseDatos = error => {
    if (error.code === "ER_ACCESS_DENIED_ERROR") {
        return "La base de datos rechazó el acceso. Revisa MYSQL_USER y MYSQL_PASSWORD en .env.";
    }

    if (error.code === "ER_BAD_DB_ERROR") {
        return "La base de datos configurada no existe. Revisa MYSQL_DB en .env.";
    }

    if (error.code === "ECONNREFUSED") {
        return "No se pudo conectar con MySQL. Revisa que el servidor esté activo y verifica MYSQL_HOST y MYSQL_PUERTO.";
    }

    return null;
};


const userController = {

    // =========================================
    // MOSTRAR REGISTRO
    // =========================================

    mostrarRegistro: (req, res) => {

        res.render("register");
    },


    // =========================================
    // REGISTRAR USUARIO
    // =========================================

    // Lee req.body, valida los datos y pide al modelo que guarde la cuenta.
    register: async (req, res) => {

        try {

            // 1. Leer y normalizar los datos enviados desde el formulario.
            const nombres = String(req.body.nombres || req.body.nombre || "").trim();
            const apellidos = String(req.body.apellidos || req.body.apellido || "").trim();
            const correo = String(req.body.correo || "").trim().toLowerCase();
            const password = String(req.body.password || "");
            const telefonoIngresado = String(req.body.telefono || "").trim();
            const terminosAceptados = ["Terminos", "on", true].includes(req.body.Terminos);
            const telefono = telefonoIngresado
                ? telefonoIngresado.replace(/[\s()-]/g, "")
                : null;

            // En desarrollo se registran los campos recibidos, pero nunca la contraseña.
            if (process.env.NODE_ENV !== "production") {
                console.info("[REGISTRO] Datos recibidos:", {
                    nombres,
                    apellidos,
                    correo,
                    telefono,
                    contrasena: password ? "[omitida por seguridad]" : "[no ingresada]"
                });
            }


            // El servidor comprueba la aceptación porque el navegador no debe bloquear el POST:
            // así puede mostrar el mensaje flash si la casilla no está seleccionada.
            if (!terminosAceptados) {
                req.flash("error", "Debes aceptar los términos y condiciones para registrarte.");
                return res.redirect("/usuarios/registro");
            }

            // 2. Validar los campos requeridos antes de consultar la base de datos.
            if (!nombres || !apellidos || !correo || !password) {
                console.warn("[REGISTRO] Solicitud rechazada: faltan campos obligatorios.");

                req.flash(
                    "error",
                    "Debes completar todos los campos obligatorios"
                );

                return res.redirect("/usuarios/registro");
            }

            // Exigir una contraseña de al menos 8 caracteres.
            if (password.length < 8) {
                req.flash(
                    "error",
                    "La contraseña debe tener al menos 8 caracteres."
                );
                return res.redirect("/usuarios/registro");
            }

            if (telefono && !/^\+569\d{8}$/.test(telefono)) {
                console.warn("[REGISTRO] Solicitud rechazada: formato de teléfono inválido.");
                req.flash("error", "El teléfono debe tener formato +56 9 1234 5678");
                return res.redirect("/usuarios/registro");
            }


            // 3. Evitar registrar un correo que ya esté asociado a otra cuenta.
            const usuarioExiste =
                await userModel.buscarPorCorreo(correo);


            // Si existe, no permitir otro registro
            if (usuarioExiste) {
                console.warn("[REGISTRO] Solicitud rechazada: el correo ya está registrado.");

                req.flash(
                    "error",
                    "El correo ya está registrado"
                );

                return res.redirect("/usuarios/registro");
            }


            // 4. Guardar únicamente el hash; nunca registrar la contraseña en consola.
            const contrasenaHash =
                await bcrypt.hash(password, 10);


            // 5. Crear la cuenta y conservar el ID devuelto por MySQL.
            const idUsuario = await userModel.crearUsuario({
                nombres,
                apellidos,
                correo,
                telefono,
                contrasena_hash: contrasenaHash
            });

            // 6. Confirmar en consola que la inserción devolvió el ID del usuario.
            console.info("[REGISTRO] Usuario registrado correctamente.");
            console.info("[REGISTRO] ID de usuario creado:", idUsuario);

            // 7. Informar al usuario y enviarlo al inicio de sesión.
            req.flash(
                "success",
                "Usuario registrado correctamente"
            );


            // Volver al registro
            return res.redirect("/usuarios/login");


        } catch (error) {

            // Registrar el detalle técnico del error sin incluir los datos enviados por el usuario.
            console.error("[REGISTRO] Error al guardar usuario:", {
                code: error.code || "UNKNOWN",
                sqlState: error.sqlState || "UNKNOWN",
                message: error.message || "Sin detalle"
            });


            // Mostrar mensaje al usuario
            req.flash(
                "error",
                error.code === "ER_DUP_ENTRY"
                    ? "El correo o teléfono ya está registrado."
                    : mensajeErrorBaseDatos(error) ||
                        "Ocurrió un error al guardar la cuenta. Inténtalo nuevamente."
            );


            return res.redirect("/usuarios/registro");
        }
    },


    // =========================================
    // MOSTRAR LOGIN
    // =========================================

    mostrarLogin: (req, res) => {

        // Mostrar login.ejs
        res.render("login");
    },


    // =========================================
    // INICIAR SESIÓN
    // =========================================

    // Busca la cuenta en MySQL y compara la contraseña con su versión protegida.
    login: async (req, res) => {

        try {

            // Obtener datos del formulario
            const correo = String(req.body.correo || req.body["email-login"] || "")
                .trim()
                .toLowerCase();
            const password = String(req.body.password || req.body["password-login"] || "");


            // Verificar que estén completos
            if (!correo || !password) {

                req.flash(
                    "error",
                    "Debes ingresar correo y contraseña"
                );

                return res.redirect("/usuarios/login");
            }


            // Buscar usuario por correo
            const usuario =
                await userModel.buscarPorCorreo(correo);


            // Si no existe
            if (!usuario) {

                req.flash(
                    "error",
                    "Correo o contraseña incorrectos"
                );

                return res.redirect("/usuarios/login");
            }


            // Comparar contraseña ingresada
            // con la contraseña encriptada de MySQL
            const contraseñaCorrecta =
                await bcrypt.compare(
                    password,
                    usuario.contrasena_hash
                );


            // Si la contraseña es incorrecta
            if (!contraseñaCorrecta) {

                req.flash(
                    "error",
                    "Correo o contraseña incorrectos"
                );

                return res.redirect("/usuarios/login");
            }


            // Guardar usuario en la sesión
            req.session.usuario = {
                id_usuario: usuario.id_usuario,
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                correo: usuario.correo
            };


            // Mensaje de éxito
            req.flash(
                "success",
                "Sesión iniciada correctamente"
            );


            // Enviar al inicio
            return res.redirect("/lobby");


        } catch (error) {

            console.error("[LOGIN] Error al iniciar sesión:", {
                code: error.code || "UNKNOWN",
                message: error.message || "Sin detalle"
            });

            req.flash(
                "error",
                mensajeErrorBaseDatos(error) ||
                    "Ocurrió un error al iniciar sesión"
            );

            return res.redirect("/usuarios/login");
        }
    },
    // =========================================
    // MOSTRAR RECUPERACIÓN DE CONTRASEÑA
    // =========================================

    mostrarRecuperarContrasena: (req, res) => {
        res.render("recuperar-contrasena");
    },


    // =========================================
    // SOLICITAR RECUPERACIÓN DE CONTRASEÑA
    // =========================================

    solicitarRecuperacion: async (req, res) => {
        try {
            // Obtener y normalizar el correo ingresado.
            const correo = String(req.body.correo || "")
                .trim()
                .toLowerCase();

            // Solicitar el correo si el campo está vacío.
            if (!correo) {
                req.flash("error", "Debes ingresar tu correo.");
                return res.redirect("/usuarios/recuperar");
            }

            // Buscar la cuenta asociada al correo.
            const usuario = await userModel.buscarPorCorreo(correo);

            // Usar la misma respuesta para evitar revelar si la cuenta existe.
            if (!usuario) {
                req.flash(
                    "success",
                    "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."
                );

                return res.redirect("/usuarios/recuperar");
            }

            // Generar un token seguro para el enlace de recuperación.
            const token = crypto.randomBytes(32).toString("hex");

            // Guardar únicamente el hash del token.
            const tokenHash = crypto
                .createHash("sha256")
                .update(token)
                .digest("hex");

            // El token vence en una hora.
            const fechaExpiracion = new Date(
                Date.now() + 60 * 60 * 1000
            );

            // Guardar el hash, el usuario y la fecha de expiración.
            await userModel.guardarTokenRecuperacion({
                id_usuario: usuario.id_usuario,
                token_hash: tokenHash,
                fecha_expiracion: fechaExpiracion
            });

            // Enviar el enlace al correo de la cuenta.
            console.log("[RECUPERACIÓN] Intentando enviar correo a:", usuario.correo);
            await emailService.enviarCorreoRecuperacion(
                usuario.correo,
                token
            );
            console.log("[RECUPERACIÓN] Correo enviado correctamente");

            // Confirmar la solicitud con el mensaje genérico.
            req.flash(
                "success",
                "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."
            );

            return res.redirect("/usuarios/recuperar");

        } catch (error) {
            console.error("[RECUPERACIÓN] ERROR COMPLETO:");
            console.error(error);

            req.flash(
                "error",
                "Ocurrió un error. Inténtalo nuevamente."
            );

            return res.redirect("/usuarios/recuperar");
        }
    },


    // =========================================
    // MOSTRAR RESTABLECER CONTRASEÑA
    // =========================================

    mostrarRestablecerContrasena: async (req, res) => {
        try {

            // Obtener token desde la URL
            const token = req.params.token;

            // Crear el mismo hash que guardamos en MySQL
            const tokenHash = crypto
                .createHash("sha256")
                .update(token)
                .digest("hex");

            // Buscar token
            const tokenRecuperacion =
                await userModel.buscarTokenRecuperacion(tokenHash);

            // Si no existe o ya fue utilizado
            if (!tokenRecuperacion) {
                return res.render(
                    "recuperar-contrasena",
                    {
                        error: "El enlace no es válido o ya fue utilizado."
                    }
                );
            }

            // Verificar si expiró
            if (
                new Date(tokenRecuperacion.fecha_expiracion) < new Date()
            ) {
                return res.render(
                    "recuperar-contrasena",
                    {
                        error: "El enlace ha expirado. Solicita uno nuevo."
                    }
                );
            }

            // Token válido
            return res.render(
                "restablecer-contrasena",
                {
                    token
                }
            );

        } catch (error) {

            console.error(
                "[RESTABLECER] Error:",
                error.code || "UNKNOWN"
            );

            return res.render(
                "recuperar-contrasena",
                {
                    error: "Ocurrió un error. Inténtalo nuevamente."
                }
            );
        }
    },

    // =========================================
    // RESTABLECER CONTRASEÑA
    // =========================================

    restablecerContrasena: async (req, res) => {

        try {

            // Obtener el token desde la URL
            const token = req.params.token;

            // Obtener las contraseñas del formulario
            const password = String(req.body.password || "");

            const confirmarPassword = String(
                req.body.confirmarPassword || ""
            );

            // =========================================
            // VALIDAR CONTRASEÑA
            // =========================================

            const passwordValida = password.length >= 8;

            if (!passwordValida) {

                req.flash(
                    "error",
                    "La contraseña debe tener al menos 8 caracteres."
                );

                return res.redirect(
                    `/usuarios/restablecer/${token}`
                );
            }

            // =========================================
            // COMPARAR CONTRASEÑAS
            // =========================================

            if (password !== confirmarPassword) {

                req.flash(
                    "error",
                    "Las contraseñas no coinciden."
                );

                return res.redirect(
                    `/usuarios/restablecer/${token}`
                );
            }

            // =========================================
            // BUSCAR TOKEN
            // =========================================

            const tokenHash = crypto
                .createHash("sha256")
                .update(token)
                .digest("hex");

            const tokenRecuperacion =
                await userModel.buscarTokenRecuperacion(tokenHash);

            // Si el token no existe o ya fue utilizado
            if (!tokenRecuperacion) {

                req.flash(
                    "error",
                    "El enlace no es válido o ya fue utilizado. Solicita uno nuevo."
                );

                return res.redirect(
                    "/usuarios/recuperar"
                );
            }

            // =========================================
            // VERIFICAR EXPIRACIÓN
            // =========================================

            if (
                new Date(tokenRecuperacion.fecha_expiracion)
                < new Date()
            ) {

                req.flash(
                    "error",
                    "El enlace ha expirado. Solicita uno nuevo."
                );

                return res.redirect(
                    "/usuarios/recuperar"
                );
            }

            // =========================================
            // ENCRIPTAR NUEVA CONTRASEÑA
            // =========================================

            const nuevaContrasenaHash =
                await bcrypt.hash(password, 10);

            // =========================================
            // ACTUALIZAR CONTRASEÑA EN MYSQL
            // =========================================

            await userModel.actualizarContrasena(
                tokenRecuperacion.id_usuario,
                nuevaContrasenaHash
            );

            // =========================================
            // MARCAR TOKEN COMO UTILIZADO
            // =========================================

            await userModel.marcarTokenUsado(
                tokenRecuperacion.id_token_recuperacion
            );

            // =========================================
            // MENSAJE DE ÉXITO
            // =========================================

            req.flash(
                "success",
                "Tu contraseña fue actualizada correctamente. Ahora puedes iniciar sesión."
            );

            return res.redirect(
                "/usuarios/login"
            );

        } catch (error) {

            console.error(
                "[RESTABLECER] Error:",
                error.code || "UNKNOWN"
            );

            req.flash(
                "error",
                "Ocurrió un error al cambiar la contraseña. Inténtalo nuevamente."
            );

            return res.redirect(
                "/usuarios/recuperar"
            );
        }
    },




};


module.exports = userController;
