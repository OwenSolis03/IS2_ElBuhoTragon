// src/pages/Home.jsx
import React, { useEffect, useState, useMemo } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatWidget from "../components/ChatWidget";
import CafeCard from "../components/CafeCard";
import SkeletonCard from "../components/SkeletonCard";
import { FiSearch, FiX, FiAlertCircle, FiRefreshCw } from "react-icons/fi";

// Assets originales del Búho
import BuhoZZZ from "../assets/zzz.png";
import BuhoCartel from "../assets/cartel.png";

// Fotografías reales del campus para fallbacks precisos
import Derecho1 from "/Derecho1Card.jpeg";
import TrabajoSocial from "/TrabajoSocial1Card.jpeg";
import Educacion from "/Eduacion1Card.jpeg";
import Derecho2 from "/Derecho2Card.jpeg";
import Historia from "/Historia1Card.jpeg";
import Medicina1 from "/Medicina1Card.jpeg";
import Medicina2 from "/Medicina2Card.jpeg";
import CivilMinas from "/IngenieriaCivil1Card.jpeg";
import IngenieriaQuimica from "/IngQuimica1Card.jpeg";
import Geologia from "/Cafeteria-Geologia1Card.jpeg";
import Matematicas from "/Matematicas1Card.png";
import Artes from "/Artes1Card.png";
import Derecho1Page from "/Derecho1Page.jpeg";
import { API_URL } from "../config";

const imagenesOriginales = {
  1: Derecho1, 
  2: TrabajoSocial, 
  3: Educacion, 
  4: Derecho2,
  5: Historia, 
  6: IngenieriaQuimica, 
  7: CivilMinas, 
  8: Medicina1,
  9: Matematicas, 
  10: Artes, 
  11: Geologia, 
  13: Medicina2,
  14: CivilMinas,
  15: Derecho1Page
};

