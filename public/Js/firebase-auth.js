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
  RecaptchaVerifier,
  signInWithPhoneNumber,
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
  const perfiles = JSON.parse(localStorage.getItem('miCocinaPerfiles') || '{}');
  const perfilExistente = Object.values(perfiles).find(perfil => (
    perfil.firebaseUid === usuario.uid || perfil.correo === usuario.email
  )) || {};
  const { nombre, apellido } = separarNombre(usuario.displayName || usuario.email || 'Usuario');
  const perfil = {
    ...perfilExistente,
    nombre,
    apellido,
    correo: usuario.email || perfilExistente.correo || '',
    telefono: usuario.phoneNumber || perfilExistente.telefono || '',
    firebaseUid: usuario.uid
  };

  perfiles[nombre] = perfil;
  localStorage.setItem('miCocinaPerfiles', JSON.stringify(perfiles));
  localStorage.setItem('miCocinaPerfil', JSON.stringify(perfil));
  localStorage.setItem('miCocinaUsuarioActivo', nombre);
  return perfil;
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

  const { nombre, apellido } = separarNombre(usuario.displayName);
  campoNombre.value = nombre;
  campoApellido.value = apellido;
  campoCorreo.value = usuario.email || '';
}

/** Traduce los fallos conocidos a mensajes accionables para la persona usuaria. */
function mensajeDeError(error) {
  if (error.code === 'auth/popup-closed-by-user') {
    return 'Cerraste la ventana de Google antes de finalizar el inicio de sesión.';
  }
  if (error.code === 'auth/popup-blocked') {
    return 'El navegador bloqueó la ventana emergente. Permite las ventanas emergentes e inténtalo otra vez.';
  }
  if (error.code === 'auth/unauthorized-domain') {
    return 'Este dominio no está autorizado en Firebase. Agrega localhost en Firebase Authentication > Settings > Authorized domains.';
  }
  if (error.code === 'auth/operation-not-allowed') {
    return 'Firebase bloqueó el SMS porque la región de este número está deshabilitada. En Firebase Console ve a Authentication > Settings > SMS region policy y habilita la región del número.';
  }
  if (error.code === 'auth/invalid-phone-number') {
    return 'Escribe un número válido con código de país, por ejemplo +56 9 1234 5678.';
  }
  if (error.code === 'auth/invalid-verification-code') {
    return 'El código SMS no es válido. Revísalo e inténtalo nuevamente.';
  }
  if (error.code === 'auth/too-many-requests') {
    return 'Se hicieron demasiados intentos. Espera unos minutos antes de solicitar otro código.';
  }
  return error.message || 'No se pudo iniciar sesión con Google.';
}

try {
  // 1. Se obtiene la configuración y se crea una única instancia de Firebase.
  const firebaseApp = initializeApp(await obtenerConfiguracionFirebase());
  // 2. Auth conserva la sesión en este navegador según el comportamiento de Firebase.
  const auth = getAuth(firebaseApp);

  // 3. El observador se ejecuta al cargar y cada vez que cambia la sesión.
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

    try {
      if (botonGoogle) botonGoogle.disabled = true;

      // 4. Creamos el proveedor que Firebase usará para abrir Google.
      const provider = new GoogleAuthProvider();
      // 5. La llamada real a la API de Firebase Authentication.
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const user = result.user;

      // El token existe para una API de Google futura; no se guarda en pantalla.
      const token = credential?.accessToken;
      console.info('Google login correcto para:', user.email, Boolean(token));

      // 6. El perfil se completa inmediatamente y se confirma el acceso.
      sincronizarPerfil(user);
      actualizarFormularioPerfil(user);
      window.alert(`Has iniciado sesión correctamente en este computador.\nNombre: ${user.displayName || user.email}`);
      window.location.assign('/perfil');
    } catch (error) {
      console.error('Error de Firebase al iniciar con Google:', error);
      window.alert(mensajeDeError(error));
      if (botonGoogle) botonGoogle.disabled = false;
    }
  }

  // La exponemos solo para poder reutilizarla desde HTML u otros scripts.
  window.loginGoogle = loginGoogle;

  // 7. Implementación de loginGoogle en el botón de la pantalla de inicio.
  const botonGoogle = document.querySelector('#iniciarConGoogle');
  if (botonGoogle) botonGoogle.addEventListener('click', loginGoogle);

  async function iniciarSesionSMS() {
    const botonSMS = document.querySelector('#iniciarConSMS');
    const campoTelefono = document.querySelector('#telefonoLogin');
    const campoCodigo = document.querySelector('#codigoSMS');

    try {
      if (!campoTelefono || !campoCodigo) return;
      botonSMS.disabled = true;

      if (!window.confirmationResult) {
        const telefono = campoTelefono.value.trim();
        if (!telefono) {
          campoTelefono.hidden = false;
          window.alert('Escribe tu número de teléfono con código de país.');
          return;
        }

        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible'
          });
        }

        window.confirmationResult = await signInWithPhoneNumber(
          auth,
          telefono,
          window.recaptchaVerifier
        );
        campoTelefono.disabled = true;
        campoTelefono.hidden = false;
        campoCodigo.hidden = false;
        botonSMS.textContent = 'Confirmar código SMS';
        window.alert('Te enviamos un código por SMS.');
        return;
      }

      const codigo = campoCodigo.value.trim();
      if (!codigo) {
        window.alert('Escribe el código recibido por SMS.');
        return;
      }

      const resultado = await window.confirmationResult.confirm(codigo);
      const usuario = resultado.user;
      const perfilInicial = sincronizarPerfil(usuario);
      actualizarFormularioPerfil(usuario);
      await window.mostrarFormularioPerfilInicial(perfilInicial);
      window.location.assign('/lobby');
    } catch (error) {
      console.error('Error de Firebase al iniciar con SMS:', error);
      window.alert(mensajeDeError(error));
      window.confirmationResult = null;
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      botonSMS.disabled = false;
    }
  }

  const botonSMS = document.querySelector('#iniciarConSMS');
  if (botonSMS) botonSMS.addEventListener('click', iniciarSesionSMS);

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
