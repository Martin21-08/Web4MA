// ============================================================================
//API GOOGLE AT
// Firebase se inicializa en firebase-auth.js, que se carga como módulo.




//============================================================================
// CUENTAS Y PERFILES
// Cada perfil se guarda usando el nombre como identificador.
// ============================================================================

const obtenerPerfiles = () => {
  const perfiles = leer('miCocinaPerfiles', {});
  const perfilAnterior = leer('miCocinaPerfil', null);

  // Migra el formato anterior de un único perfil al nuevo formato.
  if (perfilAnterior?.nombre && !perfiles[perfilAnterior.nombre]) {
    perfiles[perfilAnterior.nombre] = perfilAnterior;
    guardar('miCocinaPerfiles', perfiles);
  }
  return perfiles;
};

const obtenerPerfilActivo = () => {
  const nombreActivo = localStorage.getItem('miCocinaUsuarioActivo');
  return nombreActivo ? obtenerPerfiles()[nombreActivo] : null;
};

const guardarPerfilActivo = perfil => {
  const perfiles = obtenerPerfiles();
  perfiles[perfil.nombre] = perfil;
  guardar('miCocinaPerfiles', perfiles);
  guardar('miCocinaPerfil', perfil);
};

const mostrarFormularioPerfilInicial = datosIniciales => new Promise(resolve => {
  const modal = obtenerElemento('modalPerfilInicial');
  const formulario = obtenerElemento('formPerfilInicial');
  if (!modal || !formulario) {
    resolve(null);
    return;
  }

  const campos = {
    nombre: 'inicioNombre',
    apellido: 'inicioApellido',
    nacimiento: 'inicioNacimiento',
    correo: 'inicioCorreo',
    telefono: 'inicioTelefono'
  };
  const alergias = datosIniciales?.alergias || [];
  const intolerancias = datosIniciales?.intolerancias || [];

  Object.entries(campos).forEach(([clave, id]) => {
    obtenerElemento(id).value = datosIniciales?.[clave] || '';
  });
  formulario.querySelectorAll('input[name="alergias"]').forEach(casilla => {
    casilla.checked = alergias.includes(casilla.value);
  });
  formulario.querySelectorAll('input[name="intolerancias"]').forEach(casilla => {
    casilla.checked = intolerancias.includes(casilla.value);
  });

  modal.classList.add('abierto');
  formulario.onsubmit = evento => {
    evento.preventDefault();
    const perfil = {
      ...datosIniciales,
      ...Object.fromEntries(
        Object.entries(campos).map(([clave, id]) => [clave, obtenerElemento(id).value.trim()])
      ),
      alergias: [...formulario.querySelectorAll('input[name="alergias"]:checked')].map(casilla => casilla.value),
      intolerancias: [...formulario.querySelectorAll('input[name="intolerancias"]:checked')].map(casilla => casilla.value)
    };
    guardarPerfilActivo(perfil);
    modal.classList.remove('abierto');
    resolve(perfil);
  };
});

window.mostrarFormularioPerfilInicial = mostrarFormularioPerfilInicial;

const iniciarRegistro = () => {
  const formulario = obtenerElemento('formRegistro');
  if (!formulario) return;

  formulario.onsubmit = async evento => {
    evento.preventDefault();
    const boton = obtenerElemento('btnCrearCuenta');
    if (boton) boton.disabled = true;

    try {
      const datosRegistro = Object.fromEntries(new FormData(formulario));
      const respuesta = await fetch(formulario.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(datosRegistro)
      });
      if (!respuesta.ok) throw new Error('No se pudo completar el registro.');

      await mostrarFormularioPerfilInicial({
        nombre: datosRegistro.nombre,
        apellido: datosRegistro.apellido,
        correo: datosRegistro.correo,
        telefono: datosRegistro.telefono,
        nacimiento: datosRegistro.nacimiento
      });
      window.location.assign('/lobby');
    } catch (error) {
      console.error('Error al registrar la cuenta:', error);
      window.alert(error.message || 'No se pudo completar el registro.');
      if (boton) boton.disabled = false;
    }
  };
};


// ============================================================================

// UTILIDADES GENERALES
// ============================================================================

// Lee JSON del almacenamiento local y devuelve un valor seguro si aún no existe.
const leer = (clave, porDefecto = []) => {
  const valor = localStorage.getItem(clave);
  return valor ? JSON.parse(valor) : porDefecto;
};

// Notifica al backend para facilitar la futura migración de localStorage a MySQL.
const enviarAlBackend = (clave, datos) => {
  fetch('/api/datos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clave, datos })
  }).catch(() => {
    console.error(`No se pudo enviar ${clave} al backend.`);
  });
};

// Guarda primero en el navegador para que la interfaz funcione sin base de datos.
const guardar = (clave, datos) => {
  localStorage.setItem(clave, JSON.stringify(datos));
  enviarAlBackend(clave, datos);
};

// ============================================================================
// CUENTAS Y PERFILES PROVISIONALES
// Este bloque se puede reemplazar por consultas a la base de datos más adelante.
// ============================================================================

