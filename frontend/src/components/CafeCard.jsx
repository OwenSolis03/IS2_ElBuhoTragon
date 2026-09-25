// frontend/src/components/CafeCard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCheck, FiSearch } from "react-icons/fi";
import defaultImage from "../assets/logo.png";

/**
 * CafeCard — Tarjeta canónica en formato vertical 3:4 con foto a sangre
 * e indicadores integrados tipográficamente (Identidad V2).
 * 
 * Totalmente accesible vía teclado (Link semántico).
 */
const CafeCard = ({
  cafe,
  index = 0,
  isOpen = true,
  isVisited = false,
  facultadNombre = "",
  imageSrc,
  matchedDishes = []
}) => {
  const finalImage = imageSrc || cafe?.imagen_url || defaultImage;
  const path = `/cafeterias/${cafe.id_tiendita}`;
  
  const horario = cafe.hora_apertura && cafe.hora_cierre
    ? `${cafe.hora_apertura.slice(0, 5)} – ${cafe.hora_cierre.slice(0, 5)}`
    : "Horario regular";

  return (
    <Link
      to={path}
      aria-label={`Ver cafetería ${cafe.nombre}, ${isOpen ? "abierta" : "cerrada"}, horario ${horario}`}
      className="group relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#0a1830] border border-white/[0.08] hover:border-white/25 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] select-none flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-[#B39A3A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e2246] outline-none"
    >
      {/* Fotografía de fondo de borde a borde */}
      <img
        src={finalImage}
        alt=""
        loading="lazy"
        onError={(e) => {
          e.target.src = defaultImage;
        }}
        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
          isOpen ? "opacity-85 group-hover:opacity-95" : "grayscale-[35%] opacity-70 group-hover:opacity-80"
        }`}
      />

      {/* Degradados de legibilidad editorial (UNISON Navy) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e2246] via-[#0e2246]/50 to-transparent opacity-95 transition-opacity duration-300 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0e2246]/70 via-transparent to-transparent opacity-75 pointer-events-none" />

      {/* Cabecera superior interna: Estado, acreditación y número de catálogo */}
      <div className="relative z-10 p-5 sm:p-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isOpen ? (
            <span className="font-mono text-xs tracking-[0.16em] uppercase font-semibold text-emerald-400 flex items-center gap-2 bg-[#071326]/75 backdrop-blur-sm px-3 py-1.5 rounded-full border border-emerald-500/25">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              ABIERTO
            </span>
          ) : (
            <span className="font-mono text-xs tracking-[0.16em] uppercase font-semibold text-rose-400 flex items-center gap-2 bg-[#071326]/75 backdrop-blur-sm px-3 py-1.5 rounded-full border border-rose-500/25">
              <span className="w-2 h-2 rounded-full bg-rose-400/80 inline-block" />
              CERRADO
            </span>
          )}

          {isVisited && (
            <span className="font-mono text-xs tracking-wider uppercase text-emerald-300 bg-emerald-950/80 border border-emerald-500/35 px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm font-medium">
              <FiCheck size={12} className="text-emerald-400" />
              <span>Visitada</span>
            </span>
          )}
        </div>

        <span className="text-xs font-mono font-medium text-white/80 tracking-wider bg-[#071326]/60 backdrop-blur-sm px-2.5 py-1 rounded">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Bloque inferior: Facultad, Nombre, Coincidencias y Horario */}
      <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-end">
        {facultadNombre && (
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-300 mb-1.5 line-clamp-1 block font-medium">
            {facultadNombre}
          </span>
        )}

        <h3 className="font-display text-2xl sm:text-[28px] lg:text-[30px] font-normal text-[#F2F2F0] group-hover:text-white leading-[1.12] mb-2.5 line-clamp-2 transition-colors">
          {cafe.nombre}
        </h3>

        {/* Coincidencias de búsqueda en platillos */}
        {matchedDishes && matchedDishes.length > 0 && (
          <div className="mb-3.5 p-2.5 rounded-xl bg-[#071326]/95 border border-[#B39A3A]/35 text-left backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#B39A3A] uppercase tracking-wider mb-1">
              <FiSearch size={11} />
              <span>Platillo coincidente</span>
            </div>
            <p className="text-sm text-neutral-100 line-clamp-1 font-light">
              {matchedDishes.map((m) => m.nombre).join(", ")}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm font-mono text-neutral-200 pt-3 border-t border-white/[0.12]">
          <span className="tracking-tight text-neutral-200 font-medium">{horario}</span>
          <span className="text-xs text-[#B39A3A] group-hover:text-amber-300 transition-colors inline-flex items-center gap-1 font-semibold uppercase tracking-wider">
            <span>Carta</span>
            <FiArrowRight className="transform group-hover:translate-x-1 transition-transform" size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default CafeCard;