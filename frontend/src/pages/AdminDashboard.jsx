// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiImage, FiDollarSign, FiList } from "react-icons/fi";

const AdminDashboard = () => {
  const [cafeterias, setCafeterias] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS PARA MODALES ---
  const [showModal, setShowModal] = useState(false); // Crear
  const [showEditModal, setShowEditModal] = useState(false); // Editar
  const [activeTab, setActiveTab] = useState("info"); // "info" o "menu" dentro de editar

  const [facultades, setFacultades] = useState([]);
  
  // --- ESTADOS DEL FORMULARIO CREAR ---
  const [newCafe, setNewCafe] = useState({
    nombre: "",
    latitud: "",
    longitud: "",
    id_facultad: ""
  });

  // --- ESTADOS PARA EDICIÓN ---
  const [editingCafe, setEditingCafe] = useState(null);
  const [cafeMenu, setCafeMenu] = useState([]); // Menú de la cafetería que se está editando
  const [newMenuItem, setNewMenuItem] = useState({ nombre: "", precio: "", descripcion: "" }); // Nuevo platillo

  // Cargar datos iniciales
  useEffect(() => {
    fetchCafeterias();
    fetch("http://127.0.0.1:8000/api/Facultades/")
      .then((res) => res.json())
      .then((data) => setFacultades(data))
      .catch((err) => console.error("Error cargando facultades:", err));
  }, []);

  const fetchCafeterias = () => {
    fetch("http://127.0.0.1:8000/api/Tienditas/")
      .then((res) => res.json())
      .then((data) => {
        setCafeterias(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error cargando cafeterías:", err));
  };

  // --- LÓGICA DE CREACIÓN ---
  const handleChange = (e) => {
    setNewCafe({ ...newCafe, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCafe.nombre || !newCafe.id_facultad) return alert("Falta nombre o facultad");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/Tienditas/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCafe)
      });
      if (res.ok) {
        fetchCafeterias();
        setShowModal(false);
        setNewCafe({ nombre: "", latitud: "", longitud: "", id_facultad: "" });
        alert("Cafetería creada");
      }
    } catch (error) { console.error(error); }
  };

  // --- LÓGICA DE EDICIÓN ---
  const openEditModal = (cafe) => {
    setEditingCafe(cafe);
    setActiveTab("info"); // Siempre abrir en la pestaña de info
    setShowEditModal(true);
    // Cargar el menú de esta cafetería
    fetch(`http://127.0.0.1:8000/api/Menus/?id_tiendita=${cafe.id_tiendita}`)
      .then(res => res.json())
      .then(data => setCafeMenu(data));
  };

  // Convertir imagen local a Base64 para guardarla en el campo de texto
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingCafe({ ...editingCafe, imagen_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateCafe = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/Tienditas/${editingCafe.id_tiendita}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCafe)
      });
      if (res.ok) {
        alert("Datos actualizados correctamente");
        fetchCafeterias();
        setShowEditModal(false);
      }
    } catch (error) { console.error(error); }
  };

  // --- LÓGICA DE MENÚ (Dentro de Editar) ---
  const handleAddMenuItem = async () => {
    if (!newMenuItem.nombre || !newMenuItem.precio) return alert("Nombre y precio requeridos");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/Menus/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newMenuItem, id_tiendita: editingCafe.id_tiendita })
      });
      if (res.ok) {
        const item = await res.json();
        setCafeMenu([...cafeMenu, item]);
        setNewMenuItem({ nombre: "", precio: "", descripcion: "" });
      }
    } catch (error) { console.error(error); }
  };

  const handleDeleteMenuItem = async (id) => {
    if(!window.confirm("¿Borrar este platillo?")) return;
    await fetch(`http://127.0.0.1:8000/api/Menus/${id}/`, { method: "DELETE" });
    setCafeMenu(cafeMenu.filter(item => item.id_menu !== id));
  };

  // --- ELIMINAR CAFETERÍA ---
  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro? Se borrará la cafetería y su menú.")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/Tienditas/${id}/`, { method: "DELETE" });
      if (res.ok) {
        setCafeterias(cafeterias.filter(c => c.id_tiendita !== id));
        alert("Cafetería eliminada");
      }
    } catch (error) { console.error(error); }
  };

  return (
    <div style={{
      margin: 0, padding: 0, width: "100vw", minHeight: "100vh",
      backgroundColor: "#141b2d", backgroundSize: "100% 100%", 
      color: "white", paddingTop: "3.2rem", display: "flex", flexDirection: "column",
      position: "relative", overflowX: "hidden", boxSizing: "border-box" 
    }}>
      <Header />

      <main style={{
        flexGrow: 1, padding: "2rem", paddingTop: "6rem", width: "100%",
        maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column"
      }}>
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Panel de Administración</h1>
            <p className="text-gray-400 mt-1">Gestiona las cafeterías del campus</p>
          </div>
          
          <button 
            onClick={() => setShowModal(true)} 
            className="bg-yellow-500 hover:bg-yellow-400 text-[#141b2d] font-bold py-2 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-transform transform hover:-translate-y-1"
          >
            <FiPlus size={20} /> Nueva Cafetería
          </button>
        </div>

        <div className="bg-[#1e2538] rounded-xl shadow-2xl border border-white/5 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#2a324a] text-gray-300 uppercase text-sm font-semibold">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Ubicación (GPS)</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-400">Cargando...</td></tr>
                ) : cafeterias.map((cafe) => (
                  <tr key={cafe.id_tiendita} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-gray-400 font-mono">#{cafe.id_tiendita}</td>
                    <td className="px-6 py-4 font-medium text-white">{cafe.nombre}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                        {cafe.latitud ? `${parseFloat(cafe.latitud).toFixed(4)}, ${parseFloat(cafe.longitud).toFixed(4)}` : "Sin datos"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => openEditModal(cafe)} className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-colors">
                          <FiEdit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(cafe.id_tiendita)} className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-colors">
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />

      {/* --- MODAL DE CREACIÓN (Rápida) --- */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1e2538] w-full max-w-md rounded-xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#2a324a]">
              <h3 className="text-lg font-bold text-white">Nueva Cafetería</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><FiX size={24}/></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <input type="text" name="nombre" placeholder="Nombre de la cafetería" className="w-full p-2 bg-[#141b2d] border border-white/10 rounded text-white" value={newCafe.nombre} onChange={handleChange} required />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="any" name="latitud" placeholder="Latitud" className="w-full p-2 bg-[#141b2d] border border-white/10 rounded text-white" value={newCafe.latitud} onChange={handleChange} />
                <input type="number" step="any" name="longitud" placeholder="Longitud" className="w-full p-2 bg-[#141b2d] border border-white/10 rounded text-white" value={newCafe.longitud} onChange={handleChange} />
              </div>
              <select name="id_facultad" className="w-full p-2 bg-[#141b2d] border border-white/10 rounded text-white" value={newCafe.id_facultad} onChange={handleChange} required>
                  <option value="">Selecciona facultad...</option>
                  {facultades.map(f => <option key={f.id_facultad} value={f.id_facultad}>{f.nombre}</option>)}
              </select>
              <button type="submit" className="w-full py-2 bg-yellow-500 text-[#141b2d] font-bold rounded">Crear</button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE EDICIÓN (Completo) --- */}
      {showEditModal && editingCafe && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1e2538] w-full max-w-2xl h-[85vh] rounded-xl shadow-2xl border border-white/10 flex flex-col overflow-hidden">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#2a324a]">
              <h3 className="text-xl font-bold text-white">Editando: {editingCafe.nombre}</h3>
              <button onClick={() => setShowEditModal(false)}><FiX size={24} className="text-gray-400 hover:text-white"/></button>
            </div>

            {/* Tabs de Navegación */}
            <div className="flex border-b border-white/10">
              <button 
                onClick={() => setActiveTab("info")}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === "info" ? "bg-[#141b2d] text-yellow-500 border-b-2 border-yellow-500" : "text-gray-400 hover:bg-white/5"}`}
              >
                Información y Foto
              </button>
              <button 
                onClick={() => setActiveTab("menu")}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === "menu" ? "bg-[#141b2d] text-yellow-500 border-b-2 border-yellow-500" : "text-gray-400 hover:bg-white/5"}`}
              >
                Gestión del Menú
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* --- PESTAÑA 1: INFORMACIÓN --- */}
              {activeTab === "info" && (
                <form onSubmit={handleUpdateCafe} className="space-y-5">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Nombre</label>
                    <input className="w-full p-3 bg-[#141b2d] border border-white/10 rounded text-white focus:border-yellow-500 outline-none" value={editingCafe.nombre} onChange={e => setEditingCafe({...editingCafe, nombre: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Dirección Física</label>
                    <input className="w-full p-3 bg-[#141b2d] border border-white/10 rounded text-white focus:border-yellow-500 outline-none" value={editingCafe.direccion || ""} onChange={e => setEditingCafe({...editingCafe, direccion: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Latitud</label>
                        <input type="number" step="any" className="w-full p-3 bg-[#141b2d] border border-white/10 rounded text-white" value={editingCafe.latitud || ""} onChange={e => setEditingCafe({...editingCafe, latitud: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Longitud</label>
                        <input type="number" step="any" className="w-full p-3 bg-[#141b2d] border border-white/10 rounded text-white" value={editingCafe.longitud || ""} onChange={e => setEditingCafe({...editingCafe, longitud: e.target.value})} />
                    </div>
                  </div>

                  {/* SUBIDA DE IMAGEN LOCAL */}
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Foto de la Cafetería</label>
                    <div className="flex items-center gap-3">
                        <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold transition">
                            <FiImage /> Subir desde PC
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                        <span className="text-xs text-gray-500">
                            {editingCafe.imagen_url ? "Imagen cargada (Base64)" : "Sin imagen"}
                        </span>
                    </div>
                    {/* Previsualización pequeña */}
                    {editingCafe.imagen_url && (
                        <img src={editingCafe.imagen_url} alt="Preview" className="mt-3 h-32 w-full object-cover rounded-lg border border-white/10" />
                    )}
                  </div>
                  
                  <div className="pt-4">
                    <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg flex justify-center items-center gap-2 transition">
                        <FiSave /> Guardar Cambios
                    </button>
                  </div>
                </form>
              )}

              {/* --- PESTAÑA 2: MENÚ --- */}
              {activeTab === "menu" && (
                <div className="space-y-6">
                  {/* Formulario Agregar Item */}
                  <div className="bg-[#2a324a] p-4 rounded-lg border border-white/10">
                    <h4 className="text-yellow-500 font-bold mb-3 flex items-center gap-2"><FiPlus/> Agregar Platillo</h4>
                    <div className="flex gap-2 mb-2">
                        <input className="flex-1 p-2 bg-[#141b2d] border border-white/10 rounded text-white text-sm" placeholder="Nombre (ej. Burrito)" value={newMenuItem.nombre} onChange={e => setNewMenuItem({...newMenuItem, nombre: e.target.value})} />
                        <div className="relative w-24">
                            <span className="absolute left-2 top-2 text-gray-400">$</span>
                            <input className="w-full p-2 pl-5 bg-[#141b2d] border border-white/10 rounded text-white text-sm" type="number" placeholder="0" value={newMenuItem.precio} onChange={e => setNewMenuItem({...newMenuItem, precio: e.target.value})} />
                        </div>
                    </div>
                    <button onClick={handleAddMenuItem} className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-[#141b2d] text-sm font-bold rounded transition">Agregar al Menú</button>
                  </div>

                  {/* Lista de Items */}
                  <div>
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2"><FiList/> Platillos Actuales ({cafeMenu.length})</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {cafeMenu.length === 0 && <p className="text-gray-500 text-sm text-center py-4">El menú está vacío.</p>}
                        {cafeMenu.map(item => (
                            <div key={item.id_menu} className="flex justify-between items-center bg-[#141b2d] p-3 rounded border border-white/5 hover:border-white/20 transition">
                                <div>
                                    <p className="font-bold text-white text-sm">{item.nombre}</p>
                                    <p className="text-xs text-green-400 font-mono">${parseFloat(item.precio).toFixed(2)}</p>
                                </div>
                                <button onClick={() => handleDeleteMenuItem(item.id_menu)} className="p-2 text-red-400 hover:bg-red-500/10 rounded transition" title="Borrar">
                                    <FiTrash2 />
                                </button>
                            </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;