// Normaliza teléfono y correo para que la misma cuenta no se guarde dos veces.
const normalizarIdentificador = valor => String(valor || '').trim().toLowerCase().replace(/[^a-z0-9@.+_-]/g, '');

// Genera una clave estable sin depender del nombre visible del usuario.
const crearIdCuenta = ({ telefono, correo, firebaseUid } = {}) => {
  const identificador = normalizarIdentificador(firebaseUid || correo || telefono);
  return identificador ? `${firebaseUid ? 'google' : 'sms'}_${identificador}` : `local_${Date.now()}`;
};

const obtenerPerfiles = () => {
  const perfiles = leer('miCocinaPerfiles', {});
  const perfilAnterior = leer('miCocinaPerfil', null);

  // Migra el formato anterior, que usaba el nombre como clave, una sola vez.
  if (perfilAnterior?.nombre) {
    const id = perfilAnterior.id || crearIdCuenta(perfilAnterior);
    if (!perfiles[id]) perfiles[id] = { ...perfilAnterior, id };
    guardar('miCocinaPerfiles', perfiles);
  }
  return perfiles;
};

// Busca una cuenta por teléfono, correo o UID de Google.
const buscarPerfil = ({ telefono, correo, firebaseUid } = {}) => {
  const valores = [telefono, correo, firebaseUid].map(normalizarIdentificador).filter(Boolean);
  return Object.values(obtenerPerfiles()).find(perfil => (
    valores.includes(normalizarIdentificador(perfil.telefono)) ||
    valores.includes(normalizarIdentificador(perfil.correo)) ||
    valores.includes(normalizarIdentificador(perfil.firebaseUid))
  )) || null;
};

const obtenerPerfilActivo = () => {
  const idActivo = localStorage.getItem('miCocinaUsuarioActivo');
  return idActivo ? obtenerPerfiles()[idActivo] || null : null;
};

const guardarPerfilActivo = perfil => {
  const perfiles = obtenerPerfiles();
  const perfilGuardado = { ...perfil, id: perfil.id || crearIdCuenta(perfil) };
  perfiles[perfilGuardado.id] = perfilGuardado;
  guardar('miCocinaPerfiles', perfiles);
  guardar('miCocinaPerfil', perfilGuardado);
  localStorage.setItem('miCocinaUsuarioActivo', perfilGuardado.id);
  return perfilGuardado;
};

const perfilTienePersonalizacion = perfil => Boolean(
  perfil?.personalizacionCompleta === true || (
    Array.isArray(perfil?.alergias) && Array.isArray(perfil?.intolerancias)
  )
);

// Abre la personalización solo cuando todavía no se ha confirmado.
const abrirPersonalizacion = (perfil, despuesDeGuardar = () => {}) => {
  const modal = obtenerElemento('modalPersonalizacion');
  const formulario = obtenerElemento('formPersonalizacion');

  if (perfilTienePersonalizacion(perfil)) {
    despuesDeGuardar(perfil);
    return;
  }

  if (!modal || !formulario) {
    despuesDeGuardar(perfil);
    return;
  }

  document.querySelectorAll('#formPersonalizacion input[name="alergias"], #formPersonalizacion input[name="intolerancias"]')
    .forEach(casilla => {
      const grupo = casilla.name;
      casilla.checked = (perfil[grupo] || []).includes(casilla.value);
    });
  modal.classList.add('abierto');

  // El arreglo vacío también es válido: significa que la persona eligió no declarar restricciones.
  formulario.onsubmit = evento => {
    evento.preventDefault();
    const perfilPersonalizado = guardarPerfilActivo({
      ...perfil,
      alergias: [...formulario.querySelectorAll('input[name="alergias"]:checked')].map(casilla => casilla.value),
      intolerancias: [...formulario.querySelectorAll('input[name="intolerancias"]:checked')].map(casilla => casilla.value),
      personalizacionCompleta: true
    });
    modal.classList.remove('abierto');
    despuesDeGuardar(perfilPersonalizado);
  };
};

// Expone el adaptador que luego podrá reemplazarse por llamadas a la base de datos.
window.miCocinaAuth = {
  buscarPerfil,
  guardarPerfilActivo,
  obtenerPerfilActivo,
  crearIdCuenta,
  perfilTienePersonalizacion,
  abrirPersonalizacion
};

