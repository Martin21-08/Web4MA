const historialModel = require('../models/historialModel');

const listarHistorial = async (req, res, next) => {
  try {
    const idUsuario = Number(req.session?.usuario?.id_usuario);
    if (!Number.isInteger(idUsuario) || idUsuario < 1) {
      return res.status(401).json({ ok: false, mensaje: 'Debes iniciar sesión para consultar el historial.' });
    }
    const busquedas = await historialModel.obtenerPorUsuario(idUsuario);
    return res.json({ ok: true, busquedas });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listarHistorial };
