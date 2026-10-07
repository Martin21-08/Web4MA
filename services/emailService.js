const nodemailer = require("nodemailer");

async function enviarCorreoRecuperacion(correoDestino, token) {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    if (!emailUser || !emailPassword) {
        throw new Error("Faltan EMAIL_USER o EMAIL_PASSWORD en las variables de entorno.");
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: emailUser,
            pass: emailPassword
        }
    });

    const enlaceRecuperacion = `http://localhost:3000/usuarios/restablecer/${token}`;

    return transporter.sendMail({
        from: emailUser,
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
}

module.exports = {
    enviarCorreoRecuperacion
};