// Controla la entrada provisional por SMS y muestra el alta cuando el número es nuevo.
const iniciarLoginSms = () => {
  const boton = obtenerElemento('iniciarPorSms');
  const modal = obtenerElemento('modalRegistroPerfil');
  const telefono = obtenerElemento('smsTelefono');
  const formulario = obtenerElemento('formRegistroPerfil');
  if (!boton || !modal || !telefono || !formulario) return;

  boton.onclick = () => {
    const numero = window.prompt('Ingresa el número que recibió el código SMS:');
    if (numero === null) return;
    const telefonoNormalizado = numero.trim();
    if (!telefonoNormalizado) {
      window.alert('Ingresa un número de teléfono para continuar.');
      return;
    }

    // El número funciona como identidad provisional de la cuenta SMS.
    const perfil = buscarPerfil({ telefono: telefonoNormalizado });
    if (perfil) {
      guardarPerfilActivo(perfil);
      abrirPersonalizacion(perfil, () => window.location.assign('/lobby'));
      return;
    }

    window.alert('Este número todavía no tiene un perfil. Regístralo antes de entrar a la cocina.');
    formulario.reset();
    telefono.value = telefonoNormalizado;
    modal.classList.add('abierto');
    obtenerElemento('registroPerfilNombre')?.focus();
  };

  obtenerElemento('cerrarRegistroPerfil').onclick = () => modal.classList.remove('abierto');
  formulario.onsubmit = evento => {
    evento.preventDefault();
    const perfil = Object.fromEntries(new FormData(formulario).entries());
    const perfilGuardado = guardarPerfilActivo({ ...perfil, metodo: 'sms' });
    modal.classList.remove('abierto');
    abrirPersonalizacion(perfilGuardado, () => window.location.assign('/lobby'));
  };
};

// Valida provisionalmente correo y contraseña contra los perfiles guardados.
const iniciarLoginClasico = () => {
  const formulario = obtenerElemento('formLogin');
  if (!formulario) return;

  formulario.onsubmit = evento => {
    evento.preventDefault();
    const correo = formulario.elements['email-login'].value.trim();
    const password = formulario.elements['password-login'].value;
    // La contraseña se compara aquí solo porque todavía no existe un backend de autenticación.
    const perfil = buscarPerfil({ correo });

    if (!perfil || perfil.password !== password) {
      window.alert('El correo o la contraseña no coinciden con una cuenta registrada.');
      return;
    }

    const perfilActivo = guardarPerfilActivo(perfil);
    abrirPersonalizacion(perfilActivo, () => window.location.assign('/lobby'));
  };
};

// Guarda el registro clásico en el mismo formato provisional que los otros accesos.
const iniciarRegistroClasico = () => {
  const formulario = obtenerElemento('formRegistro');
  if (!formulario) return;

  formulario.onsubmit = evento => {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(formulario).entries());
    if (buscarPerfil({ correo: datos.correo })) {
      window.alert('Ya existe una cuenta con ese correo.');
      return;
    }
    guardarPerfilActivo({ ...datos, metodo: 'clasico' });
    window.alert('Cuenta creada correctamente. Ahora inicia sesión para personalizar tu perfil.');
    window.location.assign('/');
  };
};

const obtenerElemento = id => document.getElementById(id);
const favoritos = () => leer('miCocinaFavoritos');

// ============================================================================
// SIDEBAR
// Marca como activa la pestaña correspondiente a la URL actual.
// ============================================================================

const iniciarSidebar = () => {
  const rutaActual = window.location.pathname.replace(/\/$/, '') || '/';

  document.querySelectorAll('.inicio-menu a').forEach(enlace => {
    const rutaEnlace = new URL(enlace.href, window.location.origin).pathname.replace(/\/$/, '');
    enlace.classList.toggle('activa', rutaEnlace === rutaActual);
  });
};

const ingredientesDisponibles = [
  'tomate', 'pollo', 'arroz', 'papa', 'cebolla', 'zanahoria', 'ajo',
  'huevo', 'queso', 'pasta', 'atún', 'palta', 'espinaca', 'leche',
  'champiñón', 'lentejas'
];

// ============================================================================
// PANTALLA DE PERFIL
// Carga los datos guardados y permite actualizar la información personal.
// ============================================================================

