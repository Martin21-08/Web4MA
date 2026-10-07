const nodemailer = require("nodemailer");

// Envía el correo con el enlace para recuperar la contraseña.
async function enviarCorreoRecuperacion(correoDestino, token) {
    // Configurar el acceso SMTP de Brevo desde las variables de entorno.
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    // Verificar que la conexión y las credenciales SMTP funcionen.
    console.log("[EMAIL] Intentando conectar con Brevo SMTP...");
    try {
        await transporter.verify();
        console.log("[EMAIL] Conexión SMTP con Brevo correcta.");
    } catch (error) {
        console.error("[EMAIL] Error de conexión SMTP con Brevo:");
        console.error(error);
        throw error;
    }

    // Crear el enlace que permitirá restablecer la contraseña.
    const enlaceRecuperacion = `http://localhost:3000/usuarios/restablecer/${token}`;

    // Enviar el mensaje al correo indicado.
    console.log("[EMAIL] Intentando enviar correo a:", correoDestino);
    try {
        const resultado = await transporter.sendMail({
            from: "CookIQ <cookiq.oficial@gmail.com>",
            to: correoDestino,
            subject: "Recuperación de contraseña - CookIQ",
            text: [
                "Solicitaste recuperar la contraseña de tu cuenta CookIQ.",
                `Restablece tu contraseña desde este enlace: ${enlaceRecuperacion}`,
                "El enlace es válido durante 1 hora.",
                "Si no solicitaste este cambio, puedes ignorar este correo."
            ].join("\n\n"),
            html: `
            <div style="font-family: Arial, sans-serif; color: #41372f; line-height: 1.6;">
                <h2>Recuperación de contraseña - CookIQ</h2>
                <p>Solicitaste recuperar la contraseña de tu cuenta CookIQ.</p>
                <p>
                    <a href="${enlaceRecuperacion}" style="display: inline-block; padding: 12px 20px; border-radius: 8px; background-color: #704b9e; color: #ffffff; text-decoration: none;">
                        Restablecer contraseña
                    </a>
                </p>
                <p>Este enlace es válido durante 1 hora.</p>
                <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
            </div>
        `
        });

        console.log("[EMAIL] Correo aceptado por el servidor SMTP.");
        console.log("[EMAIL] Message ID:", resultado.messageId);
        return resultado;
    } catch (error) {
        console.error("[EMAIL] Error al enviar correo:");
        console.error(error);
        throw error;
    }
}

module.exports = {
    enviarCorreoRecuperacion
};
