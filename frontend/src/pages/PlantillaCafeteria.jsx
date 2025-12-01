// src/pages/PlantillaCafeteria.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom"; 
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FaStar } from "react-icons/fa";
import { FiUser, FiMapPin, FiClock, FiSearch, FiMessageSquare, FiCheckCircle, FiAlertCircle, FiX } from "react-icons/fi";
import ChatWidget from "../components/ChatWidget";
import defaultImage from "../assets/logo.png";
import MenuIcon from "../assets/menu.png";
import BuhoZZZ from "../assets/zzz.png"; 
import BuhoCartel from "../assets/cartel.png"; 

// --- MAPA (Leaflet) ---
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

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

  // --- ESTADO PARA NOTIFICACIONES (TOASTS) ---
  const [notification, setNotification] = useState(null); // { message: "", type: "success" | "error" }

  // Función para mostrar notificaciones bonitas
  const showNotification = (message, type = "success") => {
      setNotification({ message, type });
      // Auto-ocultar después de 4 segundos
      setTimeout(() => {
          setNotification(null);
      }, 4000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resInfo = await fetch(`http://127.0.0.1:8000/api/Tienditas/${id}/`);
        if (!resInfo.ok) {
            setInfo(null);
            setLoading(false);
            return;
        }
        const dataInfo = await resInfo.json();
        setInfo(dataInfo);

        const resMenu = await fetch(`http://127.0.0.1:8000/api/Menus/?id_tiendita=${id}`);
        const dataMenu = await resMenu.json();
        setMenuItems(dataMenu);

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
    
    // VALIDACIONES CON TOAST
    if (!token) return showNotification("Debes iniciar sesión para comentar.", "error");
    if (rating === 0) return showNotification("Por favor, califica con estrellas.", "error");

    setSubmitting(true);

    let userId = null;
    try {
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        userId = decodedPayload.user_id; 
    } catch (err) {
        console.error("Error token:", err);
        showNotification("Tu sesión no es válida. Inicia sesión de nuevo.", "error");
        setSubmitting(false);
        return;
    }

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
          comentario: comentario,
          id_usuario: userId 
        })
      });

      if (res.ok) {
        showNotification("¡Reseña publicada con éxito!", "success");
        setRating(0);
        setComentario("");
        fetchResenas();
      } else {
        if (res.status === 401) {
            localStorage.clear(); 
            window.dispatchEvent(new Event("storage")); 
            showNotification("Sesión expirada. Redirigiendo...", "error");
            setTimeout(() => window.location.href = "/login", 2000);
            return;
        }
        const errorData = await res.json();
        showNotification(`Error: ${JSON.stringify(errorData)}`, "error");
      }
    } catch (error) { 
        console.error(error); 
        showNotification("Error de conexión con el servidor.", "error");
    }
    finally { setSubmitting(false); }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("es-MX", { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const filteredMenuItems = menuItems.filter(item => 
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- 1. PANTALLA DE CARGA ---
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#141b2d] flex flex-col items-center justify-center text-white">
        <div className="animate-pulse">
          <img src={BuhoZZZ} alt="Cargando..." className="w-48 h-48 object-contain drop-shadow-2xl"/>
        </div>
        <h2 className="text-2xl font-bold text-yellow-500 mt-8 animate-pulse tracking-wide">
          Preparando el menú...
        </h2>
        <p className="text-gray-400 text-sm mt-2 font-medium">El búho está despertando.</p>
      </div>
    );
  }
  
  // --- 2. PANTALLA 404 ---
  if (!info) {
      return (
        <div style={{minHeight: "100vh", width: "100vw", display: "flex", flexDirection: "column", backgroundColor: "#141b2d", color: "white", overflowX: "hidden"}}>
            <Header />
            <main className="flex-grow flex flex-col items-center justify-center pt-20 pb-12">
                <div className="relative w-72 md:w-96 animate-float mb-8">
                    <img src={BuhoCartel} alt="No encontrado" className="w-full h-auto object-contain drop-shadow-2xl" />
                    <div className="absolute top-[55%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[65%] text-center rotate-1">
                        <h1 className="text-[#3e2723] font-black text-4xl font-serif tracking-tighter opacity-90">404</h1>
                        <p className="text-[#5d4037] font-bold text-sm leading-tight mt-1 font-serif">¡Esta cafetería no existe!</p>
                    </div>
                </div>
                <div className="text-center px-4">
                    <p className="text-gray-400 max-w-md mx-auto mb-6">Parece que el ID de la cafetería es incorrecto o fue eliminada.</p>
                    <Link to="/"><button className="px-8 py-3 bg-yellow-500 text-[#141b2d] font-bold rounded-full shadow-lg hover:bg-yellow-400 hover:scale-105 transition-all">Regresar al Inicio</button></Link>
                </div>
            </main>
            <Footer />
            <style jsx>{` @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } } .animate-float { animation: float 4s ease-in-out infinite; } `}</style>
        </div>
      );
  }

  // --- 3. VISTA PRINCIPAL ---
  return (
    <div style={{
        minHeight: "100vh",
        width: "100vw",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#141b2d",
        color: "white",
        overflowX: "hidden",
        position: "relative"
    }}>
      <Header />

      {/* --- NOTIFICACIÓN FLOTANTE (TOAST) --- */}
      {notification && (
          <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce-in">
              <div className={`
                  flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border
                  ${notification.type === 'success' 
                      ? 'bg-[#1e2538] border-green-500 text-green-400' 
                      : 'bg-[#1e2538] border-red-500 text-red-400'}
              `}>
                  {notification.type === 'success' ? <FiCheckCircle size={24} /> : <FiAlertCircle size={24} />}
                  <div>
                      <h4 className="font-bold text-sm uppercase tracking-wider text-white">
                          {notification.type === 'success' ? 'Éxito' : 'Error'}
                      </h4>
                      <p className="text-sm font-medium text-gray-300">{notification.message}</p>
                  </div>
                  <button onClick={() => setNotification(null)} className="ml-4 text-gray-500 hover:text-white">
                      <FiX />
                  </button>
              </div>
          </div>
      )}

      <main className="flex-grow pt-28 pb-12 px-4 md:px-8 lg:px-16 w-full max-w-7xl mx-auto z-10">
        
        {/* --- ENCABEZADO --- */}
        <div className="relative mb-8 rounded-3xl overflow-hidden shadow-2xl border border-white/10 group bg-[#1e2538]">
             <div className="h-64 md:h-80 w-full relative">
                <img src={info.imagen_url || defaultImage} alt={info.nombre} className="w-full h-full object-cover" onError={(e) => { e.target.src = defaultImage; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141b2d] via-[#141b2d]/60 to-transparent"></div>
             </div>
             <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 drop-shadow-lg tracking-tight">{info.nombre}</h1>
                    <div className="flex flex-wrap gap-4 text-sm md:text-base font-medium text-gray-200">
                        {info.direccion && (<span className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10"><FiMapPin className="text-yellow-500" /> {info.direccion}</span>)}
                        {info.hora_apertura && info.hora_cierre && (<span className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10"><FiClock className="text-green-400" /> {info.hora_apertura.slice(0,5)} - {info.hora_cierre.slice(0,5)}</span>)}
                    </div>
                </div>
                <div className="bg-yellow-500 text-[#141b2d] px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg">
                    <FaStar /> 
                    <span>{reviews.length > 0 ? (reviews.reduce((a,b) => a + b.calificacion, 0) / reviews.length).toFixed(1) : "N/A"}</span>
                    <span className="text-xs font-normal opacity-80">({reviews.length} ops)</span>
                </div>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* --- MENÚ --- */}
                <div className="bg-[#1e2538]/80 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3"><img src={MenuIcon} alt="Menú" className="w-8 h-8 object-contain drop-shadow-sm" />Menú del Día</h2>
                        <div className="relative w-full sm:w-64">
                            <input type="text" placeholder="Buscar platillo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[#141b2d] border border-gray-600 rounded-full focus:outline-none focus:ring-1 focus:ring-yellow-500 text-sm transition-all text-gray-200" />
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                    </div>
                    <div className="relative group/scroll">
                        <div className="grid grid-rows-2 grid-flow-col gap-4 overflow-x-auto pb-4 custom-scrollbar">
                            {filteredMenuItems.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 w-full col-span-full row-span-2 flex flex-col items-center justify-center">
                                    <p className="text-lg font-medium">{searchTerm ? "No encontramos ese platillo" : "Menú no disponible"}</p>
                                </div>
                            ) : (
                                filteredMenuItems.map((item, index) => (
                                    <div key={index} className="w-[250px] bg-[#141b2d]/60 p-4 rounded-xl border border-white/5 hover:border-yellow-500/40 transition-all hover:bg-[#141b2d] flex flex-col justify-between h-[140px]">
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-gray-100 text-sm leading-tight line-clamp-1" title={item.nombre}>{item.nombre}</h3>
                                                <span className="bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded text-xs font-mono font-bold whitespace-nowrap ml-2">${parseFloat(item.precio).toFixed(0)}</span>
                                            </div>
                                            {item.descripcion && (<p className="text-xs text-gray-400 italic leading-snug line-clamp-2">{item.descripcion}</p>)}
                                        </div>
                                        <button className="mt-auto w-full py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-500 border border-yellow-500/30 rounded hover:bg-yellow-500/10 transition-colors">Recomendar</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* --- RESEÑAS --- */}
                <div className="bg-[#1e2538]/80 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4"><FiMessageSquare className="text-yellow-500" /> Opiniones de la comunidad</h2>
                    <div className="bg-[#141b2d]/50 p-4 rounded-xl border border-white/5 mb-8">
                        <p className="text-sm text-gray-400 mb-3 text-center">Comparte tu experiencia</p>
                        <div className="flex justify-center gap-2 mb-4">
                             {[...Array(5)].map((_, index) => (
                                <FaStar key={index} size={24} className={`cursor-pointer transition-transform hover:scale-110 ${index + 1 <= (hover || rating) ? "text-yellow-400" : "text-gray-600"}`} onMouseEnter={() => setHover(index + 1)} onMouseLeave={() => setHover(0)} onClick={() => setRating(index + 1)} />
                             ))}
                        </div>
                        <textarea className="w-full p-3 bg-[#1e2538] text-white rounded-lg border border-gray-600 focus:border-yellow-500 focus:outline-none text-sm resize-none mb-3" rows="2" placeholder="¿Qué tal estuvo la comida?" value={comentario} onChange={(e) => setComentario(e.target.value)} />
                        <button onClick={handleSubmitResena} disabled={submitting} className="w-full py-2 bg-yellow-500 text-[#141b2d] font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 text-sm transition-colors shadow-lg">{submitting ? "Publicando..." : "Publicar Reseña"}</button>
                    </div>
                    <div className="space-y-4">
                        {reviews.length === 0 ? (
                            <p className="text-center text-gray-500 text-sm">Sé el primero en opinar.</p>
                        ) : (
                            reviews.map((review) => (
                                <div key={review.id_resena} className="border-b border-white/5 pb-4 last:border-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white border border-white/10"><FiUser /></div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-200">{review.nombre_usuario || "Anónimo"}</p>
                                                <div className="flex text-yellow-500 text-[10px]">{[...Array(5)].map((_, i) => <FaStar key={i} className={i < review.calificacion ? "" : "text-gray-700"} />)}</div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-500">{formatDate(review.fecha_registro)}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm pl-10 leading-relaxed">{review.comentario}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* COLUMNA DERECHA (Mapa) */}
            <div className="lg:col-span-1 space-y-8">
                {info.latitud && info.longitud && (
                    <div className="bg-[#1e2538]/80 backdrop-blur-lg border border-white/10 rounded-2xl shadow-xl overflow-hidden sticky top-24">
                        <div className="bg-[#141b2d] p-3 border-b border-white/5"><h3 className="text-center text-sm font-bold text-gray-300 uppercase tracking-wider">Ubicación Exacta</h3></div>
                        <div className="h-64 w-full z-0 relative">
                            <MapContainer center={[info.latitud, info.longitud]} zoom={17} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
                                <Marker position={[info.latitud, info.longitud]}><Popup>{info.nombre}</Popup></Marker>
                            </MapContainer>
                            <a href={`https://www.google.com/maps/search/?api=1&query=${info.latitud},${info.longitud}`} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 z-[400] bg-white text-black text-xs px-2 py-1 rounded shadow font-bold hover:bg-gray-200">Abrir GPS ↗</a>
                        </div>
                        <div className="p-4 bg-[#141b2d]">
                             <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                                <h3 className="font-bold text-yellow-500 mb-2 flex items-center gap-2 text-sm">Tip del Búho</h3>
                                <p className="text-xs text-yellow-100/70 leading-relaxed">Recuerda que los horarios pueden variar en días festivos o periodos vacacionales. ¡Siempre revisa el estado en tiempo real en la página principal!</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>
      <ChatWidget />
      <Footer />
      <style jsx>{` 
        .custom-scrollbar::-webkit-scrollbar { height: 8px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(234, 179, 8, 0.5); } 
        
        /* Animación de entrada suave para el Toast */
        @keyframes bounceIn {
            0% { transform: translate(-50%, -100%); opacity: 0; }
            60% { transform: translate(-50%, 10%); opacity: 1; }
            100% { transform: translate(-50%, 0); }
        }
        .animate-bounce-in {
            animation: bounceIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default PlantillaCafeteria;