const iniciarPerfil = () => {
  const formulario = obtenerElemento('formPerfil');
  if (!formulario) return;

  const campos = {
    nombre: 'perfilNombre',
    apellido: 'perfilApellido',
    correo: 'perfilCorreo',
    telefono: 'perfilTelefono',
    nacimiento: 'perfilNacimiento'
  };
  const datos = obtenerPerfilActivo() || {};
  const alergias = datos.alergias || [];
  const intolerancias = datos.intolerancias || alergias.filter(opcion => ['Gluten', 'Lactosa'].includes(opcion));

  Object.entries(campos).forEach(([clave, id]) => {
    obtenerElemento(id).value = datos[clave] || '';
  });
  document.querySelectorAll('#formPerfil input[name="alergias"]').forEach(casilla => {
    casilla.checked = alergias.includes(casilla.value);
  });
  document.querySelectorAll('#formPerfil input[name="intolerancias"]').forEach(casilla => {
    casilla.checked = intolerancias.includes(casilla.value);
  });

  const modalPersonalizacion = obtenerElemento('modalPersonalizacionPerfil');
  const formularioPersonalizacion = obtenerElemento('formPersonalizacionPerfil');
  const abrirPersonalizacionPerfil = obtenerElemento('abrirPersonalizacionPerfil');
  const sincronizarOpcionesPerfil = perfil => {
    document.querySelectorAll('#formPerfil input[name="alergias"], #formPerfil input[name="intolerancias"]').forEach(casilla => {
      casilla.checked = (perfil[casilla.name] || []).includes(casilla.value);
    });
  };

  if (modalPersonalizacion && formularioPersonalizacion && abrirPersonalizacionPerfil) {
    abrirPersonalizacionPerfil.onclick = () => {
      formularioPersonalizacion.querySelectorAll('input[name="alergias"], input[name="intolerancias"]').forEach(casilla => {
        casilla.checked = (datos[casilla.name] || []).includes(casilla.value);
      });
      modalPersonalizacion.classList.add('abierto');
    };

    obtenerElemento('cerrarPersonalizacionPerfil').onclick = () => modalPersonalizacion.classList.remove('abierto');
    formularioPersonalizacion.onsubmit = evento => {
      evento.preventDefault();
      const perfilActualizado = guardarPerfilActivo({
        ...datos,
        alergias: [...formularioPersonalizacion.querySelectorAll('input[name="alergias"]:checked')].map(casilla => casilla.value),
        intolerancias: [...formularioPersonalizacion.querySelectorAll('input[name="intolerancias"]:checked')].map(casilla => casilla.value),
        personalizacionCompleta: true
      });
      Object.assign(datos, perfilActualizado);
      sincronizarOpcionesPerfil(perfilActualizado);
      modalPersonalizacion.classList.remove('abierto');
      alert('Alergias e intolerancias guardadas correctamente.');
    };
  }

  const guardarCambios = () => {
    const perfilActualizado = {
      ...datos,
      ...Object.fromEntries(
        Object.entries(campos).map(([clave, id]) => [
          clave,
          obtenerElemento(id).value.trim()
        ])
      ),
      alergias: [...document.querySelectorAll('#formPerfil input[name="alergias"]:checked')]
        .map(casilla => casilla.value),
      intolerancias: [...document.querySelectorAll('#formPerfil input[name="intolerancias"]:checked')]
        .map(casilla => casilla.value)
    };
    guardarPerfilActivo(perfilActualizado);
    return perfilActualizado;
  };

  formulario.onsubmit = evento => {
    evento.preventDefault();
    guardarCambios();
    alert('Cambios guardados correctamente.');
  };

  obtenerElemento('cerrarSesion').onclick = () => {
    guardarCambios();
    localStorage.removeItem('miCocinaRecetasGeneradas');
    localStorage.removeItem('miCocinaUsuarioActivo');
    window.location.href = '/';
  };
};

// ============================================================================
// PANTALLA LOBBY: BUSCADOR Y RECETAS
// Gestiona ingredientes, filtros, resultados, favoritos e historial.
// ============================================================================

const recetasDisponibles = [
  {
    nombre: 'Salteado casero',
    icono: '🥘',
    dificultad: 'Fácil',
    descripcion: 'Una preparación rápida, colorida y llena de sabor.',
    faltantes: ['pimentón', 'aceite de oliva'],
    pasos: [
      'Lava las verduras y córtalas en tiras del mismo tamaño para que se cocinen parejo.',
      'Calienta una sartén grande a fuego medio-alto, agrega aceite y sofríe la cebolla con el ajo por dos minutos.',
      'Incorpora el resto de ingredientes, mezcla constantemente y cocina hasta que estén dorados pero aún jugosos.',
      'Prueba, ajusta sal y pimienta, y sirve de inmediato con arroz o pan.'
    ]
  },
  {
    nombre: 'Bowl cremoso',
    icono: '🥗',
    dificultad: 'Medio',
    descripcion: 'Un bowl suave y nutritivo para disfrutar sin complicaciones.',
    faltantes: ['yogur natural', 'limón'],
    pasos: [
      'Lava y corta los ingredientes frescos; cocina el arroz o la base elegida siguiendo las indicaciones del envase.',
      'Mezcla yogur, jugo de limón, sal y un chorrito de aceite hasta obtener una salsa cremosa.',
      'Arma el bowl por capas: primero la base tibia, luego las verduras y la proteína.',
      'Termina con la salsa y mezcla suavemente antes de servir.'
    ]
  },
  {
    nombre: 'Tortilla dorada',
    icono: '🍳',
    dificultad: 'Difícil',
    descripcion: 'Una receta sencilla para aprovechar tu despensa.',
    faltantes: ['perejil', 'pimienta'],
    pasos: [
      'Pela y corta los vegetales en cubos pequeños para que se cocinen de forma uniforme.',
      'Saltéalos en una sartén antiadherente con aceite hasta que estén blandos y ligeramente dorados.',
      'Bate los huevos con sal y pimienta, viértelos sobre los vegetales y mueve suavemente la sartén.',
      'Cocina tapado a fuego bajo, da vuelta con ayuda de un plato y termina hasta que ambos lados estén dorados.'
    ]
  }
];

