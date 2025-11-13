// src/components/CafeCard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const CafeCard = ({ name, image, path, isOpen = false }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(path)}
      className="
        bg-[#2a3558]/80 backdrop-blur-sm 
        rounded-none overflow-hidden 
        shadow-lg cursor-pointer 
        transition duration-300 ease-in-out 
        hover:shadow-xl hover:-translate-y-1 
        border border-white/10 
        text-white text-center
        flex flex-col h-full
      "
    >
      {/* Imagen de la cafetería */}
      <div className="h-40 w-full overflow-hidden">
        <img
          src={image}
          alt={`Imagen de ${name}`}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
      </div>

      {/* Contenido de la tarjeta */}
      <div className="p-4 flex flex-col flex-grow justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1 leading-tight">{name}</h3>
        </div>

        <p className="text-xs text-blue-300/80 mt-3 font-medium">
          Presione para ver el menú...
        </p>
      </div>
    </div>
  );
};

export default CafeCard;