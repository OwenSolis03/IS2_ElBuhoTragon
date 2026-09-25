// frontend/src/components/SkeletonCard.jsx
import React from "react";

/**
 * SkeletonCard — Esqueleto de carga con proporción 3:4 idéntica a CafeCard
 * para prevenir saltos de maquetación (Cumulative Layout Shift).
 */
const SkeletonCard = ({ count = 1 }) => {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#0a1830] border border-white/[0.06] p-5 flex flex-col justify-between animate-pulse"
        >
          {/* Cabecera simulada */}
          <div className="flex items-center justify-between">
            <div className="h-7 w-24 bg-white/[0.08] rounded-full" />
            <div className="h-5 w-8 bg-white/[0.06] rounded" />
          </div>

          {/* Bloque inferior simulado */}
          <div className="space-y-3">
            <div className="h-3.5 w-32 bg-white/[0.08] rounded" />
            <div className="h-8 w-4/5 bg-white/[0.12] rounded" />
            <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
              <div className="h-3.5 w-28 bg-white/[0.06] rounded" />
              <div className="h-3.5 w-14 bg-white/[0.08] rounded" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default SkeletonCard;