const iniciarLobby = () => {
  const buscarIngrediente = obtenerElemento('buscarIngrediente');
  if (!buscarIngrediente) return;

  const sugerencias = obtenerElemento('sugerencias');
  const ingredientesElegidos = obtenerElemento('ingredientesElegidos');
  const modalFiltros = obtenerElemento('modalFiltros');
  const modalReceta = obtenerElemento('modalReceta');
  const detalleReceta = obtenerElemento('detalleReceta');
  const pedirFaltantes = obtenerElemento('pedirFaltantes');
  const usarDespensa = obtenerElemento('usarDespensa');
  let elegidos = [];
  let tiempo = '30 min';
  let porciones = '2';
  let dificultad = 'Todas';

  const pintarIngredientes = () => {
    ingredientesElegidos.innerHTML = elegidos.map((ingrediente, indice) => `
      <span class="chip-ingrediente">
        ${ingrediente}
        <button type="button" onclick="quitarIngrediente(${indice})">×</button>
      </span>
    `).join('');
  };

  const sugerirIngredientes = (texto, destino, funcion) => {
    const coincidencias = ingredientesDisponibles.filter(ingrediente => (
      ingrediente.includes(texto.toLowerCase()) &&
      !elegidos.includes(ingrediente)
    ));

    destino.innerHTML = texto
      ? coincidencias.map(ingrediente => (
        `<button type="button" class="sugerencia" onclick="${funcion}('${ingrediente}')">+ ${ingrediente}</button>`
      )).join('')
      : '';
  };

  const pintarOpciones = (id, valores, actual, cambiar) => {
    const contenedor = obtenerElemento(id);
    contenedor.innerHTML = valores.map(valor => `
      <button class="filtro-opcion ${valor === actual ? 'seleccionada' : ''}" data-v="${valor}">
        ${valor}
      </button>
    `).join('');

    [...contenedor.children].forEach(boton => {
      boton.onclick = () => {
        [...contenedor.children].forEach(opcion => opcion.classList.remove('seleccionada'));
        boton.classList.add('seleccionada');
        cambiar(boton.dataset.v);
      };
    });
  };

  const ingredientesParaReceta = () => usarDespensa.checked
    ? [...new Set([...elegidos, ...leer('miCocinaDespensa')])]
    : elegidos;

  const esFavorita = receta => favoritos().some(item => item.nombre === receta.nombre);
  const mensajeSinRecetas = '<p class="sin-resultados">No Hay Recetas generadas</p>';

  const comentariosDe = receta => leer('miCocinaComentarios', {})[receta.nombre] || [];

  const pintarComentarios = receta => comentariosDe(receta).map((comentario, indice) => `
    <article class="comentario-item">
      <div class="comentario-cabecera">
        <strong>${comentario.usuario}</strong>
        <span class="estrellas-mostradas">${'★'.repeat(comentario.estrellas)}${'☆'.repeat(5 - comentario.estrellas)}</span>
      </div>
      <p>${comentario.texto}</p>
      <div class="comentario-acciones">
        <button type="button" onclick="editarComentario('${receta.nombre}', ${indice})">Editar</button>
        <button type="button" onclick="borrarComentario('${receta.nombre}', ${indice})">Borrar</button>
      </div>
    </article>
  `).join('') || '<p class="sin-comentarios">Aún no hay comentarios para esta receta.</p>';

  const formularioComentarios = receta => `
    <form action="/api/datos" method="POST" class="comentarios-receta" id="formComentario">
      <h3>Comentarios y valoración</h3>
      <div class="estrellas-interactivas" aria-label="Calificar receta">
        ${[1, 2, 3, 4, 5].map(valor => `<button type="button" class="estrella-boton" data-receta="${receta.nombre}" data-valor="${valor}" aria-label="${valor} estrellas">☆</button>`).join('')}
      </div>
      <textarea id="nuevoComentario" name="comentario" class="comentario-input" placeholder="Escribe un comentario sobre esta receta" rows="3"></textarea>
      <button type="submit" class="boton-generar" id="guardarComentario">Publicar comentario</button>
      <div id="listaComentarios">${pintarComentarios(receta)}</div>
    </form>
  `;

  const actualizarEstrellas = estrellas => {
    document.querySelectorAll('.estrella-boton').forEach(boton => {
      boton.textContent = Number(boton.dataset.valor) <= estrellas ? '★' : '☆';
      boton.classList.toggle('seleccionada', Number(boton.dataset.valor) <= estrellas);
    });
  };

  window.editarComentario = (nombreReceta, indice) => {
    const comentarios = leer('miCocinaComentarios', {});
    const comentario = comentarios[nombreReceta]?.[indice];
    if (!comentario) return;

    const textoNuevo = window.prompt('Edita tu comentario:', comentario.texto);
    if (textoNuevo === null || !textoNuevo.trim()) return;
    comentario.texto = textoNuevo.trim();
    guardar('miCocinaComentarios', comentarios);
    const lista = document.getElementById('listaComentarios');
    const receta = recetasDisponibles.find(item => item.nombre === nombreReceta);
    if (lista && receta) lista.innerHTML = pintarComentarios(receta);
  };

  window.borrarComentario = (nombreReceta, indice) => {
    const comentarios = leer('miCocinaComentarios', {});
    if (!comentarios[nombreReceta]?.[indice]) return;
    if (!window.confirm('¿Quieres borrar este comentario?')) return;
    comentarios[nombreReceta].splice(indice, 1);
    guardar('miCocinaComentarios', comentarios);
    const lista = document.getElementById('listaComentarios');
    const receta = recetasDisponibles.find(item => item.nombre === nombreReceta);
    if (lista && receta) lista.innerHTML = pintarComentarios(receta);
  };

  const abrirReceta = indice => {
    const receta = recetasDisponibles[indice];
    const historial = leer('miCocinaHistorialRecetas');
    historial.unshift({ ...receta, tiempo, porciones });
    guardar('miCocinaHistorialRecetas', historial.slice(0, 30));
    detalleReceta.innerHTML = `
      <button class="modal-cerrar" onclick="modalReceta.classList.remove('abierto')">Cerrar</button>
      <h2>${receta.icono} ${receta.nombre}</h2>
      <p>${receta.descripcion}</p>
      <p><b>Tiempo:</b> ${tiempo} · <b>Porciones:</b> ${porciones} · <b>Dificultad:</b> ${receta.dificultad}</p>
      <h3>Preparación</h3>
      <ol>${receta.pasos.map(paso => `<li>${paso}</li>`).join('')}</ol>
      ${formularioComentarios(receta)}
    `;
    modalReceta.classList.add('abierto');

    let estrellasSeleccionadas = 0;
    document.querySelectorAll('.estrella-boton').forEach(boton => {
      boton.onclick = () => {
        estrellasSeleccionadas = Number(boton.dataset.valor);
        actualizarEstrellas(estrellasSeleccionadas);
      };
    });
    document.getElementById('formComentario').onsubmit = evento => {
      evento.preventDefault();
      const texto = document.getElementById('nuevoComentario').value.trim();
      if (!texto || !estrellasSeleccionadas) {
        alert('Escribe un comentario y selecciona una calificación.');
        return;
      }
      const comentarios = leer('miCocinaComentarios', {});
      comentarios[receta.nombre] = comentarios[receta.nombre] || [];
      comentarios[receta.nombre].push({ usuario: 'Usuario', texto, estrellas: estrellasSeleccionadas });
      guardar('miCocinaComentarios', comentarios);
      document.getElementById('listaComentarios').innerHTML = pintarComentarios(receta);
      document.getElementById('nuevoComentario').value = '';
      estrellasSeleccionadas = 0;
      actualizarEstrellas(0);
    };
  };

  const renderizarRecetas = base => recetasDisponibles
    .map((receta, indiceOriginal) => ({ receta, indiceOriginal }))
    .filter(({ receta }) => dificultad === 'Todas' || receta.dificultad === dificultad)
    .map(({ receta, indiceOriginal }) => `
    <article class="receta-card">
      <div class="receta-imagen">
        <span>${receta.icono}</span>
        <button class="favorito-corazon ${esFavorita(receta) ? 'activo' : ''}" onclick="toggleFavorito(${indiceOriginal})">
          ${esFavorita(receta) ? '♥' : '♡'}
        </button>
      </div>
      <div class="receta-cuerpo">
        <h3>${receta.nombre} con ${base}</h3>
        <p>${receta.descripcion}</p>
        <div class="receta-datos">
          <span>◷ ${tiempo}</span>
          <span>🍽 ${porciones} porciones</span>
          <span>⚑ ${receta.dificultad}</span>
        </div>
        ${esFavorita(receta) ? '<p class="favorito-mensaje">♥ Agregado a favoritos</p>' : ''}
        ${pedirFaltantes.checked ? `
          <div class="faltantes-lista">
            <b>Faltan:</b> ${receta.faltantes.join(', ')}
            <button class="link-compras" onclick="agregarCompras(${indiceOriginal})">Agregar a compras</button>
          </div>
        ` : ''}
        <button class="boton-ver" onclick="abrirReceta(${indiceOriginal})">Ver receta completa</button>
      </div>
    </article>
  `);

  const generarRecetas = (registrar = true) => {
    const ingredientes = ingredientesParaReceta();
    const base = ingredientes.length ? ingredientes.join(', ') : 'los ingredientes de tu cocina';

    guardar('miCocinaRecetasGeneradas', {
      base,
      tiempo,
      porciones,
      dificultad,
      pedirFaltantes: pedirFaltantes.checked
    });

    if (registrar) {
      const historial = leer('miCocinaHistorialBusquedas');
      historial.unshift({
        ingredientes: ingredientes.length ? ingredientes : ['Sin ingredientes seleccionados'],
        fecha: new Date().toLocaleString('es-CL')
      });
      guardar('miCocinaHistorialBusquedas', historial.slice(0, 30));
    }

    obtenerElemento('recetas').innerHTML = renderizarRecetas(base).join('');
  };

  const cargarRecetasGeneradas = () => {
    const resultadosGuardados = leer('miCocinaRecetasGeneradas', null);
    if (!resultadosGuardados) {
      obtenerElemento('recetas').innerHTML = mensajeSinRecetas;
      return;
    }

    tiempo = resultadosGuardados.tiempo || tiempo;
    porciones = resultadosGuardados.porciones || porciones;
    dificultad = resultadosGuardados.dificultad || dificultad;
    pedirFaltantes.checked = Boolean(resultadosGuardados.pedirFaltantes);
    obtenerElemento('recetas').innerHTML = renderizarRecetas(resultadosGuardados.base).join('') || mensajeSinRecetas;
  };

  buscarIngrediente.oninput = evento => sugerirIngredientes(evento.target.value, sugerencias, 'agregarIngrediente');
  obtenerElemento('abrirFiltros').onclick = () => modalFiltros.classList.add('abierto');
  obtenerElemento('formBusqueda').onsubmit = evento => {
    evento.preventDefault();
    generarRecetas(true);
  };

  window.agregarIngrediente = ingrediente => {
    if (!elegidos.includes(ingrediente)) elegidos.push(ingrediente);
    buscarIngrediente.value = '';
    sugerencias.innerHTML = '';
    pintarIngredientes();
  };

  window.quitarIngrediente = indice => {
    elegidos.splice(indice, 1);
    pintarIngredientes();
  };

  window.toggleFavorito = indice => {
    const lista = favoritos();
    const posicion = lista.findIndex(item => item.nombre === recetasDisponibles[indice].nombre);
    if (posicion >= 0) lista.splice(posicion, 1);
    else lista.push({ ...recetasDisponibles[indice], tiempo, porciones });
    guardar('miCocinaFavoritos', lista);
    const resultadosGuardados = leer('miCocinaRecetasGeneradas', null);
    if (resultadosGuardados) {
      obtenerElemento('recetas').innerHTML = renderizarRecetas(resultadosGuardados.base).join('') || mensajeSinRecetas;
    }
  };

  window.agregarCompras = indice => {
    const lista = leer('miCocinaCompras');
    recetasDisponibles[indice].faltantes.forEach(ingrediente => {
      if (!lista.includes(ingrediente)) lista.push(ingrediente);
    });
    guardar('miCocinaCompras', lista);
  };

  window.abrirReceta = abrirReceta;
  pintarOpciones('tiempos', ['10 min', '20 min', '30 min', '50 min', '1 hora', 'Más de 2 horas'], tiempo, valor => { tiempo = valor; });
  pintarOpciones('porciones', ['2', '4', '6', '8', '10'], porciones, valor => { porciones = valor; });
  pintarOpciones('dificultad', ['Todas', 'Fácil', 'Medio', 'Difícil'], dificultad, valor => { dificultad = valor; });
  document.querySelectorAll('[data-cerrar]').forEach(boton => {
    boton.onclick = () => obtenerElemento(boton.dataset.cerrar).classList.remove('abierto');
  });
  cargarRecetasGeneradas();
};

