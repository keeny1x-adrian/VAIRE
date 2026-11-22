// Las cinco secciones usan la misma fila. Los botones cambian la pieza del centro.
const secciones = ["Ropa", "Zapatillas", "Bolsos", "Mochilas", "Gorras"];
const pantallaPequena = matchMedia("(max-width: 620px)");
let grupoPerchero = "Ropa";
let piezas = [];
let centro = 0;
let vitrinaAbierta = false;
let primeraEntrada = true;
let seleccion = 0;
let grupoTienda = "Todo";
let ultimoDeslizamiento = 0;

function envolver(indice) {
  return (indice + piezas.length) % piezas.length;
}

function elegir(indice) {
  seleccion = indice;
  const pieza = piezas[indice];
  for (const tarjeta of porId("fila").children) {
    const activa = Number(tarjeta.dataset.indice) === indice;
    tarjeta.classList.toggle("activa", activa);
    tarjeta.setAttribute("aria-pressed", activa);
  }
  porId("numeracion").textContent = String(indice + 1).padStart(2, "0") + " / " + String(piezas.length).padStart(2, "0");
  porId("nombrePieza").textContent = pieza.name;
  porId("colorPrecio").textContent = pieza.color + " · " + precio(pieza.price);
}

function tieneCasillas() {
  return grupoPerchero === "Gorras" || grupoPerchero === "Zapatillas";
}

function actualizarPuertas(abierta) {
  vitrinaAbierta = abierta;
  const esVitrina = grupoPerchero === "Zapatillas";
  const cerrada = esVitrina && !abierta;
  const control = porId("accionVitrina");
  control.hidden = !esVitrina;
  control.textContent = abierta ? "Cerrar vitrina" : "Abrir vitrina";
  control.setAttribute("aria-expanded", String(abierta));
  porId("puertas").hidden = !esVitrina;
  porId("escena").classList.toggle("abierta", esVitrina && abierta);
  porId("fila").inert = cerrada;
  for (const id of ["verPieza", "anterior", "siguiente"]) porId(id).disabled = cerrada;
}

function dibujarFila(sentido = 1) {
  const fila = porId("fila");
  fila.replaceChildren();
  const cantidad = tieneCasillas() ? piezas.length : Math.min(pantallaPequena.matches ? 3 : 5, piezas.length);
  const mitad = Math.floor(cantidad / 2);
  for (let posicion = 0; posicion < cantidad; posicion++) {
    const indice = tieneCasillas() ? posicion : envolver(centro + posicion - mitad);
    const pieza = piezas[indice];
    const tarjeta = boton("", () => {
      if (Date.now() - ultimoDeslizamiento <= 350) return;
      elegir(indice);
      detalle(pieza);
    }, "prenda");
    tarjeta.dataset.indice = indice;
    tarjeta.setAttribute("aria-label", pieza.name);
    const soporte = elemento("span", "", "soporte");
    const caras = crearVistas(pieza, false, grupoPerchero !== "Ropa");
    soporte.append(caras);
    tarjeta.append(soporte);
    animarPieza(tarjeta, caras);
    tarjeta.onpointerenter = evento => { if (evento.pointerType === "mouse") elegir(indice); };
    tarjeta.onfocus = () => elegir(indice);
    tarjeta.style.setProperty("--fase", (-posicion * .63) + "s");
    fila.append(tarjeta);
    if (!movimientoReducido.matches) {
      const inicio = primeraEntrada ? "75vw" : (sentido * 42) + "px";
      tarjeta.animate([
        {transform: "translateX(" + inicio + ")", opacity: 0},
        {transform: "translateX(0)", opacity: 1}
      ], {duration: primeraEntrada ? 980 : 420, delay: (primeraEntrada ? 200 : 0) + posicion * 38, easing: "cubic-bezier(.16,.78,.24,1)", fill: "backwards"});
    }
  }
  elegir(centro);
  primeraEntrada = false;
}

function avanzar(pasos) {
  if (grupoPerchero === "Zapatillas" && !vitrinaAbierta) return;
  centro = envolver(seleccion + pasos);
  if (tieneCasillas()) elegir(centro);
  else dibujarFila(pasos);
}

