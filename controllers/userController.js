const bcrypt = require("bcrypt");

const userModel = require("../models/userModel");


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

    register: async (req, res) => {

        try {

            // 1. Leer y normalizar los datos enviados desde el formulario.
            const nombres = String(req.body.nombres || req.body.nombre || "").trim();
            const apellidos = String(req.body.apellidos || req.body.apellido || "").trim();
            const correo = String(req.body.correo || "").trim().toLowerCase();
            const password = String(req.body.password || "");
            const telefonoIngresado = String(req.body.telefono || "").trim();
            const telefono = telefonoIngresado
                ? telefonoIngresado.replace(/[\s()-]/g, "")
                : null;


            // 2. Validar los campos requeridos antes de consultar la base de datos.
            if (!nombres || !apellidos || !correo || !password) {
                console.warn("[REGISTRO] Solicitud rechazada: faltan campos obligatorios.");

                req.flash(
                    "error",
                    "Debes completar todos los campos obligatorios"
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

            // 6. Mostrar datos útiles solo en desarrollo; ocultar parte del teléfono.
            console.info("[REGISTRO] Usuario registrado correctamente.");
            if (process.env.NODE_ENV !== "production") {
                console.info("[REGISTRO] Datos registrados:", {
                    id_usuario: idUsuario,
                    nombres,
                    apellidos,
                    correo,
                    telefono: telefono
                        ? `${"*".repeat(Math.max(0, telefono.length - 4))}${telefono.slice(-4)}`
                        : null
                });
            }

            // 7. Informar al usuario y enviarlo al inicio de sesión.
            req.flash(
                "success",
                "Usuario registrado correctamente"
            );


            // Volver al registro
            return res.redirect("/usuarios/login");


        } catch (error) {

            // No imprimir el objeto completo para evitar exponer datos de la consulta.
            console.error("[REGISTRO] Error al guardar usuario:", error.code || "UNKNOWN");


            // Mostrar mensaje al usuario
            req.flash(
                "error",
                "Ocurrió un error al registrar el usuario"
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

            console.error(error);

            req.flash(
                "error",
                "Ocurrió un error al iniciar sesión"
            );

            return res.redirect("/usuarios/login");
        }
    }

};


module.exports = userController;