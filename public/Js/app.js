// Utilidades: datos persistentes para todas las pantallas.
const leer = (clave, porDefecto = []) => JSON.parse(localStorage.getItem(clave) || JSON.stringify(porDefecto));
const guardar = (clave, datos) => localStorage.setItem(clave, JSON.stringify(datos));
const favoritos = () => leer('miCocinaFavoritos');

// Registro y perfil.
const formRegistro = document.getElementById('formRegistro');
if (formRegistro) formRegistro.onsubmit = e => { e.preventDefault(); guardar('miCocinaPerfil', { nombre: registroNombre.value.trim(), apellido: registroApellido.value.trim(), correo: registroCorreo.value.trim(), telefono: registroTelefono.value.trim(), nacimiento: registroNacimiento.value }); location.href = 'lobby'; };
const formPerfil = document.getElementById('formPerfil');
if (formPerfil) { const datos = leer('miCocinaPerfil', {}); ['Nombre', 'Apellido', 'Correo', 'Telefono', 'Nacimiento'].forEach(x => document.getElementById('perfil' + x).value = datos[x.toLowerCase().replace('telefono','telefono').replace('nacimiento','nacimiento')] || ''); formPerfil.onsubmit = e => { e.preventDefault(); guardar('miCocinaPerfil', { nombre: perfilNombre.value.trim(), apellido: perfilApellido.value.trim(), correo: perfilCorreo.value.trim(), telefono: perfilTelefono.value.trim(), nacimiento: perfilNacimiento.value }); }; }

