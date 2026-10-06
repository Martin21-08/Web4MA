import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';

const botonGoogle = document.getElementById('iniciarConGoogle');
const modalGoogle = document.getElementById('modalGoogle');
const avisoGoogle = document.getElementById('avisoGoogle');

if (botonGoogle) {
    let auth;
    let proveedorGoogle;
    let autenticando = false;

    // Muestra errores de configuración o de inicio de sesión en el aviso de la vista.
    const mostrarAviso = mensaje => {
        if (!avisoGoogle) return;
        avisoGoogle.textContent = mensaje;
        avisoGoogle.classList.add('visible');
    };

    // Carga la configuración del servidor antes de habilitar el botón de Google.
    botonGoogle.disabled = true;
    fetch('/api/firebase-config', { cache: 'no-store' })
        .then(async respuesta => {
            const configuracion = await respuesta.json();
            if (!respuesta.ok) {
                throw new Error(configuracion.error || 'No se pudo cargar Firebase.');
            }
            return configuracion;
        })
        .then(configuracion => {
            auth = getAuth(initializeApp(configuracion));
            proveedorGoogle = new GoogleAuthProvider();
            proveedorGoogle.setCustomParameters({ prompt: 'select_account' });
            botonGoogle.disabled = false;
        })
        .catch(error => {
            console.error('No se pudo inicializar Firebase:', error);
            mostrarAviso(error.message || 'No se pudo conectar con Google.');
        });

    // Sincroniza la cuenta autenticada con Express para crear la sesión de CookIQ.
    botonGoogle.addEventListener('click', async () => {
        if (autenticando || !auth || !proveedorGoogle) return;

        autenticando = true;
        botonGoogle.disabled = true;
        modalGoogle?.classList.add('abierto');
        modalGoogle?.setAttribute('aria-hidden', 'false');

        try {
            const resultado = await signInWithPopup(auth, proveedorGoogle);
            const usuarioFirebase = resultado.user;
            if (!usuarioFirebase.email) {
                throw new Error('La cuenta de Google no entregó un correo electrónico.');
            }

            const partes = (usuarioFirebase.displayName || 'Usuario')
                .trim()
                .split(/\s+/);
            const nombres = partes.shift() || 'Usuario';
            const apellidos = partes.join(' ') || 'No especificado';

            const respuesta = await fetch('/api/firebase/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    googleId: usuarioFirebase.uid,
                    nombres,
                    apellidos,
                    correo: usuarioFirebase.email
                })
            });
            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(datos.error || 'No se pudo sincronizar el usuario.');
            }

            window.location.assign('/lobby');
        } catch (error) {
            console.error('Error al iniciar sesión con Google:', error);
            const mensajes = {
                'auth/popup-closed-by-user': 'Cerraste la ventana de inicio de sesión.',
                'auth/popup-blocked': 'El navegador bloqueó la ventana de Google.',
                'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase.'
            };
            mostrarAviso(mensajes[error.code] || error.message || 'No se pudo iniciar sesión con Google.');
        } finally {
            modalGoogle?.classList.remove('abierto');
            modalGoogle?.setAttribute('aria-hidden', 'true');
            autenticando = false;
            botonGoogle.disabled = false;
        }
    });
}