const Home = () => {
  const [cafeterias, setCafeterias] = useState([]);
  const [allMenus, setAllMenus] = useState([]);
  const [filteredCafeterias, setFilteredCafeterias] = useState([]);
  const [facultades, setFacultades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  // Filtros funcionales
  const [filterFacultad, setFilterFacultad] = useState("");
  const [filterComida, setFilterComida] = useState("");
  const [filterPrecio, setFilterPrecio] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const categoriasOptions = [
    "Desayuno",
    "Comida Corrida",
    "Fit / Saludable",
    "Bebidas",
    "Snacks"
  ];

  // 1. CARGA DE DATOS
  const loadData = async () => {
    setLoading(true);
    setNetworkError(false);
    try {
      const [resCafes, resMenus, resFacus] = await Promise.all([
        fetch(`${API_URL}/api/Tienditas/`),
        fetch(`${API_URL}/api/Menus/`),
        fetch(`${API_URL}/api/Facultades/`)
      ]);

      if (!resCafes.ok || !resMenus.ok || !resFacus.ok) {
        throw new Error("Respuesta no satisfactoria del servidor");
      }

      const dataCafes = await resCafes.json();
      const dataMenus = await resMenus.json();
      const dataFacus = await resFacus.json();

      setCafeterias(dataCafes);
      setAllMenus(dataMenus);
      setFacultades(dataFacus);
      setFilteredCafeterias(dataCafes);
      setLoading(false);
    } catch (e) {
      console.error("Error al cargar catálogo de cafeterías:", e);
      setNetworkError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. FILTRADO REACTIVO
  useEffect(() => {
    let result = cafeterias;

    if (filterFacultad) {
      result = result.filter((c) => c.id_facultad === parseInt(filterFacultad));
    }

    if (filterComida) {
      const tiendasConComida = allMenus
        .filter((m) => m.categoria === filterComida)
        .map((m) => m.id_tiendita);
      result = result.filter((c) => tiendasConComida.includes(c.id_tiendita));
    }

    if (filterPrecio) {
      const maxPrecio = parseFloat(filterPrecio);
      const tiendasEnPresupuesto = allMenus
        .filter((m) => parseFloat(m.precio) <= maxPrecio)
        .map((m) => m.id_tiendita);
      result = result.filter((c) => tiendasEnPresupuesto.includes(c.id_tiendita));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) => {
        const matchNombre = c.nombre.toLowerCase().includes(term);
        const matchMenu = allMenus.some(
          (m) => m.id_tiendita === c.id_tiendita && m.nombre.toLowerCase().includes(term)
        );
        return matchNombre || matchMenu;
      });
    }

    setFilteredCafeterias(result);
  }, [filterFacultad, filterComida, filterPrecio, searchTerm, cafeterias, allMenus]);

  // Mapa de nombres de facultades
  const facultadesMap = useMemo(() => {
    const map = {};
    facultades.forEach((f) => {
      map[f.id_facultad] = f.nombre;
    });
    return map;
  }, [facultades]);

  // 3. HORARIOS EN VIVO
  const isCafeOpen = (apertura, cierre) => {
    if (!apertura || !cierre) return false;
    const ahora = new Date();
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
    const [apH, apM] = apertura.split(":").map(Number);
    const [ciH, ciM] = cierre.split(":").map(Number);
    const inicio = apH * 60 + apM;
    const fin = ciH * 60 + ciM;
    return minutosActuales >= inicio && minutosActuales < fin;
  };

  const { abiertas, cerradas } = useMemo(() => {
    const ab = [];
    const ce = [];
    filteredCafeterias.forEach((cafe) => {
      if (isCafeOpen(cafe.hora_apertura, cafe.hora_cierre)) {
        ab.push(cafe);
      } else {
        ce.push(cafe);
      }
    });
    return { abiertas: ab, cerradas: ce };
  }, [filteredCafeterias]);

  const hasActiveFilters = Boolean(filterFacultad || filterComida || filterPrecio || searchTerm);

  const resetFilters = () => {
    setFilterFacultad("");
    setFilterComida("");
    setFilterPrecio("");
    setSearchTerm("");
  };

  const getMatchedDishes = (cafeId) => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return allMenus.filter(
      (m) => m.id_tiendita === cafeId && m.nombre.toLowerCase().includes(term)
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#0e2246] text-[#F2F2F0] flex flex-col font-sans selection:bg-[#163A70] selection:text-white">
      <Header />

      {/* ========================================================= */}
      {/* HERO ATMOSFÉRICO CON FOTOGRAFÍA UNISON                    */}
      {/* ========================================================= */}
      <section className="relative w-full pt-28 pb-16 sm:pb-24 border-b border-white/[0.08] overflow-hidden">
        {/* Capa fotográfica integrada con mezcla y tinte UNISON */}
        <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
          <img
            src="/unison-hero.jpg"
            alt="Universidad de Sonora"
            className="w-full h-full object-cover object-center opacity-30 filter contrast-110"
          />
          <div className="absolute inset-0 bg-[#0e2246]/45 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e2246] via-[#0e2246]/50 to-[#0e2246]/85" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e2246] via-transparent to-[#0e2246]" />
        </div>

        {/* Contenido Frontal */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 w-full">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pt-8 sm:pt-14">
            <div>
              <span className="text-sm font-mono tracking-[0.22em] text-[#B39A3A] uppercase block mb-3 font-medium">
                Universidad de Sonora · Hermosillo
              </span>
              <h1 className="font-display text-6xl sm:text-8xl lg:text-9xl font-normal tracking-tight text-[#F2F2F0] leading-[0.92]">
                El Búho Tragón
              </h1>
            </div>

            <div className="max-w-md lg:text-right flex flex-col lg:items-end gap-3">
              <p className="text-neutral-200 text-lg sm:text-xl font-light leading-snug">
                Directorio y horarios en tiempo real de las cafeterías del campus universitario.
              </p>
              <div className="flex items-center gap-4 text-sm font-mono text-neutral-200">
                <span>{cafeterias.length} establecimientos</span>
                <span className="text-white/20" aria-hidden="true">/</span>
                <span className="text-white flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  {abiertas.length} en servicio
                </span>
                <span className="text-white/20" aria-hidden="true">/</span>
                <span>{facultades.length || 6} facultades</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-grow pt-14 sm:pt-20 pb-36 px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto w-full">
        {/* ========================================================= */}
        {/* BÚSQUEDA Y FILTROS INTEGRADOS AL LIENZO                   */}
        {/* ========================================================= */}
        <section className="mb-16 sm:mb-20" aria-label="Buscador y filtros de catálogo">
          {/* Línea de búsqueda editorial */}
          <div className="relative w-full border-b border-white/20 pb-4 mb-8 sm:mb-10 transition-colors focus-within:border-[#B39A3A]">
            <label htmlFor="home-search-input" className="sr-only">
              Buscar platillo o cafetería
            </label>
            <input
              id="home-search-input"
              type="text"
              placeholder="Buscar por platillo o cafetería..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-[#F2F2F0] text-xl sm:text-2xl font-light placeholder:text-neutral-400 placeholder:font-light focus:outline-none pr-10"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-0 top-1 text-neutral-400 hover:text-white p-1.5 transition-colors cursor-pointer"
                aria-label="Limpiar término de búsqueda"
              >
                <FiX size={22} />
              </button>
            ) : (
              <FiSearch className="absolute right-0 top-2 text-neutral-400 pointer-events-none" size={22} />
            )}
          </div>

          {/* Filtros Tipográficos Editoriales */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
            {/* Categorías de comida */}
            <div className="flex flex-wrap items-center gap-x-6 sm:gap-x-8 gap-y-3 font-mono text-sm uppercase tracking-[0.14em]">
              <button
                type="button"
                onClick={() => setFilterComida("")}
                className={`py-1.5 relative transition-colors cursor-pointer ${
                  filterComida === ""
                    ? "text-white font-medium after:absolute after:-bottom-0.5 after:left-0 after:right-0 after:h-[2px] after:bg-[#B39A3A]"
                    : "text-neutral-400 hover:text-white font-normal"
                }`}
              >
                Todas
              </button>
              {categoriasOptions.map((cat) => {
                const isActive = filterComida === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterComida(isActive ? "" : cat)}
                    className={`py-1.5 relative transition-colors cursor-pointer ${
                      isActive
                        ? "text-white font-medium after:absolute after:-bottom-0.5 after:left-0 after:right-0 after:h-[2px] after:bg-[#B39A3A]"
                        : "text-neutral-400 hover:text-white font-normal"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Selectores de Facultad, Presupuesto y Reset */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-neutral-200 font-mono text-sm">
              {/* Selector de Facultad */}
              <div className="flex items-center gap-2">
                <label htmlFor="filter-facultad" className="text-neutral-300 uppercase tracking-wider text-xs font-medium">
                  Facultad:
                </label>
                <select
                  id="filter-facultad"
                  value={filterFacultad}
                  onChange={(e) => setFilterFacultad(e.target.value)}
                  className="bg-[#071326] text-neutral-100 border border-white/12 px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#B39A3A] cursor-pointer hover:text-white uppercase tracking-wider text-sm"
                >
                  <option value="">Todas</option>
                  {facultades.map((f) => (
                    <option key={f.id_facultad} value={f.id_facultad}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-white/20 hidden sm:inline" aria-hidden="true">|</span>

              {/* Filtro de Presupuesto */}
              <div className="flex items-center gap-2.5">
                <span className="text-neutral-300 uppercase tracking-wider text-xs font-medium">Máx:</span>
                {[
                  { label: "Todo", value: "" },
                  { label: "$40", value: "40" },
                  { label: "$65", value: "65" },
                  { label: "$90", value: "90" },
                ].map((p) => {
                  const isSelected = filterPrecio === p.value;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setFilterPrecio(p.value)}
                      className={`transition-colors cursor-pointer px-2.5 py-1 rounded text-sm ${
                        isSelected
                          ? "text-[#B39A3A] font-semibold bg-[#B39A3A]/15 border border-[#B39A3A]/35"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Restablecer Filtros */}
              {hasActiveFilters && (
                <>
                  <span className="text-white/20 hidden sm:inline" aria-hidden="true">|</span>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-rose-400 hover:text-rose-300 uppercase tracking-wider underline underline-offset-4 cursor-pointer transition-colors text-sm font-medium"
                  >
                    Restablecer
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* ESTADO DE ERROR DE RED O CARGA                            */}
        {/* ========================================================= */}
        {networkError && (
          <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center max-w-lg mx-auto mb-16 space-y-3">
            <FiAlertCircle className="mx-auto text-rose-400" size={32} />
            <h3 className="font-display text-2xl text-white font-normal">
              Error de Conexión
            </h3>
            <p className="text-sm sm:text-base text-neutral-200 font-light leading-relaxed">
              No fue posible conectar con el servidor universitario para cargar el catálogo. Verifica que el servicio esté en ejecución.
            </p>
            <button
              onClick={loadData}
              className="mt-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-mono uppercase tracking-wider hover:bg-neutral-200 transition-colors inline-flex items-center gap-2 cursor-pointer font-semibold"
            >
              <FiRefreshCw size={14} />
              <span>Reintentar</span>
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* CONTENIDO PRINCIPAL: GRILLAS Y SKELETON                   */}
        {/* ========================================================= */}
        {loading ? (
          <section aria-label="Cargando cafeterías">
            <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-3 mb-10">
              <span className="font-mono text-sm uppercase tracking-[0.18em] text-neutral-300 animate-pulse font-medium">
                Sincronizando información del campus...
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-7">
              <SkeletonCard count={8} />
            </div>
          </section>
        ) : (
          <>
            {/* ESTADO VACÍO (SIN RESULTADOS DE FILTRO) */}
            {!networkError && abiertas.length === 0 && cerradas.length === 0 && (
              <div className="py-24 text-center max-w-md mx-auto">
                <img
                  src={BuhoCartel}
                  alt="Sin resultados"
                  className="w-36 h-36 mx-auto object-contain opacity-80 mb-6 filter contrast-125"
                />
                <h3 className="font-display text-3xl text-white mb-2 font-normal">
                  Sin coincidencias
                </h3>
                <p className="text-neutral-200 text-base mb-6 font-light">
                  No hay cafeterías o platillos que coincidan con los filtros seleccionados actualmente.
                </p>
                <button
                  onClick={resetFilters}
                  className="px-7 py-3 rounded-full bg-white text-black text-sm font-mono uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer font-semibold"
                >
                  Restablecer filtros
                </button>
              </div>
            )}

            {/* SECCIÓN 1: EN SERVICIO (ABIERTAS) */}
            {abiertas.length > 0 && (
              <section className="mb-24" aria-label="Cafeterías abiertas en este momento">
                <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-3 mb-10">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    <h2 className="font-mono text-sm sm:text-base uppercase tracking-[0.18em] text-neutral-100 font-semibold">
                      En servicio ({abiertas.length})
                    </h2>
                  </div>
                  <span className="text-sm font-mono text-neutral-300">
                    Horario en vivo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-7">
                  {abiertas.map((cafe, idx) => (
                    <CafeCard
                      key={cafe.id_tiendita}
                      cafe={cafe}
                      index={idx}
                      isOpen={true}
                      facultadNombre={facultadesMap[cafe.id_facultad] || "UNISON"}
                      imageSrc={imagenesOriginales[cafe.id_tiendita]}
                      searchTerm={searchTerm}
                      matchedDishes={getMatchedDishes(cafe.id_tiendita)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* SECCIÓN 2: FUERA DE HORARIO (CERRADAS) */}
            {cerradas.length > 0 && (
              <section className="pt-6" aria-label="Cafeterías cerradas en este momento">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-white/[0.08] pb-3 mb-10">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                    <h2 className="font-mono text-sm sm:text-base uppercase tracking-[0.18em] text-neutral-300 font-semibold">
                      Fuera de Horario ({cerradas.length})
                    </h2>
                  </div>
                  <span className="text-sm font-mono text-neutral-300">
                    Apertura regular matutina
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-7">
                  {cerradas.map((cafe, idx) => (
                    <CafeCard
                      key={cafe.id_tiendita}
                      cafe={cafe}
                      index={abiertas.length + idx}
                      isOpen={false}
                      facultadNombre={facultadesMap[cafe.id_facultad] || "UNISON"}
                      imageSrc={imagenesOriginales[cafe.id_tiendita]}
                      searchTerm={searchTerm}
                      matchedDishes={getMatchedDishes(cafe.id_tiendita)}
                    />
                  ))}
                </div>

                {/* Detalle visual con el Búho en reposo */}
                <div className="mt-16 flex items-center justify-between text-sm text-neutral-300 font-mono pt-6 border-t border-white/[0.08]">
                  <span>Horarios sujetos al calendario y periodo de exámenes UNISON</span>
                  <img
                    src={BuhoZZZ}
                    alt=""
                    className="h-8 w-auto opacity-40 grayscale"
                  />
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
};

export default Home;