// ============================================================================
// PANTALLA DE FAVORITOS
// Muestra las recetas guardadas y permite quitarlas de la lista.
// ============================================================================

const iniciarFavoritos = () => {
  const listaFavoritos = obtenerElemento('listaFavoritos');
  if (!listaFavoritos) return;

  const pintar = () => {
    const lista = favoritos();
    listaFavoritos.innerHTML = lista.length ? lista.map((receta, indice) => `
      <article class="receta-card">
        <div class="receta-imagen">
          <span>${receta.icono}</span>
          <button class="favorito-corazon activo" onclick="quitarFavorito(${indice})">♥</button>
        </div>
        <div class="receta-cuerpo">
          <h3>${receta.nombre}</h3>
          <p>${receta.descripcion}</p>
          <div class="receta-datos">◷ ${receta.tiempo} · 🍽 ${receta.porciones} porciones</div>
          <button class="boton-ver" onclick="quitarFavorito(${indice})">Quitar de favoritos</button>
        </div>
      </article>
    `).join('') : '<p class="sin-resultados">Aún no tienes recetas favoritas.</p>';
  };

  window.quitarFavorito = indice => {
    const lista = favoritos();
    lista.splice(indice, 1);
    guardar('miCocinaFavoritos', lista);
    pintar();
  };

  pintar();
};

