// src/pages/PlantillaCafeteria.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // Hook para leer el ID de la URL
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FaStar } from "react-icons/fa";
import { FiUser, FiMapPin } from "react-icons/fi";
import ChatWidget from "../components/ChatWidget";

// Imagen por defecto si no hay foto
import defaultImage from "../assets/logo.png"; 

const PlantillaCafeteria = () => {
  const { id } = useParams(); // Obtiene el ID de la URL (ej: /cafeterias/7 -> id = 7)
  
  const [info, setInfo] = useState(null); // Datos de la tiendita (Nombre, Foto, Ubicación)
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para el formulario de reseñas
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1. CARGAR DATOS AL INICIAR
  useEffect(() => {
    const fetchData = async () => {
      try {
        // A) Cargar Info General (Nombre, Foto, Mapa)
        const resInfo = await fetch(`http://127.0.0.1:8000/api/Tienditas/${id}/`);
        if (!resInfo.ok) throw new Error("Cafetería no encontrada");
        const dataInfo = await resInfo.json();
        setInfo(dataInfo);

        // B) Cargar Menú
        const resMenu = await fetch(`http://127.0.0.1:8000/api/Menus/?id_tiendita=${id}`);
        const dataMenu = await resMenu.json();
        setMenuItems(dataMenu);

        // C) Cargar Reseñas
        fetchResenas();
        
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };

    fetchData();
  }, [id]); // Se ejecuta cada vez que cambia el ID

  const fetchResenas = () => {
    fetch(`http://127.0.0.1:8000/api/Resenas/?id_tiendita=${id}`)
      .then(res => res.json())
      .then(data => setReviews(data))
      .catch(err => console.error(err));
  };

  // 2. ENVIAR RESEÑA
  const handleSubmitResena = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");

    if (!token) return alert("Inicia sesión para comentar.");
    if (rating === 0) return alert("Califica con estrellas.");
    if (!comentario.trim()) return alert("Escribe un comentario.");

    setSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/Resenas/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          id_tiendita: id, // Usamos el ID dinámico
          calificacion: rating,
          comentario: comentario
        })
      });

      if (res.ok) {
        alert("¡Reseña publicada!");
        setRating(0);
        setComentario("");
        fetchResenas(); // Recargar lista
      } else {
        alert("Error al publicar.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Formatear Fecha
  const formatDate = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("es-MX", {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#141b2d] flex items-center justify-center text-white">
        <p className="text-xl animate-pulse">Cargando cafetería...</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen w-full bg-[#141b2d] flex flex-col items-center justify-center text-white">
        <Header />
        <h1 className="text-3xl font-bold mb-4">404</h1>
        <p>Cafetería no encontrada.</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#141b2d", // Tu azul oficial
      color: "white",
      overflowX: "hidden"
    }}>
      <Header />

      <main style={{ flexGrow: 1, padding: "2rem", paddingTop: "7rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        
        {/* --- ENCABEZADO DE LA CAFETERÍA --- */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-white">{info.nombre}</h1>
          {info.direccion && (
            <p className="text-gray-400 flex items-center justify-center gap-2">
              <FiMapPin className="text-yellow-500" /> {info.direccion}
            </p>
          )}
        </div>

        {/* --- FOTO PRINCIPAL --- */}
        <div className="flex justify-center mb-10">
          <div className="relative w-full max-w-3xl h-64 sm:h-96 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
            <img 
              src={info.imagen_url || defaultImage} 
              alt={info.nombre} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => { e.target.src = defaultImage; }} // Fallback si la imagen falla
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141b2d] via-transparent to-transparent opacity-60"></div>
          </div>
        </div>

        {/* --- MENÚ --- */}
        <div className="max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-6 text-yellow-500 border-b border-white/10 pb-2">
            Menú del Día
          </h2>
          
          <div className="bg-[#1e2538]/50 backdrop-blur-sm rounded-xl p-6 border border-white/5 shadow-lg">
            {menuItems.length === 0 ? (
              <p className="text-center text-gray-400 italic">No hay menú disponible por el momento.</p>
            ) : (
              <ul className="space-y-4">
                {menuItems.map((item) => (
                  <li key={item.id_menu} className="flex justify-between items-start border-b border-white/5 pb-3 last:border-0">
                    <div>
                      <span className="font-bold text-lg block">{item.nombre}</span>
                      {item.descripcion && <span className="text-sm text-gray-400">{item.descripcion}</span>}
                    </div>
                    <span className="text-green-400 font-mono font-bold text-lg">
                      ${parseFloat(item.precio).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* --- RESEÑAS --- */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6 text-white">
            Opiniones <span className="text-yellow-500">({reviews.length})</span>
          </h2>

          {/* Formulario */}
          <div className="bg-[#1e2538] p-6 rounded-xl border border-white/10 mb-8 shadow-lg">
            <p className="text-sm text-gray-400 mb-3 uppercase font-bold tracking-wider">Calificar experiencia</p>
            
            <div className="flex gap-2 mb-4">
              {[...Array(5)].map((_, index) => {
                const ratingValue = index + 1;
                return (
                  <label key={index} className="cursor-pointer">
                    <input type="radio" className="hidden" onClick={() => setRating(ratingValue)} />
                    <FaStar 
                      size={30} 
                      color={ratingValue <= (hover || rating) ? "#FFD700" : "#374151"} 
                      onMouseEnter={() => setHover(ratingValue)}
                      onMouseLeave={() => setHover(0)}
                      className="transition-transform hover:scale-110"
                    />
                  </label>
                );
              })}
            </div>

            <textarea
              className="w-full p-3 bg-[#141b2d] text-white rounded-lg border border-white/10 focus:border-yellow-500 outline-none resize-none"
              rows="3"
              placeholder="¿Qué te pareció la comida?"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />

            <button 
              onClick={handleSubmitResena}
              disabled={submitting}
              className="mt-4 px-6 py-2 bg-yellow-500 text-[#141b2d] font-bold rounded-lg hover:bg-yellow-400 w-full sm:w-auto disabled:opacity-50"
            >
              {submitting ? "Enviando..." : "Publicar Opinión"}
            </button>
          </div>

          {/* Lista */}
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id_resena} className="bg-[#1e2538]/40 p-4 rounded-lg border-l-4 border-yellow-500">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-900/50 rounded-full flex items-center justify-center">
                      <FiUser />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{review.nombre_usuario || "Anónimo"}</p>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} size={12} color={i < review.calificacion ? "#FFD700" : "#4b5563"} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(review.fecha_registro)}</span>
                </div>
                <p className="text-gray-300 text-sm pl-11">{review.comentario}</p>
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