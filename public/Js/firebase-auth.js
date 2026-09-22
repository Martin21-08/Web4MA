/*
 * Inicio de sesión con Google mediante Firebase Authentication.
 *
 * Se usan los módulos modernos de Firebase que recomienda su documentación:
 * initializeApp, getAuth, GoogleAuthProvider, signInWithPopup y
 * onAuthStateChanged. Este archivo es un módulo del navegador; por eso debe
 * cargarse con <script type="module"> y no mediante require() en app.js.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';

/** Obtiene la configuración pública del proyecto sin escribirla en las vistas. */
async function obtenerConfiguracionFirebase() {
  // cache: 'no-store' evita reutilizar un error previo después de editar .env.
  const respuesta = await fetch('/api/firebase-config', { cache: 'no-store' });
  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(`${datos.error || 'No fue posible configurar Firebase'} ${
      datos.faltantes ? `Faltan: ${datos.faltantes.join(', ')}` : ''
    }`.trim());
  }

  return datos;
}

/** Divide el nombre que Google entrega para completar nombre y apellido. */
function separarNombre(nombreCompleto = '') {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  return {
    nombre: partes.shift() || '',
    apellido: partes.join(' ')
  };
}

/** Persiste el usuario autenticado usando el formato que consume app.js. */
function sincronizarPerfil(usuario) {
  const authProvisional = window.miCocinaAuth;
  // Busca primero para conservar teléfono, alergias y cualquier personalización existente.
  const perfilExistente = authProvisional?.buscarPerfil({
    firebaseUid: usuario.uid,
    correo: usuario.email
  }) || {};
  const { nombre, apellido } = separarNombre(usuario.displayName || usuario.email);
  // Los datos de Google solo rellenan campos faltantes; no deben borrar datos editados.
  const perfil = {
    ...perfilExistente,
    // Google completa los campos vacíos, pero nunca pisa una personalización.
    nombre: perfilExistente.nombre || nombre,
    apellido: perfilExistente.apellido || apellido,
    correo: usuario.email || perfilExistente.correo || '',
    firebaseUid: usuario.uid,
    metodo: 'google'
  };

  // Firebase puede sincronizar dos veces durante el mismo acceso; la marca
  // evita que esa segunda sincronización haga parecer nuevo el perfil.
  // Firebase puede emitir más de un cambio de estado durante un mismo login.
  if (authProvisional?.perfilTienePersonalizacion(perfilExistente)) {
    perfil.personalizacionCompleta = true;
  }

  // Esta función delega el guardado al adaptador provisional compartido.
  return authProvisional
    ? authProvisional.guardarPerfilActivo(perfil)
    : perfil;
}

/**
 * Actualiza solamente los datos que Firebase proporciona de forma fiable:
 * displayName y email. El teléfono no se modifica porque Google no siempre lo
 * comparte y nunca debemos borrar un valor que la persona haya escrito.
 */
function actualizarFormularioPerfil(usuario) {
  const campoNombre = document.querySelector('#perfilNombre');
  const campoApellido = document.querySelector('#perfilApellido');
  const campoCorreo = document.querySelector('#perfilCorreo');

  // Si no estamos en /perfil, los campos no existen y no hay nada que pintar.
  if (!campoNombre || !campoApellido || !campoCorreo) return;

  const perfil = window.miCocinaAuth?.obtenerPerfilActivo() || {};
  const { nombre, apellido } = separarNombre(usuario.displayName);
  campoNombre.value = perfil.nombre || nombre;
  campoApellido.value = perfil.apellido || apellido;
  campoCorreo.value = perfil.correo || usuario.email || '';
}

/** Traduce los fallos conocidos a mensajes accionables para la persona usuaria. */
function mensajeDeError(error) {
  if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error.code)) {
    return 'No has elegido ningún correo para iniciar sesión. Inténtalo nuevamente.';
  }
  if (error.code === 'auth/popup-blocked') {
    return 'El navegador bloqueó la ventana emergente. Permite las ventanas emergentes e inténtalo otra vez.';
  }
  if (error.code === 'auth/unauthorized-domain') {
    return 'Este dominio no está autorizado en Firebase. Agrega localhost en Firebase Authentication > Settings > Authorized domains.';
  }
  return error.message || 'No se pudo iniciar sesión con Google.';
}

// Muestra el error dentro de la página sin bloquear la interacción con alert().
function mostrarAvisoGoogle(mensaje) {
  const aviso = document.querySelector('#avisoGoogle');
  if (!aviso) {
    window.alert(mensaje);
    return;
  }

  aviso.textContent = mensaje;
  aviso.classList.add('visible');
  window.setTimeout(() => aviso.classList.remove('visible'), 4500);
}

