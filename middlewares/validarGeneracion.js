const validarGeneracion = (req, res, next) => {
    const { ingredientes } = req.body;

    if (!Array.isArray(ingredientes)) {
        return res.status(400).json({ ok: false, error: 'Los ingredientes deben enviarse como una lista.' });
    }
    if (ingredientes.length === 0) {
        return res.status(400).json({ ok: false, error: 'Debes seleccionar al menos un ingrediente.' });
    }
    if (ingredientes.length > 20) {
        return res.status(400).json({ ok: false, error: 'No puedes enviar más de 20 ingredientes.' });
    }

    next();
};

module.exports = validarGeneracion;

