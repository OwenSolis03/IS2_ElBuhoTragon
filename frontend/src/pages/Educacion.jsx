// src/pages/Educacion.jsx
import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import educacionImg from "../assets/tiendita_educacion.jpg";
import { FaStar } from "react-icons/fa"; // Importamos la estrella
import { FiUser } from "react-icons/fi"; // Icono de usuario para los comentarios

const Educacion = () => {
   const [menuItems, setMenuItems] = useState([]);
   const [loading, setLoading] = useState(true);

  // --- ESTADOS PARA RESEÑAS ---
  const [rating, setRating] = useState(0); 
  const [hover, setHover] = useState(0);   
  const [comentario, setComentario] = useState("");
  const [reviews, setReviews] = useState([
    // Datos simulados para probar la visualización
    { id: 1, usuario: "MaestroFeliz", estrellas: 5, texto: "¡Los burros están deliciosos y dan energía para calificar!", fecha: "15/11/2025" },
    { id: 2, usuario: "EstudianteAplicada", estrellas: 4, texto: "Es muy cómodo y siempre hay buen servicio.", fecha: "14/11/2025" }
  ]);
  // ---------------------------


  useEffect(() => {
    fetch("http://localhost:8000/api/Menus/?id_tiendita=3")
      .then(response => {
        if (!response.ok) throw new Error("Error al obtener el menú");
        return response.json();
      })
      .then(data => {
        setMenuItems(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error al cargar el menú:", error);
        setLoading(false);
      });
  }, []);
  
  // Manejar el envío de la reseña
  const handleSubmitResena = (e) => {
    e.preventDefault();

    const usuarioLogueado = localStorage.getItem("username");
    if (!usuarioLogueado) {
      alert("Debes iniciar sesión para comentar.");
      return;
    }
    if (rating === 0) {
      alert("Por favor califica con al menos 1 estrella.");
      return;
    }
    if (!comentario.trim()) {
      alert("Escribe un comentario.");
      return;
    }

    const nuevaResena = {
      id: Date.now(),
      usuario: usuarioLogueado,
      estrellas: rating,
      texto: comentario,
      fecha: new Date().toLocaleDateString()
    };

    // Agregar a la lista (Simulación)
    setReviews([nuevaResena, ...reviews]);
    
    setRating(0);
    setComentario("");
    alert("¡Reseña enviada!");
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
      // CORRECCIÓN DE ESTILO: Fondo uniforme #141b2d
      backgroundColor: "#141b2d",
      color: "white",
      overflowX: "hidden"
    }}>
      <Header />

      <main style={{ flexGrow: 1, padding: "2rem", paddingTop: "7rem" }}>
	<h1 style={{ fontSize: "2rem", fontWeight: "bold", textAlign: "center", marginBottom: "1rem" }}>
          Cafetería Educación
	</h1>
	<div style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "2rem"
	}}>
          <img src={educacionImg} alt="Cafetería Educación" style={{
            width: "100%",
            maxWidth: "800px",
            height: "auto",
            borderRadius: "0.75rem",
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.5)",
            objectFit: "contain"
          }} />
	</div>

	{/* --- SECCIÓN DE MENÚ --- */}
	<h2 style={{ fontSize: "1.5rem", textAlign: "center", marginBottom: "1rem" }}>Menú</h2>
	<div style={{
          maxWidth: "600px",
          margin: "0 auto 3rem auto", // Margen abajo para separar de reseñas
          backgroundColor: "rgba(0, 0, 0, 0.25)",
          borderRadius: "1rem",
          padding: "1.5rem",
          backdropFilter: "blur(6px)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)"
	}}>
          {menuItems.map((item, index) => (
            <div key={index} style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              padding: "0.5rem 0"
            }}>
              <span>{item.nombre}</span>
              <span>${item.precio}</span>
            </div>
          ))}
	</div>
    
        {/* --- NUEVA SECCIÓN: RESEÑAS --- */}
        <div className="max-w-3xl mx-auto mt-12">
          <h2 className="text-2xl font-bold text-center mb-6 text-yellow-500">Opiniones de la Comunidad</h2>

          {/* Formulario de Reseña */}
          <div className="bg-[#1e2538]/80 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-lg mb-8">
            <h3 className="text-lg font-semibold mb-4">Deja tu reseña</h3>
            
            {/* Estrellas Interactivas */}
            <div className="flex gap-2 mb-4">
              {[...Array(5)].map((_, index) => {
                const ratingValue = index + 1;
                return (
                  <label key={index} className="cursor-pointer">
                    <input 
                      type="radio" 
                      className="hidden" 
                      value={ratingValue} 
                      onClick={() => setRating(ratingValue)}
                    />
                    <FaStar 
                      size={35} 
                      color={ratingValue <= (hover || rating) ? "#FFD700" : "#5a6a8a"} 
                      onMouseEnter={() => setHover(ratingValue)}
                      onMouseLeave={() => setHover(0)}
                      className="transition-all duration-200 transform hover:scale-110" 
                    />
                  </label>
                );
              })}
              <span className="ml-3 text-sm text-gray-400 self-center">
                {rating > 0 ? `${rating} de 5 estrellas` : "Selecciona una calificación"}
              </span>
            </div>

            {/* Caja de Texto */}
            <textarea
              className="w-full p-3 bg-[#141b2d] text-white rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none"
              rows="3"
              placeholder="¿Qué te pareció la comida y el servicio?"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />

            <button 
              onClick={handleSubmitResena}
              className="mt-4 px-6 py-2 bg-yellow-500 text-[#141b2d] font-bold rounded-lg hover:bg-yellow-400 transition-transform transform hover:-translate-y-0.5"
            >
              Publicar Reseña
            </button>
          </div>

          {/* Lista de Reseñas Anteriores */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-center text-gray-400">Aún no hay reseñas. ¡Sé el primero!</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="bg-[#1e2538]/60 p-4 rounded-lg border-l-4 border-yellow-500">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
                        <FiUser className="text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{review.usuario}</p>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <FaStar key={i} size={14} color={i < review.estrellas ? "#FFD700" : "#5a6a8a"} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{review.fecha}</span>
                  </div>
                  <p className="text-gray-300 text-sm pl-10">{review.texto}</p>
                </div>
              ))
            )}
          </div>

        </div>
        {/* --- FIN SECCIÓN RESEÑAS --- */}
      </main>

      <Footer />
    </div>
  );
};

export default Educacion;