try {
  // 1. Se obtiene la configuración y se crea una única instancia de Firebase.
  const firebaseApp = initializeApp(await obtenerConfiguracionFirebase());
  // 2. Auth conserva la sesión en este navegador según el comportamiento de Firebase.
  const auth = getAuth(firebaseApp);

  // 3. El observador se ejecuta al cargar y cada vez que cambia la sesión.
  // Este observador sincroniza la sesión restaurada al recargar la página.
  onAuthStateChanged(auth, (usuario) => {
    if (usuario) {
      sincronizarPerfil(usuario);
      actualizarFormularioPerfil(usuario);
    }
  });

  /**
   * Función solicitada para llamar al login de Google.
   * Equivale al ejemplo oficial: signInWithPopup(auth, provider). Se declara
   * separada del botón para que puedas reutilizarla desde otro componente.
   */
  async function loginGoogle() {
    const botonGoogle = document.querySelector('#iniciarConGoogle');
    const modalGoogle = document.querySelector('#modalGoogle');

    try {
      if (botonGoogle) botonGoogle.disabled = true;
      if (modalGoogle) modalGoogle.classList.add('abierto');

      // 4. Creamos el proveedor que Firebase usará para abrir Google.
      const provider = new GoogleAuthProvider();
      // 5. La llamada real a la API de Firebase Authentication.
      const result = await signInWithPopup(auth, provider);
      if (modalGoogle) modalGoogle.classList.remove('abierto');
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const user = result.user;

      // El token existe para una API de Google futura; no se guarda en pantalla.
      const token = credential?.accessToken;
      console.info('Google login correcto para:', user.email, Boolean(token));

      // 6. Google conserva la cuenta y completa solo los datos que faltan.
      const perfil = sincronizarPerfil(user);
      actualizarFormularioPerfil(user);
      // Solo las cuentas nuevas o incompletas pasan por la ventana de alergias.
      const continuar = perfilPersonalizado => {
        window.alert(`Perfil personalizado correctamente.\nNombre: ${perfilPersonalizado.nombre || user.email}`);
        window.location.assign('/lobby');
      };

      if (window.miCocinaAuth.perfilTienePersonalizacion(perfil)) {
        window.location.assign('/lobby');
      } else {
        window.miCocinaAuth.abrirPersonalizacion(perfil, continuar);
      }
    } catch (error) {
      console.error('Error de Firebase al iniciar con Google:', error);
      if (modalGoogle) modalGoogle.classList.remove('abierto');
      mostrarAvisoGoogle(mensajeDeError(error));
      if (botonGoogle) botonGoogle.disabled = false;
    }
  }

  // La exponemos solo para poder reutilizarla desde HTML u otros scripts.
  window.loginGoogle = loginGoogle;

  // 7. Implementación de loginGoogle en el botón de la pantalla de inicio.
  const botonGoogle = document.querySelector('#iniciarConGoogle');
  if (botonGoogle) botonGoogle.addEventListener('click', loginGoogle);

  // El botón ya existente de perfil ahora cierra la sesión real de Firebase.
  const botonCerrarSesion = document.querySelector('#cerrarSesion');
  if (botonCerrarSesion) {
    botonCerrarSesion.addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.location.assign('/');
      } catch (error) {
        console.error('Error de Firebase al cerrar sesión:', error);
        window.alert('No se pudo cerrar la sesión. Inténtalo nuevamente.');
      }
    });
  }
} catch (error) {
  // No bloqueamos el resto de la página si Firebase no está configurado aún.
  console.error('No se pudo inicializar Firebase:', error);
  const botonGoogle = document.querySelector('#iniciarConGoogle');
  if (botonGoogle) {
    /*
     * El botón se conserva activo para que la persona sepa por qué Google no
     * puede abrirse. Deshabilitarlo silenciosamente hacía parecer que el botón
     * estuviera roto. En cuanto se completen las variables y se reinicie el
     * servidor, el bloque try anterior será el que conecte Firebase de verdad.
     */
    botonGoogle.title = 'Falta configurar Firebase en el archivo .env.';
    botonGoogle.addEventListener('click', () => {
      window.alert(
        'No se puede abrir Google todavía porque Firebase no está configurado.\n\n' +
        'Completa FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, ' +
        'FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID y FIREBASE_APP_ID en .env; ' +
        'después reinicia el servidor.'
      );
    });
  }
}
