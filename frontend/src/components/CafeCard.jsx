// src/components/CafeCard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const CafeCard = ({ name, image, path, searchTerm, cafeteriaMenus }) => {
  const navigate = useNavigate();

  // Lógica para encontrar coincidencias de productos
  // Solo se ejecuta si hay algo escrito en el buscador y recibimos menús
  const matches = (searchTerm && cafeteriaMenus)
    ? cafeteriaMenus.filter(m => 
        m.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div
      onClick={() => navigate(path)}
      className="
        bg-[#27272a] /* Gris un poco más claro que el fondo */
        rounded-none overflow-hidden 
        shadow-md cursor-pointer 
        transition duration-300 ease-in-out 
        hover:shadow-2xl hover:-translate-y-1 hover:bg-[#323236] /* Ligeramente más claro al hover */
        border-b-2 border-transparent hover:border-yellow-500 /* Detalle premium: borde inferior amarillo al hover */
        text-gray-100 text-center
        flex flex-col h-full
        group
      "
    >
      {/* Imagen */}
      <div className="h-48 w-full overflow-hidden relative">
        <img
          src={image}
          alt={`Imagen de ${name}`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[20%] group-hover:grayscale-0"
        />
        {/* Overlay oscuro sutil sobre la imagen para unificar tonos */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300"></div>
      </div>

      {/* Contenido */}
      <div className="p-5 flex flex-col flex-grow justify-between">
        <div>
          <h3 className="text-lg font-bold mb-1 leading-tight text-gray-100 group-hover:text-yellow-400 transition-colors">
            {name}
          </h3>

          {/* --- SECCIÓN DE RESULTADOS DE BÚSQUEDA --- */}
          {matches.length > 0 && (
            <div className="mt-2 text-left">
              <span className="text-xs text-yellow-500 font-semibold block mb-1">
                Encontrado:
              </span>
              <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                {matches.map(m => m.nombre).join(", ")}
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-4 font-medium uppercase tracking-wider group-hover:text-gray-300 transition-colors">
          Ver menú
        </p>
      </div>
    </div>
  );
};

export default CafeCard;