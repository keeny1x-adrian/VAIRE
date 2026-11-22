// El navegador muestra el catálogo. En el modo de examen, Python hace las búsquedas y las cuentas.
const categorias = ["Todo", "Mujer", "Hombre", "Zapatillas", "Bolsos", "Mochilas", "Gorras"];
const modoPython = new URLSearchParams(location.search).get("modo") === "python";
const movimientoReducido = matchMedia("(prefers-reduced-motion: reduce)");
const panel = porId("panel");
const contenido = porId("panelBody");
let prendas = catalogo;
let tallasPython = {};
let bolsa = [];
let revisionPanel = 0;
let revisionTienda = 0;

function porId(id) {
  return document.getElementById(id);
}

function elemento(tipo, texto = "", clase = "") {
  const nodo = document.createElement(tipo);
  nodo.textContent = texto;
  nodo.className = clase;
  return nodo;
}

function boton(texto, accion, clase = "") {
  const nodo = elemento("button", texto, clase);
  nodo.type = "button";
  nodo.onclick = accion;
  return nodo;
}

function enlace(texto, destino, clase = "") {
  const nodo = elemento("a", texto, clase);
  nodo.href = destino;
  return nodo;
}

function precio(numero) {
  return "S/ " + numero;
}

function obtener(id) {
  return prendas.find(pieza => pieza.id === id);
}

function imagenPieza(pieza, alternativa = "", color = 0, espalda = false) {
  const imagen = new Image();
  imagen.alt = alternativa;
  if (color > 0 || espalda) {
    const cara = espalda ? "espalda" : "frente";
    imagen.src = "assets/vistas/" + pieza.img + "-" + color + "-" + cara + ".webp";
  } else imagen.src = "assets/" + pieza.img + ".webp";
  return imagen;
}

function tallas(pieza) {
  if (modoPython) return tallasPython[pieza.id];
  if (pieza.category === "Zapatillas") return ["36", "37", "38", "39", "40", "41", "42", "43", "44"];
  if (["Bolsos", "Mochilas", "Gorras"].includes(pieza.category)) return ["Única"];
  return ["XS", "S", "M", "L", "XL"];
}