function cambiarSeccion(nombre) {
  grupoPerchero = nombre;
  if (nombre === "Ropa") {
    // Ponemos la polera rosa en el centro de la primera fila.
    const orden = ["polera-rosa", "polera-bosque", "ropa-2", "abrigo-largo", "polo-niebla", "ropa-1", "ropa-4", "ropa-5", "camisa", "polo-rayas", "pantalon", "vestido", "abrigo-gris", "polo-carbon", "ropa-3", "chaqueta", "casaca-crema", "ropa-6"];
    piezas = orden.map(obtener);
  } else {
    piezas = prendas.filter(pieza => pieza.category === nombre);
  }
  centro = 0;
  porId("tituloRack").textContent = nombre;
  porId("escena").dataset.grupo = nombre;
  porId("mostrador").setAttribute("aria-label", "Exhibición de " + nombre.toLowerCase());
  actualizarPuertas(false);
  porId("mostrador").classList.toggle("accesorios", nombre !== "Ropa");
  for (const tab of porId("secciones").children) tab.setAttribute("aria-pressed", tab.textContent === nombre);
  dibujarFila();
}

function iniciarPerchero() {
  for (const nombre of secciones) porId("secciones").append(boton(nombre, () => cambiarSeccion(nombre), "pestana"));
  porId("accionVitrina").onclick = () => actualizarPuertas(!vitrinaAbierta);
  porId("puertas").onclick = () => actualizarPuertas(true);
  porId("anterior").onclick = () => avanzar(-1);
  porId("siguiente").onclick = () => avanzar(1);
  porId("verPieza").onclick = () => detalle(piezas[seleccion]);
  porId("coleccion").onkeydown = evento => {
    if (!["ArrowLeft","ArrowRight"].includes(evento.key) || evento.target.closest("#secciones")) return;
    evento.preventDefault();
    avanzar(evento.key === "ArrowRight" ? 1 : -1);
    if (evento.target.classList.contains("prenda")) porId("fila").querySelector(".activa").focus({preventScroll:true});
  };
  let inicioX = 0;
  let inicioY = 0;
  const zona = porId("mostrador");
  zona.addEventListener("touchstart", evento => {
    inicioX = evento.touches[0].clientX;
    inicioY = evento.touches[0].clientY;
  }, {passive:true});
  zona.addEventListener("touchend", evento => {
    const x = evento.changedTouches[0].clientX - inicioX;
    const y = evento.changedTouches[0].clientY - inicioY;
    if (tieneCasillas()) return;
    if (Math.abs(x) > 40 && Math.abs(x) > Math.abs(y) * 1.4) {
      ultimoDeslizamiento = Date.now();
      avanzar(x < 0 ? 1 : -1);
    }
  }, {passive:true});
  pantallaPequena.addEventListener("change", () => { centro = seleccion; dibujarFila(); });
  cambiarSeccion("Ropa");
}

function irSeccion(primera = false) {
  const partes = location.hash.slice(1).split("/");
  if (panel.open) panel.close();
  if (partes[0] === "tienda") {
    grupoTienda = categorias.includes(partes[1]) ? partes[1] : "Todo";
    mostrarTienda(grupoTienda);
    porId("pagina-tienda").scrollIntoView({behavior:"instant"});
  } else if (!primera) window.scrollTo({top:0, behavior:"instant"});
}

async function iniciar() {
  if (modoPython) {
    prendas = await buscar("", "Todo");
    tallasPython = await (await fetch("/api/tallas")).json();
  }
  leerBolsa();
  iniciarPerchero();
  for (const grupo of categorias) {
    const filtro = enlace(grupo, grupo === "Todo" ? "#tienda" : "#tienda/" + grupo);
    filtro.dataset.grupo = grupo;
    porId("filtros").append(filtro);
  }
  porId("orden").onchange = () => mostrarTienda(grupoTienda);
  porId("bagBtn").onclick = () => mostrarBolsa();
  porId("searchBtn").onclick = abrirBuscador;
  porId("dismiss").onclick = () => panel.close();
  panel.onclick = evento => {
    if (evento.target !== panel) return;
    const caja = panel.getBoundingClientRect();
    if (evento.clientX < caja.left || evento.clientX > caja.right || evento.clientY < caja.top || evento.clientY > caja.bottom) panel.close();
  };
  document.querySelector(".salto").onclick = evento => {
    evento.preventDefault();
    porId("contenido").focus();
  };
  window.addEventListener("hashchange", () => irSeccion());
  mostrarTienda("Todo");
  irSeccion(true);
}
iniciar();
