// src/components/CafeCard.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Importante

// Añadimos una prop opcional 'isOpen' para mostrar el estado
const CafeCard = ({ name, image, path, isOpen = false }) => {
  // Eliminamos el estado hover local, Tailwind lo maneja con prefijos hover:
  // const [hover, setHover] = useState(false);
  const navigate = useNavigate(); // Hook para navegar

  return (
    // ---- INICIO: Código Original Div Principal ----
    /*
    <div
      onClick={() => navigate(path)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        backdropFilter: "blur(4px)",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        borderRadius: "1rem",
        padding: "1rem",
        // width: "250px", // Quitamos ancho fijo, el grid lo maneja
        textAlign: "center",
        boxShadow: hover
          ? "0 8px 20px rgba(0,0,0,0.3)"
          : "0 4px 10px rgba(0,0,0,0.2)",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        transform: hover ? "translateY(-4px)" : "translateY(0)",
        cursor: "pointer",
        color: "white",
      }}
      className="cafeteria-card" // Esta clase no se usaba en index.css, la quitamos
    >
    */
    // ---- FIN: Código Original Div Principal ----

    // ---- INICIO: Código Modificado con TailwindCSS ----
    <div
      onClick={() => navigate(path)} // Redirección al hacer clic
      // Usamos clases de Tailwind para estilo y hover
      className="bg-[#2a3558]/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg cursor-pointer transition duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1 border border-white/10 text-white text-center"
    >
    {/* ---- FIN: Código Modificado con TailwindCSS ---- */}

      {/* ---- INICIO: Código Original Imagen ---- */}
      {/*
      <img
        src={image}
        alt={name}
        style={{
          width: "100%",
          height: "150px",
          objectFit: "cover",
          borderRadius: "0.75rem", // Redondeo dentro del padding
          marginBottom: "0.75rem",
        }}
      />
      */}
      {/* ---- FIN: Código Original Imagen ---- */}

      {/* ---- INICIO: Imagen Modificada con TailwindCSS ---- */}
      <img
        src={image} //
        alt={name} //
        // h-40 = 10rem (ajustar si es necesario)
        className="w-full h-40 object-cover" // Quitamos rounded y margin, el div padre tiene overflow-hidden
      />
      {/* ---- FIN: Imagen Modificada con TailwindCSS ---- */}


      {/* Contenedor para el texto con padding */}
      <div className="p-4">
        {/* ---- INICIO: Código Original Nombre ---- */}
        {/* <p style={{ fontSize: "1.1rem", fontWeight: "600" }}>{name}</p> */}
        {/* ---- FIN: Código Original Nombre ---- */}
        <p className="text-lg font-semibold mb-1">{name}</p>

        {/* ---- INICIO: Código Original Texto Inferior ---- */}
        {/*
        <p style={{
          fontSize: "0.9rem",
          marginTop: "0.5rem",
          color: "#60a5fa", // Color azul
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.3rem"
        }}>
          // El span interno tenía tamaño 1.2rem
          <span style={{ fontSize: "1.2rem" }}>Presione para ver el menú...</span>
        </p>
        */}
        {/* ---- FIN: Código Original Texto Inferior ---- */}

        {/* Texto "Abierto" / "Cerrado" (opcional, basado en prop) */}
        {/* <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${isOpen ? 'bg-green-600/80 text-green-100' : 'bg-red-600/80 text-red-100'}`}>
           {isOpen ? 'Abierto' : 'Cerrado'}
         </span> */}

        {/* Texto "Presione..." modificado */}
        <p className="text-xs text-gray-400 mt-2">
           Presione para ver el menú...
        </p>

      </div>
    </div>
  );
};

export default CafeCard;