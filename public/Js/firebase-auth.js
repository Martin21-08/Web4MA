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

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCZyqQIlFKEbXDrj7360ice5lcY8PFj3cU",
  authDomain: "cookiq-c2094.firebaseapp.com",
  projectId: "cookiq-c2094",
  storageBucket: "cookiq-c2094.firebasestorage.app",
  messagingSenderId: "113547191556",
  appId: "1:113547191556:web:03610b89a12ee14d9a5c51",
  measurementId: "G-W8GM94QE36"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

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
  return error.message || 'No se pudo iniciar sesión con Google.';
}

try {
  // 1. Se obtiene la configuración y se crea una única instancia de Firebase.
  const firebaseApp = initializeApp(await obtenerConfiguracionFirebase());
  // 2. Auth conserva la sesión en este navegador según el comportamiento de Firebase.
  const auth = getAuth(firebaseApp);

  // 3. El observador se ejecuta al cargar y cada vez que cambia la sesión.
  onAuthStateChanged(auth, (usuario) => {
    if (usuario) actualizarFormularioPerfil(usuario);
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