function normalizar(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

async function buscar(texto, categoria) {
  if (modoPython) {
    const parametros = new URLSearchParams({texto: texto, categoria: categoria});
    const respuesta = await fetch("/api/catalogo?" + parametros);
    if (!respuesta.ok) throw new Error("No se pudo consultar el catálogo local.");
    return respuesta.json();
  }
  const lista = [];
  for (const pieza of prendas) {
    const palabras = pieza.name + " " + pieza.category + " " + pieza.colores.map(color => color[0]).join(" ");
    if ((categoria === "Todo" || categoria === pieza.category) && normalizar(palabras).includes(normalizar(texto))) {
      lista.push(pieza);
    }
  }
  return lista;
}

// El frente y la espalda son dos fotografías distintas.
function crearVistas(pieza, cargaDiferida = false, enExpositor = false) {
  const caras = elemento("span", "", "caras");
  for (const espalda of [false, true]) {
    const foto = enExpositor ? new Image() : imagenPieza(pieza, "", 0, espalda);
    if (enExpositor) {
      foto.alt = "";
      foto.src = "assets/exposicion/" + pieza.img + (espalda ? "-espalda.webp" : "-frente.webp");
    }
    foto.className = espalda ? "reverso" : "anverso";
    if (cargaDiferida) foto.loading = "lazy";
    caras.append(foto);
  }
  return caras;
}

function animarPieza(zona, caras) {
  let lado = 1;
  let x = 0;
  let espalda = false;
  let espera;
  function girar() {
    const angulo = espalda ? lado * 180 + x * 9 : x * 20;
    caras.style.setProperty("--giro", angulo + "deg");
    caras.style.setProperty("--balanceo", x * 4 + "deg");
  }
  function mover(evento) {
    if (evento.pointerType !== "mouse") return;
    const caja = zona.getBoundingClientRect();
    x = 2 * (evento.clientX - caja.left) / caja.width - 1;
    girar();
  }
  zona.addEventListener("pointerenter", evento => {
    if (evento.pointerType !== "mouse") return;
    mover(evento);
    lado = x < 0 ? -1 : 1;
    espera = setTimeout(() => {
      espalda = true;
      girar();
    }, 680);
  });
  zona.addEventListener("pointermove", mover);
  zona.addEventListener("pointerleave", () => {
    clearTimeout(espera);
    espalda = false;
    caras.style.removeProperty("--giro");
    caras.style.removeProperty("--balanceo");
  });
}

function tarjetaPieza(pieza) {
  const tarjeta = boton("", () => detalle(pieza), "producto");
  const cuadro = elemento("span", "", "foto-producto");
  const caras = crearVistas(pieza, true);
  cuadro.append(caras);
  animarPieza(tarjeta, caras);
  tarjeta.append(cuadro, elemento("small", pieza.category, "grupo-producto"), elemento("strong", pieza.name), elemento("span", precio(pieza.price), "precio"));
  return tarjeta;
}

function mostrarPanel(titulo, esFicha = false) {
  panel.classList.toggle("ficha-abierta", esFicha);
  revisionPanel++;
  const cabecera = elemento("h2", titulo);
  cabecera.id = "tituloPanel";
  cabecera.tabIndex = -1;
  contenido.replaceChildren(cabecera);
  if (!panel.open) panel.showModal();
  panel.scrollTop = 0;
  cabecera.focus({preventScroll:true});
}

function irATienda() {
  if (panel.open) panel.close();
  if (location.hash === "#tienda") porId("tituloTienda").scrollIntoView({block:"start"});
  else location.hash = "tienda";
}

async function mostrarTienda(grupo) {
  const pedido = ++revisionTienda;
  porId("categoriaActiva").textContent = grupo === "Todo" ? "Todas las piezas" : grupo;
  for (const filtro of porId("filtros").children) {
    if (filtro.dataset.grupo === grupo) filtro.setAttribute("aria-current", "page");
    else filtro.removeAttribute("aria-current");
  }
  const lista = await buscar("", grupo);
  if (pedido !== revisionTienda) return;
  const orden = porId("orden").value;
  if (orden === "asc") lista.sort((a, b) => a.price - b.price);
  if (orden === "desc") lista.sort((a, b) => b.price - a.price);
  if (orden === "az") lista.sort((a, b) => a.name.localeCompare(b.name, "es"));
  const destino = porId("productos");
  destino.replaceChildren();
  for (const pieza of lista) destino.append(tarjetaPieza(pieza));
  porId("cantidadTienda").textContent = lista.length + " piezas";
}

function abrirBuscador() {
  mostrarPanel("Buscar en VAIRE");
  const campo = elemento("input");
  campo.type = "search";
  campo.className = "campo-busqueda";
  campo.placeholder = "Nombre, categoría o color";
  campo.setAttribute("aria-label", "Nombre, categoría o color");
  const estado = elemento("p", "", "meta");
  estado.setAttribute("role", "status");
  const resultados = elemento("div", "", "resultados-busqueda");
  contenido.append(campo, estado, resultados);
  async function actualizar() {
    const texto = campo.value;
    const lista = await buscar(texto, "Todo");
    if (!campo.isConnected || campo.value !== texto) return;
    resultados.replaceChildren();
    estado.textContent = lista.length ? lista.length + (lista.length === 1 ? " pieza" : " piezas") : "No encontramos piezas con esa búsqueda.";
    for (const pieza of lista) {
      const fila = boton("", () => detalle(pieza), "resultado");
      const etiqueta = elemento("span", pieza.name);
      etiqueta.append(elemento("small", pieza.category + " · " + precio(pieza.price)));
      fila.append(imagenPieza(pieza), etiqueta);
      resultados.append(fila);
    }
  }
  campo.oninput = actualizar;
  campo.focus();
  actualizar();
}

function girarModelo(zona, pieza) {
  const modelo = elemento("div", "", "visor");
  modelo.style.backgroundImage = "url(assets/giro-" + pieza.img + ".webp)";
  modelo.setAttribute("role", "img");
  modelo.setAttribute("aria-label", "Modelo de estudio de " + pieza.name);
  const control = elemento("input");
  control.type = "range";
  control.min = 0;
  control.max = 23;
  control.setAttribute("aria-label", "Ángulo de " + pieza.name);
  const grados = elemento("span", "", "contador");
  let cuadro = 0;
  function girar(numero) {
    cuadro = (numero % 24 + 24) % 24;
    control.value = cuadro;
    const columna = cuadro % 6;
    const fila = Math.floor(cuadro / 6);
    modelo.style.backgroundPosition = columna * 20 + "% " + fila * 100 / 3 + "%";
    grados.textContent = cuadro * 15 + "°";
    control.setAttribute("aria-valuetext", cuadro * 15 + " grados");
  }
  const menos = boton("−", () => girar(cuadro - 1), "control-giro");
  menos.setAttribute("aria-label", "Girar a la izquierda");
  const mas = boton("+", () => girar(cuadro + 1), "control-giro");
  mas.setAttribute("aria-label", "Girar a la derecha");
  control.oninput = () => girar(Number(control.value));
  modelo.onpointerdown = evento => {
    modelo.setPointerCapture(evento.pointerId);
    const inicio = evento.clientX;
    const base = cuadro;
    modelo.onpointermove = paso => girar(base + Math.round((paso.clientX - inicio) / 9));
  };
  modelo.onlostpointercapture = () => { modelo.onpointermove = null; };
  const controles = elemento("div", "", "giro");
  controles.append(menos, control, mas, grados);
  zona.append(modelo, elemento("p", "Arrastra la pieza o ajusta el ángulo.", "ayuda"), controles);
  girar(0);
}

function detalle(pieza) {
  mostrarPanel(pieza.name, true);
  const visual = elemento("div", "", "detalle-visual");
  const escenario = elemento("div", "", "visual-producto");
  const controles = elemento("div", "", "selector-vista");
  visual.append(escenario, controles);
  const opcionesVista = ["Frente", "Espalda"];
  if (!pieza.seccion) opcionesVista.push("Modelo 360°");
  let vista = "Frente";
  let color = 0;
  function actualizarVista() {
    escenario.replaceChildren();
    if (vista === "Modelo 360°") girarModelo(escenario, pieza);
    else {
      const foto = imagenPieza(pieza, pieza.name + ", " + pieza.colores[color][0] + ", " + vista, color, vista === "Espalda");
      foto.className = "foto-detalle";
      escenario.append(foto);
    }
    for (const control of controles.children) {
      control.setAttribute("aria-pressed", control.textContent === vista);
      control.hidden = control.textContent === "Modelo 360°" && color !== 0;
    }
  }
  // En una pantalla táctil, deslizar la fotografía cambia de cara.
  let inicioX = 0;
  let inicioY = 0;
  escenario.addEventListener("touchstart", evento => {
    inicioX = evento.touches[0].clientX;
    inicioY = evento.touches[0].clientY;
  }, {passive: true});
  escenario.addEventListener("touchend", evento => {
    if (vista === "Modelo 360°") return;
    const dx = evento.changedTouches[0].clientX - inicioX;
    const dy = evento.changedTouches[0].clientY - inicioY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      vista = vista === "Frente" ? "Espalda" : "Frente";
      actualizarVista();
    }
  }, {passive: true});
  for (const nombre of opcionesVista) {
    controles.append(boton(nombre, () => {
      vista = nombre;
      actualizarVista();
    }));
  }
  const info = elemento("div", "", "datos-pieza");
  const titulo = porId("tituloPanel");
  info.append(elemento("p", pieza.category, "etiqueta"), titulo, elemento("strong", precio(pieza.price), "precio-detalle"), elemento("p", pieza.detail, "descripcion"));
  contenido.append(visual, info);
  const colores = elemento("fieldset", "", "colores");
  const leyenda = elemento("legend");
  colores.append(leyenda);
  function elegirColor(indice) {
    color = indice;
    leyenda.textContent = "Color · " + pieza.colores[color][0];
    for (const muestra of colores.querySelectorAll("button")) {
      muestra.setAttribute("aria-pressed", Number(muestra.dataset.color) === color);
    }
    if (color !== 0 && vista === "Modelo 360°") vista = "Frente";
    actualizarVista();
  }
  pieza.colores.forEach(([nombre, tono], indice) => {
    const muestra = boton("", () => elegirColor(indice), "muestra");
    muestra.dataset.color = indice;
    muestra.style.setProperty("--tono", tono);
    muestra.title = nombre;
    muestra.setAttribute("aria-label", nombre);
    colores.append(muestra);
  });
  info.append(colores);
  elegirColor(0);
  const opciones = tallas(pieza);
  let elegida = opciones.length === 1 ? opciones[0] : "";
  const grupo = elemento("fieldset", "", "tallas");
  grupo.append(elemento("legend", "Selecciona tu talla"));
  const aviso = elemento("p", "", "aviso");
  aviso.setAttribute("role", "status");
  for (const talla of opciones) {
    const opcion = boton(talla, () => {
      elegida = talla;
      for (const otra of grupo.querySelectorAll("button")) otra.setAttribute("aria-pressed", otra === opcion);
      aviso.textContent = "";
    }, "talla");
    opcion.setAttribute("aria-pressed", elegida === talla);
    grupo.append(opcion);
  }
  info.append(grupo, aviso, boton("Agregar a la bolsa", () => {
    if (!elegida) {
      aviso.textContent = "Elige una talla para agregar esta pieza.";
      grupo.querySelector("button").focus();
      return;
    }
    const linea = bolsa.find(item => item.id === pieza.id && item.size === elegida && item.color === color);
    if (linea && linea.n >= 99) {
      aviso.textContent = "El máximo es 99 unidades de la misma talla.";
      return;
    }
    if (linea) linea.n++;
    else bolsa.push({id:pieza.id, size:elegida, color:color, n:1});
    guardar();
    mostrarBolsa();
  }, "pastilla negra ancha"));
}

