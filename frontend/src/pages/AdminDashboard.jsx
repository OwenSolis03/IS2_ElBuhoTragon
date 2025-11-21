// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiPlus, FiEdit2, FiTrash2, FiX } from "react-icons/fi";

const AdminDashboard = () => {
  const [cafeterias, setCafeterias] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS DEL MODAL ---
  const [showModal, setShowModal] = useState(false);
  const [facultades, setFacultades] = useState([]);
  
  // --- ESTADOS DEL FORMULARIO ---
  const [newCafe, setNewCafe] = useState({
    nombre: "",
    direccion: "",
    id_facultad: "" // Guardaremos el ID de la facultad seleccionada
  });

  // Cargar Cafeterías y Facultades
  useEffect(() => {
    // Cargar Tienditas
    fetch("http://127.0.0.1:8000/api/Tienditas/")
      .then((res) => res.json())
      .then((data) => {
        setCafeterias(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error cargando cafeterías:", err));

    // Cargar Facultades (Para el select del formulario)
    fetch("http://127.0.0.1:8000/api/Facultades/")
      .then((res) => res.json())
      .then((data) => setFacultades(data))
      .catch((err) => console.error("Error cargando facultades:", err));
  }, []);

  // Manejar inputs del formulario
  const handleChange = (e) => {
    setNewCafe({
      ...newCafe,
      [e.target.name]: e.target.value
    });
  };

  // Enviar Nueva Cafetería
  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!newCafe.nombre || !newCafe.id_facultad) {
      alert("Por favor completa nombre y facultad");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/Tienditas/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "Authorization": `Bearer ${localStorage.getItem("access_token")}` // Descomentar si el backend pide token
        },
        body: JSON.stringify(newCafe)
      });

      if (res.ok) {
        const data = await res.json();
        setCafeterias([...cafeterias, data]); // Agregar a la lista
        setShowModal(false); // Cerrar modal
        setNewCafe({ nombre: "", direccion: "", id_facultad: "" }); // Limpiar form
        alert("Cafetería creada exitosamente");
      } else {
        alert("Error al crear cafetería");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Eliminar Cafetería
  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar esta cafetería?")) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/Tienditas/${id}/`, {
        method: "DELETE",
        // headers: { "Authorization": ... }
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
    <div style={{
      margin: 0,
      padding: 0,
      width: "100vw", 
      minHeight: "100vh",
      backgroundColor: "#141b2d",
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

      <main style={{
        flexGrow: 1,
        padding: "2rem",
        paddingTop: "6rem",
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column"
      }}>
        
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Panel de Administración</h1>
            <p className="text-gray-400 mt-1">Gestiona las cafeterías del campus</p>
          </div>
          
          <button 
            onClick={() => setShowModal(true)} // Abrir Modal
            className="bg-yellow-500 hover:bg-yellow-400 text-[#141b2d] font-bold py-2 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-transform transform hover:-translate-y-1"
          >
            <FiPlus size={20} />
            Nueva Cafetería
          </button>
        </div>

        {/* Tabla */}
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
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-400">Cargando datos...</td></tr>
                ) : cafeterias.length === 0 ? (
                   <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-400">No hay cafeterías registradas.</td></tr>
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
          
          <div className="px-6 py-4 bg-[#2a324a] border-t border-white/5 text-sm text-gray-400 flex justify-between items-center">
            <span>Total: {cafeterias.length} cafeterías</span>
          </div>
        </div>
      </main>

      <Footer />

      {/* --- MODAL DE CREACIÓN --- */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1e2538] w-full max-w-md rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-fade-in-up">
            
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#2a324a]">
              <h3 className="text-lg font-bold text-white">Nueva Cafetería</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  className="w-full p-2 bg-[#141b2d] border border-white/10 rounded text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                  value={newCafe.nombre}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  className="w-full p-2 bg-[#141b2d] border border-white/10 rounded text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                  value={newCafe.direccion}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Facultad</label>
                <select
                  name="id_facultad"
                  className="w-full p-2 bg-[#141b2d] border border-white/10 rounded text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                  value={newCafe.id_facultad}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecciona una facultad...</option>
                  {facultades.map(fac => (
                    <option key={fac.id_facultad} value={fac.id_facultad}>
                      {fac.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded text-gray-300 hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-[#141b2d] font-bold rounded hover:bg-yellow-400 transition-colors"
                >
                  Guardar Cafetería
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;