const requiere = (campos) => {
    return (req, res, next) => {
        const faltantes = campos.filter(campo => !req.body[campo]);
        if (faltantes.length > 0) {
            return res.status(400).json({ error: 'Faltan campos obligatorios.', faltantes });
        }
        next();
    };
};

module.exports = requiere;
