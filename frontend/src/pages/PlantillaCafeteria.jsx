// src/pages/PlantillaCafeteria.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom"; 
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatWidget from "../components/ChatWidget";
import { FaStar } from "react-icons/fa";
import { 
  FiMapPin, 
  FiSearch, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiX, 
  FiArrowLeft,
  FiExternalLink,
  FiUser
} from "react-icons/fi";

import defaultImage from "../assets/logo.png";
import BuhoCartel from "../assets/cartel.png"; 

// Leaflet
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { API_URL } from "../config";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});
L.Marker.prototype.options.icon = DefaultIcon;

const PlantillaCafeteria = () => {
  const { id } = useParams(); 
  
  const [info, setInfo] = useState(null); 
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados Reseñas
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Estado Buscador
  const [searchTerm, setSearchTerm] = useState("");

  // Estado para Notificaciones Toasts
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const fetchResenas = useCallback(() => {
    fetch(`${API_URL}/api/Resenas/?id_tiendita=${id}`)
      .then((res) => res.json())
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error al cargar reseñas:", err));
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const [resInfo, resMenu] = await Promise.all([
          fetch(`${API_URL}/api/Tienditas/${id}/`),
          fetch(`${API_URL}/api/Menus/?id_tiendita=${id}`)
        ]);

        if (!resInfo.ok) {
          if (isMounted) {
            setInfo(null);
            setLoading(false);
          }
          return;
        }

        const dataInfo = await resInfo.json();
        const dataMenu = await resMenu.json();

        if (isMounted) {
          setInfo(dataInfo);
          setMenuItems(Array.isArray(dataMenu) ? dataMenu : []);
          fetchResenas();
          setLoading(false);
        }
      } catch (error) {
        console.error("Error al cargar información de la cafetería:", error);
        if (isMounted) {
          setInfo(null);
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [id, fetchResenas]);

  const handleSubmitResena = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    
    if (!token) return showNotification("Debes iniciar sesión con tu cuenta UNISON para compartir tu opinión.", "error");
    if (rating === 0) return showNotification("Por favor, selecciona una calificación con estrellas.", "error");
    if (!comentario.trim()) return showNotification("Por favor, redacta un breve comentario de tu experiencia.", "error");

    setSubmitting(true);

    let userId = null;
    try {
      const payloadBase64 = token.split('.')[1];
      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      userId = JSON.parse(jsonPayload).user_id;
    } catch (err) {
      console.error("Error al decodificar token:", err);
      showNotification("Tu sesión no es válida. Por favor inicia sesión nuevamente.", "error");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/Resenas/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          id_tiendita: parseInt(id),
          calificacion: rating,
          comentario: comentario.trim(),
          id_usuario: userId 
        })
      });

      if (res.ok) {
        showNotification("Reseña publicada con éxito. Tu visita ha sido acreditada.", "success");
        setRating(0);
        setComentario("");
        fetchResenas();
      } else {
        const errorData = await res.json().catch(() => ({}));
        showNotification(errorData.detail || "Error al publicar la reseña. Intenta más tarde.", "error");
      }
    } catch (error) { 
      console.error("Error de conexión al enviar reseña:", error); 
      showNotification("Error de conexión con el servidor.", "error");
    } finally { 
      setSubmitting(false); 
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("es-MX", { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const isCurrentlyOpen = (apertura, cierre) => {
    if (!apertura || !cierre) return false;
    const ahora = new Date();
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
    const [apH, apM] = apertura.split(":").map(Number);
    const [ciH, ciM] = cierre.split(":").map(Number);
    const inicio = apH * 60 + apM;
    const fin = ciH * 60 + ciM;
    return minutosActuales >= inicio && minutosActuales < fin;
  };

  const filteredMenuItems = menuItems.filter((item) => 
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.categoria && item.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((a, b) => a + b.calificacion, 0) / reviews.length).toFixed(1) 
    : null;

  return (
    <div className="min-h-screen w-full bg-[#0e2246] text-[#F2F2F0] flex flex-col font-sans selection:bg-[#163A70] selection:text-white">
      <Header />

      {/* --- NOTIFICACIÓN FLOTANTE (TOAST SOBRIO) --- */}
      {notification && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] animate-fade-in">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl backdrop-blur-md text-xs font-mono tracking-wider uppercase ${
            notification.type === 'success' 
              ? 'bg-[#071326]/95 border border-emerald-500/40 text-emerald-300' 
              : 'bg-[#071326]/95 border border-rose-500/40 text-rose-300'
          }`}>
            {notification.type === 'success' ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-3 text-neutral-400 hover:text-white cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <FiX size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PANTALLA DE CARGA (PRESERVANDO HEADER Y FOOTER)           */}
      {/* ========================================================= */}
      {loading ? (
        <main className="flex-grow pt-28 pb-28 px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto w-full animate-pulse">
          <div className="h-6 w-36 bg-white/[0.08] rounded mb-6" />
          <div className="h-14 w-2/3 bg-white/[0.1] rounded mb-4" />
          <div className="h-5 w-48 bg-white/[0.06] rounded mb-16" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-6">
              <div className="h-8 w-44 bg-white/[0.08] rounded mb-4" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="py-4 border-b border-white/[0.06] flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-white/[0.08] rounded" />
                    <div className="h-3 w-32 bg-white/[0.05] rounded" />
                  </div>
                  <div className="h-5 w-12 bg-white/[0.08] rounded" />
                </div>
              ))}
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="h-64 rounded-2xl bg-white/[0.06]" />
            </div>
          </div>
        </main>
      ) : !info ? (
        /* --- ESTADO 404 / NO ENCONTRADO --- */
        <main className="flex-grow flex flex-col items-center justify-center pt-32 pb-24 px-4 text-center max-w-lg mx-auto">
          <img src={BuhoCartel} alt="" className="w-36 h-36 object-contain opacity-80 mb-6 filter contrast-110" />
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-400 block mb-2 font-medium">404</span>
          <h1 className="font-display text-4xl sm:text-5xl text-[#F2F2F0] font-normal mb-3">
            Local no encontrado
          </h1>
          <p className="text-neutral-300 text-sm font-light mb-8 leading-relaxed">
            El identificador seleccionado no corresponde a ninguna cafetería registrada en el campus de la Universidad de Sonora.
          </p>
          <Link 
            to="/" 
            className="px-6 py-2.5 bg-white text-black text-xs font-mono uppercase tracking-wider rounded-full hover:bg-neutral-200 transition-colors font-medium"
          >
            Volver al Directorio
          </Link>
        </main>
      ) : (
        /* --- DETALLE PRINCIPAL DE LA CAFETERÍA --- */
        <>
          {/* HERO ATMOSFÉRICO DE LA CAFETERÍA */}
          <section className="relative w-full pt-28 pb-16 border-b border-white/[0.08] overflow-hidden">
            <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
              <img 
                src={info.imagen_url || defaultImage} 
                alt="" 
                className="w-full h-full object-cover opacity-25 filter contrast-115" 
                onError={(e) => { e.target.src = defaultImage; }} 
              />
              <div className="absolute inset-0 bg-[#0e2246]/50 mix-blend-multiply" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e2246] via-[#0e2246]/50 to-[#0e2246]/85" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0e2246] via-transparent to-[#0e2246]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 w-full pt-4">
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-neutral-300 hover:text-white transition-colors mb-6 font-medium"
              >
                <FiArrowLeft size={15} />
                <span>Directorio de Cafeterías</span>
              </Link>

              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3.5 mb-3.5">
                    {isCurrentlyOpen(info.hora_apertura, info.hora_cierre) ? (
                      <span className="font-mono text-sm tracking-[0.16em] uppercase font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-500/35 px-3.5 py-1.5 rounded-full flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        ABIERTO
                      </span>
                    ) : (
                      <span className="font-mono text-sm tracking-[0.16em] uppercase font-semibold text-rose-400 bg-rose-950/70 border border-rose-500/35 px-3.5 py-1.5 rounded-full flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        CERRADO
                      </span>
                    )}

                    {info.hora_apertura && info.hora_cierre && (
                      <>
                        <span className="text-white/20" aria-hidden="true">/</span>
                        <span className="font-mono text-sm text-neutral-200 font-medium">
                          {info.hora_apertura.slice(0, 5)} – {info.hora_cierre.slice(0, 5)}
                        </span>
                      </>
                    )}

                    {averageRating && (
                      <>
                        <span className="text-white/20" aria-hidden="true">/</span>
                        <span className="font-mono text-sm text-[#B39A3A] flex items-center gap-1.5">
                          <FaStar size={13} />
                          <strong className="text-white font-semibold">{averageRating}</strong>
                          <span className="text-neutral-300">({reviews.length} opiniones)</span>
                        </span>
                      </>
                    )}
                  </div>

                  <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-normal text-[#F2F2F0] tracking-tight leading-[1.05]">
                    {info.nombre}
                  </h1>

                  {info.direccion && (
                    <p className="font-mono text-sm uppercase tracking-[0.16em] text-neutral-200 mt-3.5 flex items-center gap-2 font-light">
                      <FiMapPin size={15} className="text-[#B39A3A]" />
                      <span>{info.direccion}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* CONTENIDO PRINCIPAL: MENÚ Y RESEÑAS */}
          <main className="flex-grow pt-14 pb-28 px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
              
              {/* COLUMNA PRINCIPAL (CARTA + OPINIONES) */}
              <div className="lg:col-span-8 space-y-16">
                
                {/* SECCIÓN: CARTA Y MENÚ */}
                <section aria-label="Carta de platillos">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-white/[0.08] pb-4 mb-8">
                    <div>
                      <span className="font-mono text-sm uppercase tracking-[0.2em] text-[#B39A3A] block mb-1.5 font-medium">
                        Carta Oficial
                      </span>
                      <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-[#F2F2F0]">
                        Menú del día
                      </h2>
                    </div>

                    {/* Buscador de platillo integrado */}
                    <div className="relative w-full sm:w-72 border-b border-white/20 pb-1.5 focus-within:border-[#B39A3A] transition-colors">
                      <label htmlFor="dish-search-input" className="sr-only">Buscar platillo en la carta</label>
                      <input 
                        id="dish-search-input"
                        type="text" 
                        placeholder="Buscar platillo..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full bg-transparent text-base text-neutral-100 placeholder-neutral-400 focus:outline-none pr-8" 
                      />
                      {searchTerm ? (
                        <button 
                          onClick={() => setSearchTerm("")} 
                          className="absolute right-0 top-1 text-neutral-400 hover:text-white cursor-pointer"
                          aria-label="Limpiar búsqueda de platillo"
                        >
                          <FiX size={16} />
                        </button>
                      ) : (
                        <FiSearch className="absolute right-0 top-1.5 text-neutral-400 pointer-events-none" size={16} />
                      )}
                    </div>
                  </div>

                  {/* Lista de Platillos */}
                  {filteredMenuItems.length === 0 ? (
                    <div className="py-16 text-center text-neutral-300 font-light space-y-2">
                      <p className="text-base sm:text-lg">
                        {searchTerm ? "No hay platillos coincidentes con el término ingresado." : "Carta de platillos en proceso de actualización."}
                      </p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="text-sm font-mono uppercase tracking-wider text-[#B39A3A] underline cursor-pointer font-medium"
                        >
                          Ver toda la carta
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.08]">
                      {filteredMenuItems.map((item, index) => (
                        <div 
                          key={item.id_menu || index} 
                          className="py-4.5 flex items-baseline justify-between gap-6 group hover:bg-white/[0.02] px-3.5 transition-colors rounded-xl"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-3 flex-wrap">
                              <h3 className="font-sans text-lg sm:text-xl font-medium text-[#F2F2F0] group-hover:text-white transition-colors">
                                {item.nombre}
                              </h3>
                              {item.categoria && (
                                <span className="font-mono text-xs uppercase tracking-wider text-neutral-200 bg-white/[0.08] px-2.5 py-1 rounded border border-white/[0.08] flex-shrink-0 font-medium">
                                  {item.categoria}
                                </span>
                              )}
                            </div>
                            {item.descripcion && (
                              <p className="text-sm sm:text-[15px] text-neutral-200 font-light mt-1.5 max-w-xl leading-relaxed">
                                {item.descripcion}
                              </p>
                            )}
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="font-mono text-lg sm:text-xl font-semibold text-[#B39A3A]">
                              ${parseFloat(item.precio).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* SECCIÓN: RESEÑAS Y OPINIONES */}
                <section className="pt-8 border-t border-white/[0.08]" aria-label="Opiniones de estudiantes">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8">
                    <div>
                      <span className="font-mono text-sm uppercase tracking-[0.2em] text-[#B39A3A] block mb-1.5 font-medium">
                        Comunidad Universitaria
                      </span>
                      <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-[#F2F2F0]">
                        Opiniones ({reviews.length})
                      </h2>
                    </div>
                    {averageRating && (
                      <span className="font-mono text-sm text-neutral-200">
                        Promedio general: <strong className="text-white font-semibold">{averageRating} / 5.0</strong>
                      </span>
                    )}
                  </div>

                  {/* Formulario de Reseña */}
                  <form onSubmit={handleSubmitResena} className="mb-12 p-6 sm:p-7 rounded-2xl bg-[#0a1830] border border-white/[0.08] shadow-lg">
                    <span className="font-mono text-sm uppercase tracking-wider text-[#B39A3A] block mb-3.5 font-semibold">
                      Comparte tu experiencia en este local
                    </span>

                    {/* Selector de Estrellas Accesible */}
                    <div className="flex items-center gap-1.5 mb-4" role="group" aria-label="Calificación en estrellas de 1 a 5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setRating(val)}
                          onMouseEnter={() => setHover(val)}
                          onMouseLeave={() => setHover(0)}
                          className="p-1 text-neutral-600 hover:text-[#B39A3A] transition-colors cursor-pointer focus:outline-none"
                          aria-label={`${val} estrellas`}
                        >
                          <FaStar 
                            size={24} 
                            className={val <= (hover || rating) ? "text-[#B39A3A]" : "text-neutral-600"} 
                          />
                        </button>
                      ))}
                      <span className="ml-3 font-mono text-sm text-neutral-200">
                        {rating > 0 ? `${rating} de 5 estrellas` : "Selecciona tu valoración"}
                      </span>
                    </div>

                    <label htmlFor="review-textarea" className="sr-only">Comentario sobre la cafetería</label>
                    <textarea 
                      id="review-textarea"
                      className="w-full p-4 bg-[#071326] text-[#F2F2F0] rounded-xl border border-white/[0.12] focus:border-[#B39A3A] focus:outline-none text-base placeholder-neutral-400 resize-none mb-4 font-sans leading-relaxed" 
                      rows="3" 
                      placeholder="Comenta sobre la calidad de los alimentos, atención, rapidez o precios..." 
                      value={comentario} 
                      onChange={(e) => setComentario(e.target.value)} 
                    />

                    <div className="flex justify-end">
                      <button 
                        type="submit" 
                        disabled={submitting} 
                        className="px-7 py-3 bg-white text-black font-sans text-sm font-mono uppercase tracking-wider rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer font-semibold"
                      >
                        {submitting ? "Publicando..." : "Publicar Reseña"}
                      </button>
                    </div>
                  </form>

                  {/* Lista de Reseñas */}
                  <div className="space-y-6">
                    {reviews.length === 0 ? (
                      <p className="text-center py-10 text-neutral-300 text-base font-light">
                        Aún no hay opiniones registradas para este establecimiento. Sé el primero en acreditar tu visita.
                      </p>
                    ) : (
                      reviews.map((review) => (
                        <article 
                          key={review.id_resena} 
                          className="py-5 border-b border-white/[0.08] last:border-none"
                        >
                          <div className="flex items-baseline justify-between gap-4 mb-2.5">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-[#163A70] flex items-center justify-center text-xs text-white">
                                <FiUser size={14} />
                              </div>
                              <span className="font-sans font-medium text-base text-white">
                                {review.nombre_usuario || "Estudiante UNISON"}
                              </span>
                              <div className="flex text-[#B39A3A] text-sm gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <FaStar 
                                    key={i} 
                                    className={i < review.calificacion ? "text-[#B39A3A]" : "text-neutral-700"} 
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="font-mono text-xs text-neutral-300">
                              {formatDate(review.fecha_registro)}
                            </span>
                          </div>
                          <p className="text-base text-neutral-200 font-light leading-relaxed pl-10">
                            {review.comentario}
                          </p>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              </div>

              {/* COLUMNA LATERAL (MAPA E INFORMACIÓN) */}
              <div className="lg:col-span-4 space-y-8">
                {info.latitud && info.longitud && (
                  <aside className="sticky top-28 space-y-6">
                    <div className="p-6 rounded-2xl bg-[#0a1830] border border-white/[0.08] shadow-lg">
                      <span className="font-mono text-sm uppercase tracking-[0.2em] text-[#B39A3A] block mb-4 font-semibold">
                        Ubicación en Campus
                      </span>

                      <div className="h-60 w-full rounded-xl overflow-hidden border border-white/[0.1] relative mb-4 leaflet-dark-tiles">
                        <MapContainer 
                          center={[parseFloat(info.latitud), parseFloat(info.longitud)]} 
                          zoom={17} 
                          style={{ height: "100%", width: "100%", background: "#071326" }} 
                          scrollWheelZoom={false}
                        >
                          <TileLayer 
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                          />
                          <Marker position={[parseFloat(info.latitud), parseFloat(info.longitud)]}>
                            <Popup>{info.nombre}</Popup>
                          </Marker>
                        </MapContainer>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="font-mono text-sm text-neutral-300">
                          Coordenadas registradas
                        </span>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${info.latitud},${info.longitud}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-sm font-mono text-[#B39A3A] hover:underline inline-flex items-center gap-1.5 font-semibold"
                        >
                          <span>Abrir GPS</span>
                          <FiExternalLink size={14} />
                        </a>
                      </div>
                    </div>

                    {/* Nota Institucional */}
                    <div className="p-6 rounded-2xl bg-[#0a1830]/60 border border-white/[0.06] text-sm text-neutral-200 font-light leading-relaxed">
                      <span className="font-mono text-xs uppercase tracking-wider text-[#B39A3A] block mb-2 font-semibold">
                        Aviso Institucional
                      </span>
                      Los horarios y cartas de platillos están sujetos al calendario oficial, periodo de exámenes y periodos vacacionales de la Universidad de Sonora.
                    </div>
                  </aside>
                )}
              </div>
            </div>
          </main>
        </>
      )}

      <Footer />
      <ChatWidget />
    </div>
  );
};

export default PlantillaCafeteria;