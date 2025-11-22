// src/pages/Cafeterias.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

// Imágenes (Importalas todas aquí para el mapeo)
import tiendaDerecho1 from "../assets/tienda_derecho1.jpg";
import tiendaDerecho2 from "../assets/tienda_derecho2.jpg";
import tiendaIngenieriaQuimica from "../assets/tienda_ingenieria-quimica.jpg";
import tiendaMedicina1 from "../assets/tienda_medicina1.jpg";
import tiendaMedicina2 from "../assets/tienda_medicina2.jpg";
import tiendaTrabajoSocial from "../assets/tienda_trabajo-social.jpg";
import Historia from "/Historia1Card.jpeg";
import tienditaEducacion from "../assets/tiendita_educacion.jpg";
import tiendaCivilMinas from "../assets/tienda_civil-arqui.jpg";
import Geologia from "/Cafeteria-Geologia1Card.jpeg";
import Matematicas from "/Matematicas1Card.png";
import Artes from "/Artes1Card.png";

const Cafeterias = () => {
  const [cafeterias, setCafeterias] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCafeterias = async () => {
      try {
        // Obtenemos la lista REAL de la base de datos
        const response = await fetch("http://127.0.0.1:8000/api/Tienditas/");
        const data = await response.json();
        setCafeterias(data);
      } catch (error) {
        console.error("Error fetching cafeterias:", error);
      }
    };
    fetchCafeterias();
  }, []);

  // Función auxiliar para asignar imagen según el ID o Nombre
  const getCafeteriaImage = (nombre) => {
    const imagenes = {
      "Cafeteria Derecho": tiendaDerecho1,
      "Cafeteria Derecho 2": tiendaDerecho2,
      "Cafeteria de Trabajo Social": tiendaTrabajoSocial,
      "Cafeteria Historia/Sociologia": Historia,
      "Cafeteria Educacion": tienditaEducacion,
      "Cafeteria Medicina": tiendaMedicina1, // Ojo con los acentos en tu BD
      "Cafetería Medicina": tiendaMedicina1,
      "Cafetería Medicina 2": tiendaMedicina2,
      "Cafeteria Medicina 2": tiendaMedicina2,
      "Cafeteria Departemento de Ingenieria Quimica": tiendaIngenieriaQuimica,
      "Cafeteria Departemento de Ingenieria Industrial/Civil": tiendaCivilMinas,
      "Cafetería Matemáticas": Matematicas, 
      "Cafetería Geología": Geologia, 
      "Cafetería Artes": Artes, 
    };
    return imagenes[nombre] || tiendaDerecho1; // Imagen por defecto
  };

  return (
    <div style={{
        minHeight: "100vh",
        width: "100vw",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#141b2d", // Tu azul oficial
        color: "white",
        overflowX: "hidden",
    }}>
      <Header />

      <main style={{ flexGrow: 1, padding: "2rem", paddingTop: "7rem" }}>
        <h1 style={{ textAlign: "center", fontSize: "2rem", marginBottom: "2rem" }}>
          Lista de Cafeterías
        </h1>

        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            alignItems: "center",
        }}>
          {cafeterias.map((cafeteria) => (
            <div
              key={cafeteria.id_tiendita}
              // --- AQUÍ ESTÁ EL CAMBIO CLAVE ---
              // Navegamos usando el ID de la base de datos
              onClick={() => navigate(`/cafeterias/${cafeteria.id_tiendita}`)}
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                padding: "1rem",
                borderRadius: "1rem",
                width: "100%",
                maxWidth: "900px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                backdropFilter: "blur(6px)",
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
              }}
            >
              <img
                src={getCafeteriaImage(cafeteria.nombre)} 
                alt={cafeteria.nombre}
                style={{
                  width: "120px", height: "120px", objectFit: "cover",
                  borderRadius: "0.75rem", marginRight: "1.5rem",
                }}
              />
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{cafeteria.nombre}</h2>
                <p style={{ marginTop: "0.5rem", color: "#aaa" }}>
                   {cafeteria.direccion || "Ubicación pendiente"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cafeterias;