// ============================================================================
// PANTALLA DE HISTORIAL
// Presenta búsquedas y recetas vistas, con opción de limpiar todo.
// ============================================================================

const iniciarHistorial = () => {
  const historialBusquedas = obtenerElemento('historialBusquedas');
  const historialRecetas = obtenerElemento('historialRecetas');
  if (!historialBusquedas || !historialRecetas) return;

  const modal = obtenerElemento('modalHistorial');
  const detalle = obtenerElemento('detalleHistorial');

  const pintar = () => {
    const busquedas = leer('miCocinaHistorialBusquedas');
    const recetas = leer('miCocinaHistorialRecetas');
    historialBusquedas.innerHTML = busquedas.length
      ? busquedas.map(item => `<div class="historial-item"><b>${item.ingredientes.join(', ')}</b><small>${item.fecha}</small></div>`).join('')
      : '<p class="sin-resultados">Aún no realizas búsquedas.</p>';
    historialRecetas.innerHTML = recetas.length
      ? recetas.map((receta, indice) => `
        <article class="receta-card tarjeta-clickable" onclick="abrirHistorialReceta(${indice})">
          <div class="receta-imagen">${receta.icono}</div>
          <div class="receta-cuerpo">
            <h3>${receta.nombre}</h3>
            <p>${receta.descripcion}</p>
            <div class="receta-datos">◷ ${receta.tiempo} · 🍽 ${receta.porciones} porciones</div>
            <button class="boton-ver" type="button">Abrir receta</button>
          </div>
        </article>
      `).join('')
      : '<p class="sin-resultados">Abre una receta para verla aquí.</p>';
  };

  window.abrirHistorialReceta = indice => {
    const receta = leer('miCocinaHistorialRecetas')[indice];
    detalle.innerHTML = `
      <button class="modal-cerrar" onclick="modalHistorial.classList.remove('abierto')">Cerrar</button>
      <h2>${receta.icono} ${receta.nombre}</h2>
      <p>${receta.descripcion}</p>
      <p><b>Tiempo:</b> ${receta.tiempo} · <b>Porciones:</b> ${receta.porciones}</p>
      <h3>Preparación</h3>
      <ol>${receta.pasos.map(paso => `<li>${paso}</li>`).join('')}</ol>
    `;
    modal.classList.add('abierto');
  };

  obtenerElemento('limpiarHistorial').onclick = () => {
    guardar('miCocinaHistorialBusquedas', []);
    guardar('miCocinaHistorialRecetas', []);
    pintar();
  };

  pintar();
};

