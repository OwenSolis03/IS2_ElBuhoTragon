// src/pages/Cafeterias.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatWidget from "../components/ChatWidget";
import CafeCard from "../components/CafeCard";
import SkeletonCard from "../components/SkeletonCard";
import { FiLock, FiAward, FiCheckCircle } from "react-icons/fi";
import BuhoCartel from "../assets/cartel.png";

// Fotos locales para respaldo
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
  14: CivilMinas
};

const Cafeterias = () => {
  const [cafeterias, setCafeterias] = useState([]);
  const [visitedIds, setVisitedIds] = useState([]);
  const [facultades, setFacultades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      const token = localStorage.getItem("access_token");
      const storedUser = localStorage.getItem("username");

      if (!token) {
        if (isMounted) {
          setIsLoggedIn(false);
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setIsLoggedIn(true);
        setUserName(storedUser || "Estudiante");
      }

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
      } catch (e) {
        console.error("Error al decodificar credencial:", e);
        if (isMounted) {
          setIsLoggedIn(false);
          setLoading(false);
        }
        return;
      }

      try {
        const [resCafes, resReviews, resFacus] = await Promise.all([
          fetch(`${API_URL}/api/Tienditas/`),
          fetch(`${API_URL}/api/Resenas/`),
          fetch(`${API_URL}/api/Facultades/`)
        ]);

        const cafesData = await resCafes.json();
        const reviewsData = await resReviews.json();
        const facusData = await resFacus.json();

        if (isMounted) {
          setCafeterias(cafesData);
          setFacultades(facusData);

          const myReviewedCafeIds = reviewsData
            .filter((r) => r.id_usuario === userId)
            .map((r) => r.id_tiendita);

          setVisitedIds([...new Set(myReviewedCafeIds)]);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error al cargar datos del pasaporte:", err);
        if (isMounted) setLoading(false);
      }
    };

    initData();
    return () => { isMounted = false; };
  }, []);

  const total = cafeterias.length;
  const count = visitedIds.length;
  const progress = total > 0 ? (count / total) * 100 : 0;

  let nivel = "Novato";
  if (progress > 0) nivel = "Iniciado";
  if (progress > 25) nivel = "Explorador";
  if (progress > 50) nivel = "Tragón Experto";
  if (progress > 90) nivel = "Leyenda del Campus";

  const facultadesMap = useMemo(() => {
    const map = {};
    facultades.forEach((f) => {
      map[f.id_facultad] = f.nombre;
    });
    return map;
  }, [facultades]);

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

  // --- VISTA: NO AUTENTICADO ---
  if (!loading && !isLoggedIn) {
    return (
      <div className="min-h-screen w-full bg-[#0e2246] text-[#F2F2F0] flex flex-col font-sans selection:bg-[#163A70] selection:text-white">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center pt-32 pb-24 px-4 text-center max-w-lg mx-auto">
          <img 
            src={BuhoCartel} 
            alt="" 
            className="w-40 h-40 object-contain opacity-85 mb-8 filter contrast-110" 
          />
          <span className="font-mono text-sm uppercase tracking-[0.22em] text-[#B39A3A] block mb-3 font-medium">
            Pasaporte Tragón · UNISON
          </span>
          <h1 className="font-display text-4xl sm:text-5xl text-[#F2F2F0] font-normal mb-3">
            Acceso Requerido
          </h1>
          <p className="text-neutral-200 text-base sm:text-lg font-light mb-8 leading-relaxed">
            Inicia sesión con tu cuenta universitaria para consultar tu historial de visitas, registrar opiniones y desbloquear tus avances en el campus.
          </p>
          <Link to="/login">
            <button className="px-7 py-3 bg-white text-black text-sm font-mono uppercase tracking-wider rounded-full hover:bg-neutral-200 transition-colors flex items-center gap-2 cursor-pointer font-semibold">
              <FiLock size={15} />
              <span>Iniciar Sesión</span>
            </button>
          </Link>
        </main>
        <Footer />
        <ChatWidget />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0e2246] text-[#F2F2F0] flex flex-col font-sans selection:bg-[#163A70] selection:text-white">
      <Header />

      <main className="flex-grow pt-28 pb-28 px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto w-full">
        {/* --- ENCABEZADO EDITORIAL DEL PASAPORTE --- */}
        <section className="mb-16 border-b border-white/[0.08] pb-12" aria-label="Resumen de avance del estudiante">
          <span className="font-mono text-sm uppercase tracking-[0.22em] text-[#B39A3A] block mb-2.5 font-medium">
            Registro Académico de Visitas
          </span>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h1 className="font-display text-4xl sm:text-6xl text-[#F2F2F0] font-normal tracking-tight mb-3">
                Pasaporte de {userName}
              </h1>
              <p className="text-neutral-200 text-base sm:text-lg font-light leading-relaxed">
                Acredita cada cafetería asistiendo al local y compartiendo una reseña verificada con la comunidad universitaria.
              </p>
            </div>

            {/* Resumen de Métricas */}
            <div className="flex items-center gap-6 sm:gap-8 text-sm font-mono text-neutral-200 bg-[#071326]/60 border border-white/[0.08] p-5 rounded-2xl backdrop-blur-sm">
              <div>
                <span className="text-neutral-400 uppercase tracking-widest text-xs block mb-1 font-medium">Rango</span>
                <strong className="text-[#B39A3A] text-lg sm:text-xl font-display font-medium flex items-center gap-1.5">
                  <FiAward size={16} />
                  {nivel}
                </strong>
              </div>
              <span className="text-white/20" aria-hidden="true">/</span>
              <div>
                <span className="text-neutral-400 uppercase tracking-widest text-xs block mb-1 font-medium">Conquistas</span>
                <strong className="text-white text-lg sm:text-xl font-mono font-medium">
                  {count} <span className="text-sm text-neutral-300 font-light">de {total}</span>
                </strong>
              </div>
              <span className="text-white/20" aria-hidden="true">/</span>
              <div>
                <span className="text-neutral-400 uppercase tracking-widest text-xs block mb-1 font-medium">Progreso</span>
                <strong className="text-emerald-400 text-lg sm:text-xl font-mono font-medium">{Math.round(progress)}%</strong>
              </div>
            </div>
          </div>

          {/* Barra Minimalista de Progreso */}
          <div className="mt-8 h-2 bg-white/[0.08] w-full rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-400 transition-all duration-700 ease-out" 
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Porcentaje de cafeterías visitadas"
            />
          </div>
        </section>

        {/* --- GALERÍA UNIFORME DE CAFETERÍAS --- */}
        <section aria-label="Catálogo del Pasaporte">
          <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-3 mb-10">
            <span className="font-mono text-sm sm:text-base uppercase tracking-[0.18em] text-neutral-200 font-semibold">
              Directorio Universitario ({cafeterias.length})
            </span>
            <span className="text-sm font-mono text-emerald-400 flex items-center gap-2 font-medium">
              <FiCheckCircle size={15} />
              <span>{count} acreditadas</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-7">
            {loading ? (
              <SkeletonCard count={8} />
            ) : (
              cafeterias.map((cafe, index) => {
                const isVisited = visitedIds.includes(cafe.id_tiendita);
                const isOpen = isCurrentlyOpen(cafe.hora_apertura, cafe.hora_cierre);
                return (
                  <CafeCard
                    key={cafe.id_tiendita}
                    cafe={cafe}
                    index={index}
                    isOpen={isOpen}
                    isVisited={isVisited}
                    facultadNombre={facultadesMap[cafe.id_facultad] || "UNISON"}
                    imageSrc={imagenesOriginales[cafe.id_tiendita]}
                  />
                );
              })
            )}
          </div>
        </section>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
};

export default Cafeterias;