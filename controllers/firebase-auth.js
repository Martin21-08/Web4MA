import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';

const botonGoogle = document.getElementById('iniciarConGoogle');
const modalGoogle = document.getElementById('modalGoogle');
const avisoGoogle = document.getElementById('avisoGoogle');
const modalRegistro = document.getElementById('modalRegistroGoogle');
const formularioRegistro = document.getElementById('formRegistroGoogle');
const botonGuardarRegistro = document.getElementById('guardarRegistroGoogle');
const botonCancelarRegistro = document.getElementById('cancelarRegistroGoogle');

if (botonGoogle) {
    let auth;
    let proveedorGoogle;
    let autenticando = false;
    let usuarioFirebasePendiente = null;
    const modo = botonGoogle.dataset.googleMode;

    const mostrarAviso = mensaje => {
        if (!avisoGoogle) return;
        avisoGoogle.textContent = mensaje;
        avisoGoogle.classList.add('visible');
    };

    const ocultarAviso = () => {
        avisoGoogle?.classList.remove('visible');
        if (avisoGoogle) avisoGoogle.textContent = '';
    };

    const ocultarEspera = () => {
        modalGoogle?.classList.remove('abierto');
        modalGoogle?.setAttribute('aria-hidden', 'true');
    };

    const mostrarEspera = () => {
        modalGoogle?.classList.add('abierto');
        modalGoogle?.setAttribute('aria-hidden', 'false');
    };

    const actualizarPerfilLocal = usuario => {
        window.miCocinaAuth?.guardarPerfilActivo({
            id: `google_${usuario.google_id}`,
            firebaseUid: usuario.google_id,
            nombre: usuario.nombres,
            apellido: usuario.apellidos,
            correo: usuario.correo,
            telefono: usuario.telefono || ''
        });
    };

    const enviarSolicitudGoogle = async (url, datos) => {
        const respuesta = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(datos)
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(resultado.error || 'No se pudo completar la solicitud con Google.');
        }
        return resultado;
    };

    const cancelarRegistro = async () => {
        formularioRegistro?.reset();
        modalRegistro?.classList.remove('abierto');
        modalRegistro?.setAttribute('aria-hidden', 'true');
        usuarioFirebasePendiente = null;
        if (auth) await signOut(auth);
    };

    botonCancelarRegistro?.addEventListener('click', () => {
        cancelarRegistro().catch(error => {
            console.error('No se pudo cancelar el registro de Google:', error);
            mostrarAviso('No se pudo cancelar el registro. Inténtalo nuevamente.');
        });
    });

    formularioRegistro?.addEventListener('submit', async evento => {
        evento.preventDefault();
        if (!usuarioFirebasePendiente || autenticando) return;

        autenticando = true;
        botonGuardarRegistro.disabled = true;
        mostrarEspera();
        ocultarAviso();

        try {
            const token = await usuarioFirebasePendiente.getIdToken();
            const datos = Object.fromEntries(new FormData(formularioRegistro));
            const resultado = await enviarSolicitudGoogle('/api/firebase/google/registro', {
                ...datos,
                googleId: usuarioFirebasePendiente.uid,
                idToken: token
            });
            actualizarPerfilLocal(resultado.usuario);
            usuarioFirebasePendiente = null;
            modalRegistro.classList.remove('abierto');
            modalRegistro.setAttribute('aria-hidden', 'true');
            alert('Registro completado correctamente.');
            window.location.assign('/lobby');
        } catch (error) {
            console.error('Error al registrar con Google:', error);
            mostrarAviso(error.message || 'No se pudo completar el registro con Google.');
        } finally {
            ocultarEspera();
            autenticando = false;
            botonGuardarRegistro.disabled = false;
        }
    });

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

    botonGoogle.addEventListener('click', async () => {
        if (autenticando || !auth || !proveedorGoogle) return;

        autenticando = true;
        botonGoogle.disabled = true;
        mostrarEspera();
        ocultarAviso();

        try {
            const resultado = await signInWithPopup(auth, proveedorGoogle);
            const usuarioFirebase = resultado.user;
            if (!usuarioFirebase.email) {
                throw new Error('La cuenta de Google no entregó un correo electrónico.');
            }

            const idToken = await usuarioFirebase.getIdToken();
            if (modo === 'register') {
                usuarioFirebasePendiente = usuarioFirebase;
                const partes = (usuarioFirebase.displayName || '').trim().split(/\s+/);
                document.getElementById('googleRegistroNombre').value = partes.shift() || '';
                document.getElementById('googleRegistroApellido').value = partes.join(' ');
                document.getElementById('googleRegistroCorreo').value = usuarioFirebase.email;
                modalRegistro.classList.add('abierto');
                modalRegistro.setAttribute('aria-hidden', 'false');
                document.getElementById('googleRegistroNombre').focus();
                return;
            }

            const respuesta = await enviarSolicitudGoogle('/api/firebase/google', {
                googleId: usuarioFirebase.uid,
                correo: usuarioFirebase.email,
                idToken
            });
            actualizarPerfilLocal(respuesta.usuario);
            alert('Inicio de sesión exitoso.');
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
            ocultarEspera();
            autenticando = false;
            botonGoogle.disabled = false;
        }
    });
}