function contarBolsa() {
  let cantidad = 0;
  for (const linea of bolsa) cantidad += linea.n;
  porId("bagCount").textContent = cantidad;
  porId("bagBtn").setAttribute("aria-label", "Abrir bolsa, " + cantidad + (cantidad === 1 ? " pieza" : " piezas"));
}

function leerBolsa() {
  try {
    const datos = JSON.parse(localStorage.getItem("vaire-bolsa") || "[]");
    bolsa = datos.filter(item => item && obtener(item.id) && tallas(obtener(item.id)).includes(item.size) && Number.isInteger(item.n) && item.n > 0 && item.n <= 99);
    for (const linea of bolsa) {
      if (!Number.isInteger(linea.color) || !obtener(linea.id).colores[linea.color]) linea.color = 0;
    }
  } catch { bolsa = []; }
  contarBolsa();
}

function guardar() {
  try { localStorage.setItem("vaire-bolsa", JSON.stringify(bolsa)); } catch { /* La bolsa también funciona en memoria. */ }
  contarBolsa();
}

function cambiarCantidad(indice, cantidad) {
  if (cantidad === 0) bolsa.splice(indice, 1);
  else bolsa[indice].n = cantidad;
  guardar();
  mostrarBolsa();
}

async function mostrarBolsa(resumen = false) {
  mostrarPanel(resumen ? "Resumen del pedido" : "Tu bolsa");
  const actual = revisionPanel;
  if (!bolsa.length) {
    contenido.append(elemento("p", "Tu bolsa está vacía."), boton("Explorar la tienda", irATienda, "pastilla negra"));
    return;
  }
  let total = 0;
  for (let i = 0; i < bolsa.length; i++) {
    const linea = bolsa[i];
    const pieza = obtener(linea.id);
    total += pieza.price * linea.n;
    const fila = elemento("div", "", "fila-bolsa");
    const texto = elemento("div");
    texto.append(elemento("strong", pieza.name), elemento("small", linea.n + " × " + precio(pieza.price) + " · " + pieza.colores[linea.color][0] + " · Talla " + linea.size));
    if (!resumen) {
      const controles = elemento("div", "", "cantidades");
      const menos = boton("−", () => cambiarCantidad(i, linea.n - 1));
      const mas = boton("+", () => cambiarCantidad(i, linea.n + 1));
      menos.setAttribute("aria-label", "Restar una unidad de " + pieza.name);
      mas.setAttribute("aria-label", "Sumar una unidad de " + pieza.name);
      mas.disabled = linea.n >= 99;
      controles.append(menos, mas, boton("Quitar", () => cambiarCantidad(i, 0), "quitar"));
      texto.append(controles);
    }
    fila.append(imagenPieza(pieza, "", linea.color), texto);
    contenido.append(fila);
  }
  if (modoPython) {
    const respuesta = await fetch("/api/total", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(bolsa)});
    total = await respuesta.json();
    if (actual !== revisionPanel) return;
  }
  const suma = elemento("div", "", "subtotal");
  suma.append(elemento("strong", resumen ? "Total" : "Subtotal"), elemento("strong", precio(total)));
  contenido.append(suma);
  if (resumen) contenido.append(elemento("p", "Pedido de demostración para la presentación."), boton("Seguir explorando", irATienda, "pastilla negra ancha"));
  else contenido.append(boton("Revisar pedido", () => mostrarBolsa(true), "pastilla negra ancha"));
}
