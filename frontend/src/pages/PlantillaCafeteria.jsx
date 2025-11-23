// src/pages/PlantillaCafeteria.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; 
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FaStar } from "react-icons/fa";
import { FiUser, FiMapPin, FiClock } from "react-icons/fi";
import ChatWidget from "../components/ChatWidget";
import defaultImage from "../assets/logo.png";

// --- MAPA (Leaflet) ---
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Configuración del icono por defecto de Leaflet
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Info Cafetería
        const resInfo = await fetch(`http://127.0.0.1:8000/api/Tienditas/${id}/`);
        if (!resInfo.ok) throw new Error("Cafetería no encontrada");
        const dataInfo = await resInfo.json();
        setInfo(dataInfo);

        // 2. Menú
        const resMenu = await fetch(`http://127.0.0.1:8000/api/Menus/?id_tiendita=${id}`);
        const dataMenu = await resMenu.json();
        setMenuItems(dataMenu);

        // 3. Reseñas
        fetchResenas();
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const fetchResenas = () => {
    fetch(`http://127.0.0.1:8000/api/Resenas/?id_tiendita=${id}`)
      .then(res => res.json())
      .then(data => setReviews(data))
      .catch(err => console.error(err));
  };

  const handleSubmitResena = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) return alert("Inicia sesión para comentar.");
    if (rating === 0) return alert("Califica con estrellas.");

    setSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/Resenas/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          id_tiendita: id,
          calificacion: rating,
          comentario: comentario
        })
      });
      if (res.ok) {
        alert("¡Reseña publicada!");
        setRating(0);
        setComentario("");
        fetchResenas();
      } else {
        alert("Error al publicar.");
      }
    } catch (error) { console.error(error); }
    finally { setSubmitting(false); }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("es-MX", { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) return <div className="min-h-screen w-full bg-[#141b2d] flex items-center justify-center text-white">Cargando...</div>;
  if (!info) return <div className="min-h-screen w-full bg-[#141b2d] flex items-center justify-center text-white">404 No encontrado</div>;

  return (
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      backgroundColor: "#141b2d", // Fondo Azul Nocturno (Estándar)
      color: "white",
      overflowX: "hidden"
    }}>
      <Header />

      <main style={{ flexGrow: 1, padding: "2rem", paddingTop: "7rem" }}>
        
        {/* TÍTULO E INFORMACIÓN */}
        <div className="text-center mb-6">
            <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
            {info.nombre}
            </h1>
            
            {/* AÑADIDO: Dirección y Horarios (Diseño sutil) */}
            <div className="flex flex-wrap justify-center gap-4 text-gray-300 text-sm">
                {info.direccion && (
                    <span className="flex items-center gap-1">
                        <FiMapPin className="text-yellow-500" /> {info.direccion}
                    </span>
                )}
                {info.hora_apertura && info.hora_cierre && (
                    <span className="flex items-center gap-1">
                        <FiClock className="text-green-400" /> {info.hora_apertura.slice(0,5)} - {info.hora_cierre.slice(0,5)}
                    </span>
                )}
            </div>
        </div>

        {/* FOTO PRINCIPAL */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
          <img 
            src={info.imagen_url || defaultImage} 
            alt={info.nombre} 
            style={{
              width: "100%", maxWidth: "800px", height: "auto", maxHeight: "500px",
              borderRadius: "0.75rem", boxShadow: "0 8px 20px rgba(0, 0, 0, 0.5)",
              objectFit: "cover"
            }}
            onError={(e) => { e.target.src = defaultImage; }}
          />
        </div>

        {/* AÑADIDO: MAPA DE UBICACIÓN */}
        {info.latitud && info.longitud && (
            <div style={{ maxWidth: "800px", margin: "0 auto 3rem auto" }}>
                <h3 className="text-center text-xl font-bold mb-4 text-white">Ubicación</h3>
                <div className="h-64 w-full rounded-xl overflow-hidden shadow-lg border border-white/10 z-0">
                    <MapContainer 
                        center={[info.latitud, info.longitud]} 
                        zoom={18} 
                        style={{ height: "100%", width: "100%", zIndex: 0 }}
                        scrollWheelZoom={false} // Para no atorar el scroll de la página
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap contributors'
                        />
                        <Marker position={[info.latitud, info.longitud]}>
                            <Popup>{info.nombre}</Popup>
                        </Marker>
                    </MapContainer>
                </div>
            </div>
        )}

        {/* MENÚ */}
        <h2 style={{ fontSize: "1.8rem", textAlign: "center", marginBottom: "1.5rem", color: "#FFD700" }}>Menú</h2>
        <div style={{
          maxWidth: "600px", margin: "0 auto 3rem auto",
          backgroundColor: "rgba(0, 0, 0, 0.25)", borderRadius: "1rem",
          padding: "1.5rem", backdropFilter: "blur(6px)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)"
        }}>
          {menuItems.length === 0 ? (
            <p style={{ textAlign: "center", color: "#aaa" }}>No hay menú disponible.</p>
          ) : (
            menuItems.map((item, index) => (
              <div key={index} style={{
                borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "0.75rem 0"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{item.nombre}</span>
                    <span style={{ color: "#4ade80", fontWeight: "bold", fontFamily: "monospace" }}>${parseFloat(item.precio).toFixed(2)}</span>
                </div>
                {/* AÑADIDO: Descripción Opcional */}
                {item.descripcion && (
                    <p style={{ fontSize: "0.85rem", color: "#bbb", marginTop: "0.25rem", fontStyle: "italic" }}>
                        {item.descripcion}
                    </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* RESEÑAS */}
        <div className="max-w-3xl mx-auto mt-12">
          <h2 className="text-2xl font-bold text-center mb-6 text-white">Opiniones <span className="text-yellow-500">({reviews.length})</span></h2>

          {/* Formulario */}
          <div className="bg-[#1e2538]/80 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-lg mb-8">
            <div className="flex gap-2 mb-4 justify-center">
              {[...Array(5)].map((_, index) => (
                  <FaStar key={index} size={30} 
                    color={index + 1 <= (hover || rating) ? "#FFD700" : "#374151"} 
                    onMouseEnter={() => setHover(index + 1)} onMouseLeave={() => setHover(0)} onClick={() => setRating(index + 1)} 
                    className="cursor-pointer transition-transform hover:scale-110"
                  />
              ))}
            </div>
            <textarea 
              className="w-full p-3 bg-[#141b2d] text-white rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none"
              rows="3" placeholder="¿Qué opinas?" value={comentario} onChange={(e) => setComentario(e.target.value)} 
            />
            <button onClick={handleSubmitResena} disabled={submitting} className="mt-4 w-full py-2 bg-yellow-500 text-[#141b2d] font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50">
                {submitting ? "Enviando..." : "Publicar Opinión"}
            </button>
          </div>

          {/* Lista */}
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id_resena} className="bg-[#1e2538]/60 p-4 rounded-lg border-l-4 border-yellow-500">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center"><FiUser /></div>
                    <div>
                      <p className="font-bold text-sm">{review.nombre_usuario || "Anónimo"}</p>
                      <div className="flex">{[...Array(5)].map((_, i) => <FaStar key={i} size={12} color={i < review.calificacion ? "#FFD700" : "#4b5563"} />)}</div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(review.fecha_registro)}</span>
                </div>
                <p className="text-gray-300 text-sm pl-10">{review.comentario}</p>
              </div>
            ))}
          </div>
        </div>

      </main>
      
      <ChatWidget />
      <Footer />
    </div>
  );
};

export default PlantillaCafeteria;