// Inicio: buscador, filtros, recetas, favoritos, historial y compras.
if (document.getElementById('buscarIngrediente')) {
  const $ = id => document.getElementById(id);
  const disponibles = ['tomate','pollo','arroz','papa','cebolla','zanahoria','ajo','huevo','queso','pasta','atún','palta','espinaca','leche','champiñón','lentejas'];
  const recetas = [
    {nombre:'Salteado casero', icono:'🥘', descripcion:'Una preparación rápida, colorida y llena de sabor.', faltantes:['pimentón','aceite de oliva'], pasos:['Lava las verduras y córtalas en tiras del mismo tamaño para que se cocinen parejo.','Calienta una sartén grande a fuego medio-alto, agrega aceite y sofríe la cebolla con el ajo por dos minutos.','Incorpora el resto de ingredientes, mezcla constantemente y cocina hasta que estén dorados pero aún jugosos.','Prueba, ajusta sal y pimienta, y sirve de inmediato con arroz o pan.']},
    {nombre:'Bowl cremoso', icono:'🥗', descripcion:'Un bowl suave y nutritivo para disfrutar sin complicaciones.', faltantes:['yogur natural','limón'], pasos:['Lava y corta los ingredientes frescos; cocina el arroz o la base elegida siguiendo las indicaciones del envase.','Mezcla yogur, jugo de limón, sal y un chorrito de aceite hasta obtener una salsa cremosa.','Arma el bowl por capas: primero la base tibia, luego las verduras y la proteína.','Termina con la salsa y mezcla suavemente antes de servir.']},
    {nombre:'Tortilla dorada', icono:'🍳', descripcion:'Una receta sencilla para aprovechar tu despensa.', faltantes:['perejil','pimienta'], pasos:['Pela y corta los vegetales en cubos pequeños para que se cocinen de forma uniforme.','Saltéalos en una sartén antiadherente con aceite hasta que estén blandos y ligeramente dorados.','Bate los huevos con sal y pimienta, viértelos sobre los vegetales y mueve suavemente la sartén.','Cocina tapado a fuego bajo, da vuelta con ayuda de un plato y termina hasta que ambos lados estén dorados.']}
  ];
  let elegidos = [], evitados = [], tiempo = '30 min', porciones = '2';
  const pintar = () => $('ingredientesElegidos').innerHTML = elegidos.map((x,i) => `<span class="chip-ingrediente">${x}<button onclick="quitarIngrediente(${i})">×</button></span>`).join('');
  const sugerir = (texto, destino, funcion) => { const lista = disponibles.filter(x => x.includes(texto.toLowerCase()) && !elegidos.includes(x) && !evitados.includes(x)); destino.innerHTML = texto ? lista.map(x => `<button class="sugerencia" onclick="${funcion}('${x}')">+ ${x}</button>`).join('') : ''; };
  buscarIngrediente.oninput = e => sugerir(e.target.value, sugerencias, 'agregarIngrediente');
  buscarEvitar.oninput = e => sugerir(e.target.value, sugerenciasEvitar, 'agregarEvitado');
  window.agregarIngrediente = x => { if (!elegidos.includes(x)) elegidos.push(x); buscarIngrediente.value = ''; sugerencias.innerHTML = ''; pintar(); };
  window.quitarIngrediente = i => { elegidos.splice(i,1); pintar(); };
  window.agregarEvitado = x => { evitados.push(x); buscarEvitar.value=''; sugerenciasEvitar.innerHTML=''; ingredientesEvitados.innerHTML = evitados.map((v,i)=>`<span class="chip-ingrediente">${v}<button onclick="quitarEvitado(${i})">×</button></span>`).join(''); };
  window.quitarEvitado = i => { evitados.splice(i,1); ingredientesEvitados.innerHTML = evitados.map((v,j)=>`<span class="chip-ingrediente">${v}<button onclick="quitarEvitado(${j})">×</button></span>`).join(''); };
  const opciones = (id, valores, actual, cambiar) => { $(id).innerHTML=valores.map(x=>`<button class="filtro-opcion ${x===actual?'seleccionada':''}" data-v="${x}">${x}</button>`).join(''); [...$(id).children].forEach(b=>b.onclick=()=>{[...$(id).children].forEach(x=>x.classList.remove('seleccionada'));b.classList.add('seleccionada');cambiar(b.dataset.v);});};
  opciones('tiempos',['10 min','20 min','30 min','50 min','1 hora','Más de 2 horas'],tiempo,x=>tiempo=x); opciones('porciones',['2','4','6','8','10'],porciones,x=>porciones=x);
  abrirFiltros.onclick=()=>modalFiltros.classList.add('abierto'); document.querySelectorAll('[data-cerrar]').forEach(b=>b.onclick=()=>$(b.dataset.cerrar).classList.remove('abierto'));
  const ingredientesParaReceta = () => usarDespensa.checked ? [...new Set([...elegidos, ...leer('miCocinaDespensa')])] : elegidos;
  const esFavorito = r => favoritos().some(x=>x.nombre===r.nombre);
  function generar(registrar = true) {
    const ingredientes = ingredientesParaReceta(), base = ingredientes.length ? ingredientes.join(', ') : 'los ingredientes de tu cocina';
    if (registrar) { const historial = leer('miCocinaHistorialBusquedas'); historial.unshift({ingredientes: ingredientes.length ? ingredientes : ['Sin ingredientes seleccionados'], fecha: new Date().toLocaleString('es-CL')}); guardar('miCocinaHistorialBusquedas', historial.slice(0,30)); }
    $('recetas').innerHTML = recetasBaseRender(base).join('');
  }
  const recetasBaseRender = base => recetas.map((r,i)=>`<article class="receta-card"><div class="receta-imagen"><span>${r.icono}</span><button class="favorito-corazon ${esFavorito(r)?'activo':''}" onclick="toggleFavorito(${i})">${esFavorito(r)?'♥':'♡'}</button></div><div class="receta-cuerpo"><h3>${r.nombre} con ${base}</h3><p>${r.descripcion}</p><div class="receta-datos"><span>◷ ${tiempo}</span><span>🍽 ${porciones} porciones</span></div>${esFavorito(r)?'<p class="favorito-mensaje">♥ Agregado a favoritos</p>':''}${pedirFaltantes.checked?`<div class="faltantes-lista"><b>Faltan:</b> ${r.faltantes.join(', ')}<button class="link-compras" onclick="agregarCompras(${i})">Agregar a compras</button></div>`:''}<button class="boton-ver" onclick="abrirReceta(${i})">Ver receta completa</button></div></article>`);
  generarRecetas.onclick=()=>generar(true);
  window.toggleFavorito=i=>{let lista=favoritos(),p=lista.findIndex(x=>x.nombre===recetas[i].nombre);if(p>=0)lista.splice(p,1);else lista.push({...recetas[i],tiempo,porciones});guardar('miCocinaFavoritos',lista);generar(false);};
  window.agregarCompras=i=>{let lista=leer('miCocinaCompras');recetas[i].faltantes.forEach(x=>{if(!lista.includes(x))lista.push(x)});guardar('miCocinaCompras',lista);};
  window.abrirReceta=i=>{const r=recetas[i],historial=leer('miCocinaHistorialRecetas');historial.unshift({...r,tiempo,porciones});guardar('miCocinaHistorialRecetas',historial.slice(0,30));detalleReceta.innerHTML=`<button class="modal-cerrar" onclick="modalReceta.classList.remove('abierto')">Cerrar</button><h2>${r.icono} ${r.nombre}</h2><p>${r.descripcion}</p><p><b>Tiempo:</b> ${tiempo} · <b>Porciones:</b> ${porciones}</p><h3>Preparación</h3><ol>${r.pasos.map(x=>`<li>${x}</li>`).join('')}</ol>`;modalReceta.classList.add('abierto');};
  generar(false);
}

