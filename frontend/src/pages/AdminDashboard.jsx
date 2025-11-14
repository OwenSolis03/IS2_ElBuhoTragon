// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";

const AdminDashboard = () => {
  const [cafeterias, setCafeterias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar las cafeterías desde el Backend
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/Tienditas/")
      .then((res) => res.json())
      .then((data) => {
        setCafeterias(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error cargando cafeterías:", err));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar esta cafetería?")) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/Tienditas/${id}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        }
      });

      if (res.ok) {
        setCafeterias(cafeterias.filter(c => c.id_tiendita !== id));
        alert("Cafetería eliminada");
      } else {
        alert("Error al eliminar");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    // --- LA SOLUCIÓN MAESTRA DE LAYOUT ---
    <div style={{
      margin: 0,
      padding: 0,
      width: "100vw", 
      minHeight: "100vh",
      backgroundColor: "#141b2d", // Azul Nocturno
      backgroundSize: "100% 100%", 
      color: "white",
      paddingTop: "3.2rem", 
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflowX: "hidden",
      boxSizing: "border-box" 
    }}>
      <Header />

      {/* Main: Ocupa el ancho, pero centra el contenido con max-width */}
      <main style={{
        flexGrow: 1,
        padding: "2rem",
        paddingTop: "6rem",
        width: "100%",
        maxWidth: "1200px", // Limitamos el ancho del contenido para que no se desparrame
        margin: "0 auto",   // Centramos el bloque de contenido
        display: "flex",
        flexDirection: "column"
      }}>
        
        {/* Encabezado del Dashboard */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Panel de Administración</h1>
            <p className="text-gray-400 mt-1">Gestiona las cafeterías del campus</p>
          </div>
          
          <button className="bg-yellow-500 hover:bg-yellow-400 text-[#141b2d] font-bold py-2 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-transform transform hover:-translate-y-1">
            <FiPlus size={20} />
            Nueva Cafetería
          </button>
        </div>

        {/* Tabla de Gestión */}
        <div className="bg-[#1e2538] rounded-xl shadow-2xl border border-white/5 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#2a324a] text-gray-300 uppercase text-sm font-semibold">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Dirección / Ubicación</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">Cargando datos...</td>
                  </tr>
                ) : cafeterias.length === 0 ? (
                   <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">No hay cafeterías registradas.</td>
                  </tr>
                ) : (
                  cafeterias.map((cafe) => (
                  <tr key={cafe.id_tiendita} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-gray-400 font-mono">#{cafe.id_tiendita}</td>
                    <td className="px-6 py-4 font-medium text-white">{cafe.nombre}</td>
                    <td className="px-6 py-4 text-gray-300">{cafe.direccion || "Sin dirección"}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-3">
                        <button className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="Editar">
                          <FiEdit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(cafe.id_tiendita)}
                          className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-colors" 
                          title="Eliminar"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
          
          {/* Footer de tabla */}
          <div className="px-6 py-4 bg-[#2a324a] border-t border-white/5 text-sm text-gray-400 flex justify-between items-center">
            <span>Total: {cafeterias.length} cafeterías</span>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;