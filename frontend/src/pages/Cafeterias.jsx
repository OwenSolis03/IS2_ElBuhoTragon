// src/pages/Cafeterias.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiCheckCircle, FiCircle, FiAward, FiMapPin, FiLock } from "react-icons/fi";
import BuhoChef from "../assets/chef.png"; 
import BuhoCartel from "../assets/cartel.png";
import defaultImage from "../assets/logo.png";

const Cafeterias = () => {
  const [cafeterias, setCafeterias] = useState([]);
  const [visitedIds, setVisitedIds] = useState([]); // IDs de cafeterías con reseña
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  
  const navigate = useNavigate();

  useEffect(() => {
    const initData = async () => {
      const token = localStorage.getItem("access_token");
      const storedUser = localStorage.getItem("username");

      if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);
      setUserName(storedUser || "Tragón");

      // 1. Decodificar ID de usuario del Token
      let userId = null;
      try {
        const payloadBase64 = token.split('.')[1];
        const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        userId = JSON.parse(jsonPayload).user_id;
      } catch (e) {
        console.error("Error token:", e);
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      try {
        // 2. Cargar Cafeterías y TODAS las Reseñas en paralelo
        const [resCafes, resReviews] = await Promise.all([
            fetch("http://127.0.0.1:8000/api/Tienditas/"),
            fetch("http://127.0.0.1:8000/api/Resenas/") 
        ]);

        const cafesData = await resCafes.json();
        const reviewsData = await resReviews.json();

        setCafeterias(cafesData);

        // 3. Filtrar reseñas del usuario actual
        // Buscamos qué cafeterías tienen al menos una reseña de este 'userId'
        const myReviewedCafeIds = reviewsData
            .filter(r => r.id_usuario === userId)
            .map(r => r.id_tiendita);
        
        // Eliminamos duplicados (Set) y guardamos
        setVisitedIds([...new Set(myReviewedCafeIds)]);
        
        setLoading(false);

      } catch (err) {
        console.error("Error cargando datos:", err);
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Calcular Nivel y Progreso
  const total = cafeterias.length;
  const count = visitedIds.length;
  const progress = total > 0 ? (count / total) * 100 : 0;

  let nivel = "Novato";
  let colorNivel = "text-gray-400";
  if (progress > 0) { nivel = "Iniciado"; colorNivel = "text-blue-400"; }
  if (progress > 25) { nivel = "Explorador"; colorNivel = "text-green-400"; }
  if (progress > 50) { nivel = "Tragón Experto"; colorNivel = "text-yellow-400"; }
  if (progress > 90) { nivel = "Leyenda del Campus"; colorNivel = "text-purple-400"; }

  // --- VISTA: NO LOGUEADO (Búho Cartel) ---
  if (!loading && !isLoggedIn) {
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
        }}>
            <Header />
            <main className="flex-grow flex flex-col items-center justify-center pt-20 pb-12 px-4">
                <div className="relative w-72 md:w-96 animate-float mb-8">
                    <img src={BuhoCartel} alt="Login Requerido" className="w-full h-auto object-contain drop-shadow-2xl" />
                    <div className="absolute top-[55%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[65%] text-center rotate-1">
                        <h1 className="text-[#3e2723] font-black text-2xl font-serif tracking-tighter opacity-90">
                            ACCESO DENEGADO
                        </h1>
                        <p className="text-[#5d4037] font-bold text-xs leading-tight mt-1 font-serif">
                            Identifícate para ver tu pasaporte.
                        </p>
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        Para rastrear tu progreso y ver qué cafeterías has conquistado, necesitas iniciar sesión.
                    </p>
                    <Link to="/login">
                        <button className="px-8 py-3 bg-yellow-500 text-[#141b2d] font-bold rounded-full shadow-lg hover:bg-yellow-400 hover:scale-105 transition-all flex items-center gap-2 mx-auto">
                            <FiLock /> Iniciar Sesión
                        </button>
                    </Link>
                </div>
            </main>
            <Footer />
            <style jsx>{` @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } } .animate-float { animation: float 4s ease-in-out infinite; } `}</style>
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
        backgroundColor: "#141b2d",
        color: "white",
        overflowX: "hidden",
    }}>
      <Header />

      <main className="flex-grow pt-28 pb-12 px-4 md:px-8 lg:px-16 w-full max-w-6xl mx-auto">
        
        {/* --- HEADER DEL PASAPORTE --- */}
        <div className="bg-[#1e2538]/60 backdrop-blur-lg border border-white/10 rounded-3xl p-8 mb-12 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden">
            
            {/* Barra de progreso */}
            <div className="absolute bottom-0 left-0 h-1.5 bg-gray-700 w-full">
                <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-green-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            <div className="relative group">
                <img src={BuhoChef} alt="Nivel" className="w-32 h-32 object-contain drop-shadow-[0_0_15px_rgba(234,179,8,0.4)] group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute -bottom-2 -right-2 bg-[#141b2d] text-white text-xs font-bold px-2 py-1 rounded-full border border-white/20">
                    {Math.round(progress)}%
                </div>
            </div>

            <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
                    Pasaporte de <span className="text-yellow-500">{userName}</span>
                </h1>
                <p className="text-gray-400 mb-4 text-sm">
                    Para marcar una cafetería como visitada, ¡ve y deja una reseña sincera!
                </p>
                
                <div className="inline-flex items-center gap-4 bg-[#141b2d] px-5 py-3 rounded-xl border border-white/5">
                    <FiAward className={colorNivel} size={32} />
                    <div className="text-left">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Rango Actual</p>
                        <p className={`font-extrabold text-xl ${colorNivel}`}>{nivel}</p>
                    </div>
                    <div className="h-10 w-px bg-white/10 mx-2"></div>
                    <div className="text-left">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Conquistas</p>
                        <p className="font-extrabold text-xl text-white">{count} <span className="text-sm text-gray-500 font-normal">/ {total}</span></p>
                    </div>
                </div>
            </div>
        </div>

        {/* --- GRID DE CAFETERÍAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cafeterias.map((cafe) => {
                const isVisited = visitedIds.includes(cafe.id_tiendita);
                return (
                    <div 
                        key={cafe.id_tiendita}
                        onClick={() => navigate(`/cafeterias/${cafe.id_tiendita}`)}
                        className={`
                            relative group cursor-pointer rounded-2xl overflow-hidden border transition-all duration-300 flex items-center p-4 gap-4
                            ${isVisited 
                                ? "bg-[#1e2538] border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.1)] hover:border-green-400" 
                                : "bg-[#1e2538]/40 border-white/5 hover:border-white/20 hover:bg-[#1e2538]/60"}
                        `}
                    >
                        {/* Estado: Visitado o Pendiente */}
                        <div className={`
                            absolute top-3 right-3 p-1.5 rounded-full 
                            ${isVisited ? "bg-green-500 text-[#141b2d]" : "bg-black/40 text-gray-500"}
                        `}>
                            {isVisited ? <FiCheckCircle size={18} /> : <FiCircle size={18} />}
                        </div>

                        <img 
                            src={cafe.imagen_url || defaultImage} 
                            alt={cafe.nombre}
                            className={`w-20 h-20 rounded-xl object-cover transition-all duration-500 ${isVisited ? "" : "grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100"}`}
                            onError={(e) => { e.target.src = defaultImage; }}
                        />
                        
                        <div className="flex-1 pr-6">
                            <h3 className={`font-bold text-sm mb-1 leading-tight ${isVisited ? "text-white" : "text-gray-400 group-hover:text-white"}`}>
                                {cafe.nombre}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                <FiMapPin size={10} />
                                <span className="truncate max-w-[120px]">{cafe.direccion || "Campus Central"}</span>
                            </div>
                            
                            {/* Call to Action dinámico */}
                            {isVisited ? (
                                <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">
                                    CONQUISTADA
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold text-yellow-500/70 group-hover:text-yellow-400 transition-colors flex items-center gap-1">
                                    Ir a opinar &rarr;
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default Cafeterias;