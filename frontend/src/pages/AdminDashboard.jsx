// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiImage, FiList, FiMessageSquare, FiUser } from "react-icons/fi";
import { FaStar } from "react-icons/fa";

const AdminDashboard = () => {
  const [cafeterias, setCafeterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facultades, setFacultades] = useState([]);

  // --- ESTADOS DE MODALES ---
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // --- ESTADOS PARA EDICIÓN DE CAFETERÍA ---
  const [editingCafe, setEditingCafe] = useState(null);
  const [cafeMenu, setCafeMenu] = useState([]); 
  
  // ESTADO: Reseñas de la cafetería actual
  const [cafeReviews, setCafeReviews] = useState([]);

  const [activeTab, setActiveTab] = useState("info");

  // --- ESTADOS PARA EDICIÓN DE MENÚ ---
  const [newMenuItem, setNewMenuItem] = useState({ nombre: "", precio: "", descripcion: "", categoria: "" });
  const [editingMenuItemId, setEditingMenuItemId] = useState(null);

  // --- ESTADO PARA CREAR CAFETERÍA ---
  const [newCafe, setNewCafe] = useState({
    nombre: "", direccion: "", id_facultad: "", latitud: "", longitud: "", imagen_url: "", hora_apertura: "", hora_cierre: ""
  });

  const categoriasComida = ["Desayuno", "Almuerzo", "Comida", "Comida Corrida", "Vegana / Vegetariana", "Fit / Saludable", "Bebidas", "Postres", "Snacks"];

  useEffect(() => {
    fetchCafeterias();
    fetch("http://127.0.0.1:8000/api/Facultades/")
      .then((res) => res.json())
      .then((data) => setFacultades(data))
      .catch((err) => console.error("Error facultades:", err));
  }, []);

  const fetchCafeterias = () => {
    fetch("http://127.0.0.1:8000/api/Tienditas/")
      .then((res) => res.json())
      .then((data) => { setCafeterias(data); setLoading(false); })
      .catch((err) => console.error("Error cafeterías:", err));
  };

  const handleImageUpload = (e, isEditing = false) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEditing) setEditingCafe({ ...editingCafe, imagen_url: reader.result });
        else setNewCafe({ ...newCafe, imagen_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => setNewCafe({ ...newCafe, [e.target.name]: e.target.value });

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
        setNewCafe({ nombre: "", direccion: "", id_facultad: "", latitud: "", longitud: "", imagen_url: "", hora_apertura: "", hora_cierre: "" });
        alert("Cafetería creada");
      }
    } catch (error) { console.error(error); }
  };

  const openEditModal = (cafe) => {
    setEditingCafe(cafe);
    setActiveTab("info");
    setShowEditModal(true);
    setEditingMenuItemId(null);
    setNewMenuItem({ nombre: "", precio: "", descripcion: "", categoria: "" });
    
    // 1. Cargar Menú
    fetch(`http://127.0.0.1:8000/api/Menus/?id_tiendita=${cafe.id_tiendita}`)
      .then(res => res.json())
      .then(data => setCafeMenu(data));

    // 2. Cargar Reseñas
    fetch(`http://127.0.0.1:8000/api/Resenas/?id_tiendita=${cafe.id_tiendita}`)
      .then(res => res.json())
      .then(data => setCafeReviews(data))
      .catch(err => console.error("Error cargando reseñas", err));
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
        alert("Cafetería actualizada");
        fetchCafeterias();
        setShowEditModal(false);
      }
    } catch (error) { console.error(error); }
  };

  // --- GESTIÓN DEL MENÚ ---
  const startEditMenuItem = (item) => {
    setNewMenuItem({
        nombre: item.nombre,
        precio: item.precio,
        descripcion: item.descripcion || "",
        categoria: item.categoria || ""
    });
    setEditingMenuItemId(item.id_menu);
  };

  const cancelEditMenuItem = () => {
    setNewMenuItem({ nombre: "", precio: "", descripcion: "", categoria: "" });
    setEditingMenuItemId(null);
  };

  const handleSaveMenuItem = async () => {
    if (!newMenuItem.nombre || !newMenuItem.precio) return alert("Falta nombre o precio");

    const url = editingMenuItemId 
        ? `http://127.0.0.1:8000/api/Menus/${editingMenuItemId}/` 
        : "http://127.0.0.1:8000/api/Menus/"; 
    
    const method = editingMenuItemId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newMenuItem, id_tiendita: editingCafe.id_tiendita })
      });

      if (res.ok) {
        const savedItem = await res.json();
        
        if (editingMenuItemId) {
            setCafeMenu(cafeMenu.map(item => item.id_menu === editingMenuItemId ? savedItem : item));
            alert("Platillo actualizado");
        } else {
            setCafeMenu([...cafeMenu, savedItem]);
        }
        cancelEditMenuItem();
      }
    } catch (error) { console.error(error); }
  };

  const handleDeleteMenuItem = async (id) => {
    if(!window.confirm("¿Borrar platillo?")) return;
    await fetch(`http://127.0.0.1:8000/api/Menus/${id}/`, { method: "DELETE" });
    setCafeMenu(cafeMenu.filter(item => item.id_menu !== id));
  };

  // --- GESTIÓN DE RESEÑAS (CORREGIDO CON TOKEN) ---
  const handleDeleteReview = async (id) => {
      if(!window.confirm("¿Estás seguro de eliminar esta reseña permanentemente?")) return;
      
      // 1. OBTENEMOS EL TOKEN
      const token = localStorage.getItem("access_token");

      try {
          const res = await fetch(`http://127.0.0.1:8000/api/Resenas/${id}/`, { 
              method: "DELETE",
              // 2. ENVIAMOS EL TOKEN EN LOS HEADERS
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
              }
          });

          if(res.ok) {
              setCafeReviews(cafeReviews.filter(r => r.id_resena !== id));
              alert("Reseña eliminada.");
          } else {
              alert("Error al eliminar. Verifica permisos.");
          }
      } catch (error) {
          console.error(error);
          alert("Error de conexión");
      }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar cafetería?")) return;
    await fetch(`http://127.0.0.1:8000/api/Tienditas/${id}/`, { method: "DELETE" });
    fetchCafeterias();
  };

  return (
    <div style={{ margin: 0, padding: 0, width: "100vw", minHeight: "100vh", backgroundColor: "#141b2d", backgroundSize: "100% 100%", color: "white", paddingTop: "3.2rem", display: "flex", flexDirection: "column", position: "relative", overflowX: "hidden", boxSizing: "border-box" }}>
      <Header />
      <main style={{ flexGrow: 1, padding: "2rem", paddingTop: "6rem", width: "100%", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column" }}>
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Panel de Administración</h1>
            <p className="text-gray-400 mt-1">Gestiona las cafeterías del campus</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-yellow-500 text-[#141b2d] font-bold py-2 px-6 rounded-lg shadow-lg flex items-center gap-2 transition hover:-translate-y-1">
            <FiPlus size={20} /> Nueva Cafetería
          </button>
        </div>

        <div className="bg-[#1e2538] rounded-xl shadow-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#2a324a] text-gray-300 uppercase text-sm font-semibold">
              <tr><th className="px-6 py-4">Nombre</th><th className="px-6 py-4">Horario</th><th className="px-6 py-4 text-center">Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cafeterias.map((cafe) => (
                <tr key={cafe.id_tiendita} className="hover:bg-white/5">
                  <td className="px-6 py-4 font-medium">{cafe.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{cafe.hora_apertura ? `${cafe.hora_apertura.slice(0,5)} - ${cafe.hora_cierre?.slice(0,5)}` : "-"}</td>
                  <td className="px-6 py-4 flex justify-center gap-3">
                    <button onClick={() => openEditModal(cafe)} className="p-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white"><FiEdit2 /></button>
                    <button onClick={() => handleDelete(cafe.id_tiendita)} className="p-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white"><FiTrash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />

      {/* MODAL CREAR */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1e2538] w-full max-w-md rounded-xl p-6 border border-white/10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Nueva Cafetería</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <input name="nombre" className="w-full p-2 bg-[#141b2d] border border-white/10 rounded text-white" placeholder="Nombre" onChange={handleChange} required />
              <div className="grid grid-cols-2 gap-4">
                <input type="time" name="hora_apertura" className="w-full p-2 bg-[#141b2d] border border-white/10 rounded text-white" onChange={handleChange} />
                <input type="time" name="hora_cierre" className="w-full p-2 bg-[#141b2d] border border-white/10 rounded text-white" onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <input type="number" step="any" placeholder="Latitud" name="latitud" className="w-full p-2 bg-[#141b2d] border border-white/10 rounded text-white" onChange={handleChange} />
                 <input type="number" step="any" placeholder="Longitud" name="longitud" className="w-full p-2 bg-[#141b2d] border border-white/10 rounded text-white" onChange={handleChange} />
              </div>
              <select name="id_facultad" className="w-full p-2 bg-[#141b2d] border border-white/10 rounded text-white" onChange={handleChange} required>
                  <option value="">Facultad...</option>
                  {facultades.map(f => <option key={f.id_facultad} value={f.id_facultad}>{f.nombre}</option>)}
              </select>
              <label className="cursor-pointer bg-blue-600/20 border border-blue-600 text-blue-400 px-4 py-2 rounded text-sm font-bold flex items-center gap-2 justify-center hover:bg-blue-600 hover:text-white transition">
                   <FiImage /> Imagen (PC) <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, false)} />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                 <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-300">Cancelar</button>
                 <button type="submit" className="px-4 py-2 bg-yellow-500 text-[#141b2d] font-bold rounded">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR (Con Tabs) */}
      {showEditModal && editingCafe && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1e2538] w-full max-w-2xl h-[85vh] rounded-xl border border-white/10 flex flex-col">
            <div className="flex justify-between p-4 border-b border-white/10 bg-[#2a324a]">
              <h3 className="font-bold">Editar: {editingCafe.nombre}</h3>
              <button onClick={() => setShowEditModal(false)}><FiX /></button>
            </div>
            
            {/* TABS DE NAVEGACIÓN */}
            <div className="flex border-b border-white/10">
               <button onClick={() => setActiveTab("info")} className={`flex-1 py-3 font-medium transition-colors ${activeTab==="info" ? "text-yellow-500 border-b-2 border-yellow-500 bg-white/5" : "text-gray-400 hover:text-white"}`}>Info General</button>
               <button onClick={() => setActiveTab("menu")} className={`flex-1 py-3 font-medium transition-colors ${activeTab==="menu" ? "text-yellow-500 border-b-2 border-yellow-500 bg-white/5" : "text-gray-400 hover:text-white"}`}>Menú</button>
               <button onClick={() => setActiveTab("reviews")} className={`flex-1 py-3 font-medium transition-colors ${activeTab==="reviews" ? "text-yellow-500 border-b-2 border-yellow-500 bg-white/5" : "text-gray-400 hover:text-white"}`}>Reseñas ({cafeReviews.length})</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              
              {/* --- TAB 1: INFO --- */}
              {activeTab === "info" && (
                <form onSubmit={handleUpdateCafe} className="space-y-4">
                   <input className="w-full p-3 bg-[#141b2d] border border-white/10 rounded text-white" value={editingCafe.nombre} onChange={e => setEditingCafe({...editingCafe, nombre: e.target.value})} />
                   <input className="w-full p-3 bg-[#141b2d] border border-white/10 rounded text-white" value={editingCafe.direccion || ""} placeholder="Dirección" onChange={e => setEditingCafe({...editingCafe, direccion: e.target.value})} />
                   <div className="grid grid-cols-2 gap-4">
                      <input type="time" className="w-full p-3 bg-[#141b2d] border border-white/10 rounded text-white" value={editingCafe.hora_apertura || ""} onChange={e => setEditingCafe({...editingCafe, hora_apertura: e.target.value})} />
                      <input type="time" className="w-full p-3 bg-[#141b2d] border border-white/10 rounded text-white" value={editingCafe.hora_cierre || ""} onChange={e => setEditingCafe({...editingCafe, hora_cierre: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <input type="number" step="any" className="w-full p-3 bg-[#141b2d] border border-white/10 rounded text-white" value={editingCafe.latitud || ""} onChange={e => setEditingCafe({...editingCafe, latitud: e.target.value})} />
                      <input type="number" step="any" className="w-full p-3 bg-[#141b2d] border border-white/10 rounded text-white" value={editingCafe.longitud || ""} onChange={e => setEditingCafe({...editingCafe, longitud: e.target.value})} />
                   </div>
                   <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 justify-center transition">
                       <FiImage /> Cambiar Foto <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                   </label>
                   <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded flex justify-center gap-2"><FiSave /> Guardar Cambios</button>
                </form>
              )}

              {/* --- TAB 2: MENÚ --- */}
              {activeTab === "menu" && (
                <div className="space-y-4">
                   <div className="bg-[#2a324a] p-4 rounded border border-white/10">
                      <h4 className={`font-bold mb-2 flex items-center gap-2 ${editingMenuItemId ? "text-blue-400" : "text-yellow-500"}`}>
                          {editingMenuItemId ? <><FiEdit2/> Editando Platillo</> : <><FiPlus/> Nuevo Platillo</>}
                      </h4>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                         <input className="col-span-2 p-2 bg-[#1e2538] border border-white/10 rounded text-white text-sm" placeholder="Nombre" value={newMenuItem.nombre} onChange={e => setNewMenuItem({...newMenuItem, nombre: e.target.value})} />
                         <input className="col-span-1 p-2 bg-[#1e2538] border border-white/10 rounded text-white text-sm" type="number" placeholder="$" value={newMenuItem.precio} onChange={e => setNewMenuItem({...newMenuItem, precio: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                          <select className="p-2 bg-[#1e2538] border border-white/10 rounded text-white text-sm" value={newMenuItem.categoria} onChange={e => setNewMenuItem({...newMenuItem, categoria: e.target.value})}>
                              <option value="">Categoría...</option>
                              {categoriasComida.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input className="p-2 bg-[#1e2538] border border-white/10 rounded text-white text-sm" placeholder="Descripción" value={newMenuItem.descripcion} onChange={e => setNewMenuItem({...newMenuItem, descripcion: e.target.value})} />
                      </div>
                      <div className="flex gap-2">
                        {editingMenuItemId && (
                            <button onClick={cancelEditMenuItem} className="w-1/3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm font-bold rounded">Cancelar</button>
                        )}
                        <button onClick={handleSaveMenuItem} className={`flex-1 py-1 font-bold rounded text-white text-sm ${editingMenuItemId ? "bg-blue-600 hover:bg-blue-500" : "bg-green-600 hover:bg-green-500"}`}>
                            {editingMenuItemId ? "Actualizar" : "Agregar"}
                        </button>
                      </div>
                   </div>

                   <div>
                      <h4 className="text-white font-bold mb-3 flex items-center gap-2"><FiList/> Menú Actual</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {cafeMenu.length === 0 && <p className="text-gray-500 text-center text-sm py-4">Menú vacío.</p>}
                          {cafeMenu.map(item => (
                              <div key={item.id_menu} className="flex justify-between items-center bg-[#141b2d] p-3 rounded border border-white/5 hover:border-white/20 transition group">
                                  <div>
                                      <p className="font-bold text-white text-sm">{item.nombre}</p>
                                      <p className="text-xs text-gray-400">{item.categoria} • {item.descripcion}</p> 
                                      <p className="text-xs text-green-400 font-mono">${parseFloat(item.precio).toFixed(2)}</p>
                                  </div>
                                  <div className="flex gap-2">
                                      <button onClick={() => startEditMenuItem(item)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded transition"><FiEdit2 /></button>
                                      <button onClick={() => handleDeleteMenuItem(item.id_menu)} className="p-2 text-red-400 hover:bg-red-500/10 rounded transition"><FiTrash2 /></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                   </div>
                </div>
              )}

              {/* --- TAB 3: RESEÑAS --- */}
              {activeTab === "reviews" && (
                  <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="text-white font-bold flex items-center gap-2">
                              <FiMessageSquare className="text-yellow-500"/> Comentarios de Usuarios
                          </h4>
                          <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">Total: {cafeReviews.length}</span>
                      </div>

                      {cafeReviews.length === 0 ? (
                          <div className="text-center py-10 bg-[#141b2d] rounded border border-white/5">
                              <p className="text-gray-500">No hay reseñas para esta cafetería aún.</p>
                          </div>
                      ) : (
                          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                              {cafeReviews.map((review) => (
                                  <div key={review.id_resena} className="bg-[#141b2d] p-4 rounded border-l-4 border-yellow-500 hover:bg-[#1a2236] transition flex justify-between gap-4">
                                      <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                              <div className="flex items-center gap-1 text-sm font-bold text-gray-200">
                                                  <FiUser className="text-blue-400"/> {review.nombre_usuario || "Anónimo"}
                                              </div>
                                              <span className="text-xs text-gray-500">• {new Date(review.fecha_registro).toLocaleDateString()}</span>
                                          </div>
                                          <div className="flex mb-2">
                                              {[...Array(5)].map((_, i) => (
                                                  <FaStar key={i} size={12} className={i < review.calificacion ? "text-yellow-500" : "text-gray-700"} />
                                              ))}
                                          </div>
                                          <p className="text-sm text-gray-300 italic">"{review.comentario}"</p>
                                      </div>
                                      <div className="flex items-center">
                                          <button 
                                              onClick={() => handleDeleteReview(review.id_resena)}
                                              className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded transition"
                                              title="Eliminar comentario"
                                          >
                                              <FiTrash2 size={18} />
                                          </button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
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