// ============================================================================
// PANTALLA DE DESPENSA Y LISTA DE COMPRAS
// Administra ingredientes disponibles, compras y sugerencias.
// ============================================================================

const iniciarDespensa = () => {
  const nuevoIngrediente = obtenerElemento('nuevoIngrediente');
  if (!nuevoIngrediente) return;

  const listaDespensa = obtenerElemento('listaDespensa');
  const listaCompras = obtenerElemento('listaCompras');
  const sugerencias = obtenerElemento('sugerenciasDespensa');
  const pintar = () => {
    const despensa = leer('miCocinaDespensa');
    const compras = leer('miCocinaCompras');
    listaDespensa.innerHTML = despensa.map((ingrediente, indice) => `
      <span class="chip-ingrediente">${ingrediente}<button onclick="quitarDespensa(${indice})">×</button></span>
    `).join('') || '<p class="sin-resultados">Aún no agregas ingredientes.</p>';
    listaCompras.innerHTML = compras.map((ingrediente, indice) => `
      <label class="historial-item">
        <input type="checkbox" onchange="marcarCompra(${indice}, this.checked)">
        <b>${ingrediente}</b>
        <button onclick="quitarCompra(${indice})">×</button>
      </label>
    `).join('') || '<p class="sin-resultados">Tu lista de compras está vacía.</p>';
  };

  obtenerElemento('formDespensa').onsubmit = evento => {
    evento.preventDefault();
    const ingrediente = nuevoIngrediente.value.trim().toLowerCase();
    const despensa = leer('miCocinaDespensa');
    if (ingrediente && !despensa.includes(ingrediente)) despensa.push(ingrediente);
    guardar('miCocinaDespensa', despensa);
    nuevoIngrediente.value = '';
    sugerencias.innerHTML = '';
    pintar();
  };

  obtenerElemento('limpiarDespensa').onclick = () => {
    guardar('miCocinaDespensa', []);
    pintar();
  };

  window.quitarDespensa = indice => {
    const despensa = leer('miCocinaDespensa');
    despensa.splice(indice, 1);
    guardar('miCocinaDespensa', despensa);
    pintar();
  };

  window.quitarCompra = indice => {
    const compras = leer('miCocinaCompras');
    compras.splice(indice, 1);
    guardar('miCocinaCompras', compras);
    pintar();
  };

  window.marcarCompra = (indice, marcada) => {
    if (marcada) window.quitarCompra(indice);
  };

  obtenerElemento('limpiarCompras').onclick = () => {
    guardar('miCocinaCompras', []);
    pintar();
  };

  obtenerElemento('completarCompras').onclick = () => {
    const despensa = leer('miCocinaDespensa');
    const compras = leer('miCocinaCompras');
    guardar('miCocinaDespensa', [...new Set([...despensa, ...compras])]);
    guardar('miCocinaCompras', []);
    pintar();
  };

  nuevoIngrediente.oninput = () => {
    const texto = nuevoIngrediente.value.trim().toLowerCase();
    const despensa = leer('miCocinaDespensa');
    const coincidencias = ingredientesDisponibles.filter(ingrediente => (
      ingrediente.includes(texto) && !despensa.includes(ingrediente)
    ));
    sugerencias.innerHTML = texto
      ? coincidencias.map(ingrediente => `<button class="sugerencia" onclick="elegirSugerenciaDespensa('${ingrediente}')">+ ${ingrediente}</button>`).join('')
      : '';
  };

  window.elegirSugerenciaDespensa = ingrediente => {
    nuevoIngrediente.value = ingrediente;
    sugerencias.innerHTML = '';
    obtenerElemento('agregarIngredienteDespensa').click();
  };

  pintar();
};

// Cada inicializador detecta si la pantalla actual contiene sus elementos.
// Así un único archivo JavaScript puede compartirse entre todas las vistas.
iniciarSidebar();
iniciarPerfil();
iniciarRegistro();
iniciarLobby();
iniciarFavoritos();
iniciarHistorial();
iniciarDespensa();
iniciarLoginSms();
iniciarLoginClasico();
iniciarRegistroClasico();
