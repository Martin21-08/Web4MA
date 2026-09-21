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
  const respuesta = await fetch('/api/firebase-config');
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

  const botonGoogle = document.querySelector('#iniciarConGoogle');
  if (botonGoogle) {
    botonGoogle.addEventListener('click', async () => {
      botonGoogle.disabled = true;

      try {
        // 4. GoogleAuthProvider define la identidad y signInWithPopup abre Google.
        const proveedor = new GoogleAuthProvider();
        const resultado = await signInWithPopup(auth, proveedor);
        const usuario = resultado.user;

        // 5. Confirmamos en este computador qué cuenta inició sesión.
        window.alert(`Has iniciado sesión correctamente en este computador.\nNombre: ${usuario.displayName || usuario.email}`);
        // 6. Al entrar al perfil, el observador anterior completa sus campos.
        window.location.assign('/perfil');
      } catch (error) {
        console.error('Error de Firebase al iniciar con Google:', error);
        window.alert(mensajeDeError(error));
        botonGoogle.disabled = false;
      }
    });
  }

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
    botonGoogle.disabled = true;
    botonGoogle.title = 'Configura las variables FIREBASE_* en .env para habilitar Google.';
  }
}