// Favoritos.
if (document.getElementById('listaFavoritos')) { const pintarFavoritos=()=>{const lista=favoritos();listaFavoritos.innerHTML=lista.length?lista.map((r,i)=>`<article class="receta-card"><div class="receta-imagen"><span>${r.icono}</span><button class="favorito-corazon activo" onclick="quitarFavorito(${i})">♥</button></div><div class="receta-cuerpo"><h3>${r.nombre}</h3><p>${r.descripcion}</p><div class="receta-datos"><span>◷ ${r.tiempo}</span><span>🍽 ${r.porciones} porciones</span></div><button class="boton-ver" onclick="quitarFavorito(${i})">Quitar de favoritos</button></div></article>`).join(''):'<p class="sin-resultados">Aún no tienes recetas favoritas.</p>';};window.quitarFavorito=i=>{let l=favoritos();l.splice(i,1);guardar('miCocinaFavoritos',l);pintarFavoritos();};pintarFavoritos(); }

// Historial.
if (document.getElementById('historialBusquedas')) { const pintarHistorial=()=>{const b=leer('miCocinaHistorialBusquedas'),r=leer('miCocinaHistorialRecetas');historialBusquedas.innerHTML=b.length?b.map(x=>`<div class="historial-item"><b>${x.ingredientes.join(', ')}</b><small>${x.fecha}</small></div>`).join(''):'<p class="sin-resultados">Aún no realizas búsquedas.</p>';historialRecetas.innerHTML=r.length?r.map(x=>`<article class="receta-card"><div class="receta-imagen">${x.icono}</div><div class="receta-cuerpo"><h3>${x.nombre}</h3><p>${x.descripcion}</p><div class="receta-datos">◷ ${x.tiempo} · 🍽 ${x.porciones} porciones</div></div></article>`).join(''):'<p class="sin-resultados">Abre una receta para verla aquí.</p>';};limpiarHistorial.onclick=()=>{guardar('miCocinaHistorialBusquedas',[]);guardar('miCocinaHistorialRecetas',[]);pintarHistorial();};pintarHistorial(); }

// Despensa y compras.
if (document.getElementById('nuevoIngrediente')) { const pintarDespensa=()=>{const despensa=leer('miCocinaDespensa'),compras=leer('miCocinaCompras');listaDespensa.innerHTML=despensa.map((x,i)=>`<span class="chip-ingrediente">${x}<button onclick="quitarDespensa(${i})">×</button></span>`).join('')||'<p class="sin-resultados">Aún no agregas ingredientes.</p>';listaCompras.innerHTML=compras.map((x,i)=>`<label class="historial-item"><input type="checkbox" onchange="marcarCompra(${i},this.checked)"> <b>${x}</b><button onclick="quitarCompra(${i})">×</button></label>`).join('')||'<p class="sin-resultados">Tu lista de compras está vacía.</p>';};agregarIngredienteDespensa.onclick=()=>{let x=nuevoIngrediente.value.trim().toLowerCase(),l=leer('miCocinaDespensa');if(x&&!l.includes(x))l.push(x);guardar('miCocinaDespensa',l);nuevoIngrediente.value='';pintarDespensa();};window.quitarDespensa=i=>{let l=leer('miCocinaDespensa');l.splice(i,1);guardar('miCocinaDespensa',l);pintarDespensa();};window.quitarCompra=i=>{let l=leer('miCocinaCompras');l.splice(i,1);guardar('miCocinaCompras',l);pintarDespensa();};window.marcarCompra=(i,hecho)=>{if(hecho)quitarCompra(i)};limpiarCompras.onclick=()=>{guardar('miCocinaCompras',[]);pintarDespensa();};completarCompras.onclick=()=>{const d=leer('miCocinaDespensa'),c=leer('miCocinaCompras');guardar('miCocinaDespensa',[...new Set([...d,...c])]);guardar('miCocinaCompras',[]);pintarDespensa();};pintarDespensa(); }

// Sugerencias de ingredientes mientras se escribe en la despensa.
if (document.getElementById('sugerenciasDespensa')) {
  const sugeridosDespensa = ['tomate','pollo','arroz','papa','cebolla','zanahoria','ajo','huevo','queso','pasta','atún','palta','espinaca','leche','champiñón','lentejas'];
  nuevoIngrediente.oninput = () => {
    const texto = nuevoIngrediente.value.trim().toLowerCase();
    const yaTengo = leer('miCocinaDespensa');
    const opciones = sugeridosDespensa.filter(x => x.includes(texto) && !yaTengo.includes(x));
    sugerenciasDespensa.innerHTML = texto ? opciones.map(x => `<button class="sugerencia" onclick="elegirSugerenciaDespensa('${x}')">+ ${x}</button>`).join('') : '';
  };
  window.elegirSugerenciaDespensa = ingrediente => { nuevoIngrediente.value = ingrediente; sugerenciasDespensa.innerHTML = ''; agregarIngredienteDespensa.click(); };
}

// Historial: las tarjetas guardadas pueden abrirse nuevamente con sus pasos.
if (document.getElementById('historialRecetas')) {
  const renderHistorialInteractivo = () => {
    const busquedas = leer('miCocinaHistorialBusquedas');
    const recetasVistas = leer('miCocinaHistorialRecetas');
    historialBusquedas.innerHTML = busquedas.length ? busquedas.map(x => `<div class="historial-item"><b>${x.ingredientes.join(', ')}</b><small>${x.fecha}</small></div>`).join('') : '<p class="sin-resultados">Aún no realizas búsquedas.</p>';
    historialRecetas.innerHTML = recetasVistas.length ? recetasVistas.map((r,i) => `<article class="receta-card tarjeta-clickable" onclick="abrirHistorialReceta(${i})"><div class="receta-imagen">${r.icono}</div><div class="receta-cuerpo"><h3>${r.nombre}</h3><p>${r.descripcion}</p><div class="receta-datos">◷ ${r.tiempo} · 🍽 ${r.porciones} porciones</div><button class="boton-ver" type="button">Abrir receta</button></div></article>`).join('') : '<p class="sin-resultados">Abre una receta para verla aquí.</p>';
  };
  window.abrirHistorialReceta = indice => {
    const receta = leer('miCocinaHistorialRecetas')[indice];
    detalleHistorial.innerHTML = `<button class="modal-cerrar" onclick="modalHistorial.classList.remove('abierto')">Cerrar</button><h2>${receta.icono} ${receta.nombre}</h2><p>${receta.descripcion}</p><p><b>Tiempo:</b> ${receta.tiempo} · <b>Porciones:</b> ${receta.porciones}</p><h3>Preparación</h3><ol>${receta.pasos.map(paso => `<li>${paso}</li>`).join('')}</ol>`;
    modalHistorial.classList.add('abierto');
  };
  limpiarHistorial.onclick = () => { guardar('miCocinaHistorialBusquedas', []); guardar('miCocinaHistorialRecetas', []); renderHistorialInteractivo(); };
  renderHistorialInteractivo();
}
