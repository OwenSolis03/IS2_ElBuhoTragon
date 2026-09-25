// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatWidget from "../components/ChatWidget";
import PageHeader from "../components/PageHeader";
import ConfirmModal from "../components/ConfirmModal";
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiX, 
  FiSave, 
  FiImage, 
  FiList, 
  FiMessageSquare, 
  FiUser, 
  FiCheckCircle, 
  FiAlertCircle 
} from "react-icons/fi";
import { FaStar } from "react-icons/fa";

const AdminDashboard = () => {
  const [cafeterias, setCafeterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facultades, setFacultades] = useState([]);

  // Estados de Modales
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Estados para Edición de Cafetería
  const [editingCafe, setEditingCafe] = useState(null);
  const [cafeMenu, setCafeMenu] = useState([]); 
  const [cafeReviews, setCafeReviews] = useState([]);
  const [activeTab, setActiveTab] = useState("info");

  // Estados para Edición de Menú
  const [newMenuItem, setNewMenuItem] = useState({ nombre: "", precio: "", descripcion: "", categoria: "" });
  const [editingMenuItemId, setEditingMenuItemId] = useState(null);

  // Estado para Crear Cafetería
  const [newCafe, setNewCafe] = useState({
    nombre: "", direccion: "", id_facultad: "", latitud: "", longitud: "", imagen_url: "", hora_apertura: "", hora_cierre: ""
  });

  // Estado para Toasts de Notificación
  const [notification, setNotification] = useState(null);

  // Estado para ConfirmModal destructivo
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const categoriasComida = [
    "Desayuno", 
    "Almuerzo", 
    "Comida", 
    "Comida Corrida", 
    "Vegana / Vegetariana", 
    "Fit / Saludable", 
    "Bebidas", 
    "Postres", 
    "Snacks"
  ];

  const fetchCafeterias = () => {
    fetch("http://127.0.0.1:8000/api/Tienditas/")
      .then((res) => res.json())
      .then((data) => { setCafeterias(Array.isArray(data) ? data : []); setLoading(false); })
      .catch((err) => { console.error("Error al cargar cafeterías:", err); setLoading(false); });
  };

  useEffect(() => {
    fetchCafeterias();
    fetch("http://127.0.0.1:8000/api/Facultades/")
      .then((res) => res.json())
      .then((data) => setFacultades(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error al cargar facultades:", err));
  }, []);

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
    if (!newCafe.nombre || !newCafe.id_facultad) {
      return showToast("Falta ingresar nombre o facultad del local.", "error");
    }

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
        showToast("Cafetería registrada exitosamente.", "success");
      } else {
        showToast("Error al registrar la cafetería.", "error");
      }
    } catch (error) { 
      console.error(error); 
      showToast("Error de conexión con el servidor.", "error");
    }
  };

  const openEditModal = (cafe) => {
    setEditingCafe(cafe);
    setActiveTab("info");
    setShowEditModal(true);
    setEditingMenuItemId(null);
    setNewMenuItem({ nombre: "", precio: "", descripcion: "", categoria: "" });
    
    // 1. Cargar Menú
    fetch(`http://127.0.0.1:8000/api/Menus/?id_tiendita=${cafe.id_tiendita}`)
      .then((res) => res.json())
      .then((data) => setCafeMenu(Array.isArray(data) ? data : []));

    // 2. Cargar Reseñas
    fetch(`http://127.0.0.1:8000/api/Resenas/?id_tiendita=${cafe.id_tiendita}`)
      .then((res) => res.json())
      .then((data) => setCafeReviews(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error al cargar reseñas:", err));
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
        showToast("Información de cafetería actualizada correctamente.", "success");
        fetchCafeterias();
        setShowEditModal(false);
      } else {
        showToast("Error al actualizar la cafetería.", "error");
      }
    } catch (error) { 
      console.error(error); 
      showToast("Error de conexión con el servidor.", "error");
    }
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
    if (!newMenuItem.nombre || !newMenuItem.precio) {
      return showToast("Falta ingresar nombre o precio del platillo.", "error");
    }

    const url = editingMenuItemId 
      ? `http://127.0.0.1:8000/api/Menus/${editingMenuItemId}/` 
      : "http://127.0.0.1:8000/api/Menus/";
    
    const method = editingMenuItemId ? "PUT" : "POST";

    const payload = {
      ...newMenuItem,
      id_tiendita: editingCafe.id_tiendita,
      precio: parseFloat(newMenuItem.precio)
    };

    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(editingMenuItemId ? "Platillo modificado con éxito." : "Platillo agregado a la carta.", "success");
        cancelEditMenuItem();
        fetch(`http://127.0.0.1:8000/api/Menus/?id_tiendita=${editingCafe.id_tiendita}`)
          .then((r) => r.json())
          .then((d) => setCafeMenu(Array.isArray(d) ? d : []));
      } else {
        showToast("Error al guardar el platillo.", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Error de conexión con el servidor.", "error");
    }
  };

  const handleDeleteMenuItem = (id) => {
    setConfirmState({
      isOpen: true,
      title: "Eliminar Platillo",
      message: "¿Deseas eliminar este platillo de la carta de la cafetería?",
      onConfirm: async () => {
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/Menus/${id}/`, { method: "DELETE" });
          if (res.ok) {
            setCafeMenu((prev) => prev.filter((item) => item.id_menu !== id));
            showToast("Platillo eliminado de la carta.", "success");
          } else {
            showToast("No se pudo eliminar el platillo.", "error");
          }
        } catch (error) {
          console.error(error);
          showToast("Error de conexión.", "error");
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // --- MODERACIÓN DE RESEÑAS ---
  const handleDeleteReview = (id) => {
    setConfirmState({
      isOpen: true,
      title: "Eliminar Opinión",
      message: "¿Deseas retirar esta reseña de forma permanente?",
      onConfirm: async () => {
        const token = localStorage.getItem("access_token");
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/Resenas/${id}/`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });

          if (res.ok) {
            setCafeReviews((prev) => prev.filter((r) => r.id_resena !== id));
            showToast("Reseña retirada de la plataforma.", "success");
          } else {
            showToast("Error al eliminar la reseña. Verifica permisos.", "error");
          }
        } catch (error) {
          console.error(error);
          showToast("Error de conexión con el servidor.", "error");
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDelete = (id, nombreCafe) => {
    setConfirmState({
      isOpen: true,
      title: "Eliminar Cafetería",
      message: `¿Estás seguro de eliminar "${nombreCafe || 'esta cafetería'}" permanentemente del directorio? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/Tienditas/${id}/`, { method: "DELETE" });
          if (res.ok) {
            fetchCafeterias();
            showToast("Cafetería eliminada del catálogo.", "success");
          } else {
            showToast("Error al eliminar la cafetería.", "error");
          }
        } catch (error) {
          console.error(error);
          showToast("Error de conexión.", "error");
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#0e2246] text-[#F2F2F0] flex flex-col font-sans selection:bg-[#163A70] selection:text-white">
      <Header />

      {/* Notificación Toast */}
      {notification && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[110] animate-fade-in">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl backdrop-blur-md text-xs font-mono tracking-wider uppercase ${
            notification.type === 'success' 
              ? 'bg-[#071326]/95 border border-emerald-500/40 text-emerald-300' 
              : 'bg-[#071326]/95 border border-rose-500/40 text-rose-300'
          }`}>
            {notification.type === 'success' ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-3 text-neutral-400 hover:text-white cursor-pointer">
              <FiX size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ConfirmModal para acciones destructivas */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        isDestructive={true}
        confirmText="Eliminar"
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
      
      <main className="flex-grow pt-28 pb-28 px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto w-full">
        {/* Encabezado Editorial */}
        <PageHeader
          eyebrow="Administración Universitaria"
          title="Panel de Gestión"
          description="Catálogo de establecimientos, administración de cartas de platillos y moderación de opiniones de la comunidad."
        >
          <button 
            onClick={() => setShowModal(true)} 
            className="px-7 py-3 bg-white text-black font-sans text-sm font-mono uppercase tracking-wider rounded-full hover:bg-neutral-200 transition-colors flex items-center gap-2.5 cursor-pointer font-semibold"
          >
            <FiPlus size={17} /> 
            <span>Nueva Cafetería</span>
          </button>
        </PageHeader>

        {/* Tabla de Cafeterías */}
        {loading ? (
          <div className="py-20 text-center text-neutral-300 font-mono text-sm uppercase tracking-widest animate-pulse font-medium">
            Sincronizando catálogo con el servidor...
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0a1830] border border-white/[0.08] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#071326] text-neutral-200 font-mono text-xs uppercase tracking-wider border-b border-white/[0.08]">
                  <tr>
                    <th className="px-6 py-4.5 font-semibold">Establecimiento</th>
                    <th className="px-6 py-4.5 font-semibold">Horario Regular</th>
                    <th className="px-6 py-4.5 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-base">
                  {cafeterias.map((cafe) => (
                    <tr key={cafe.id_tiendita} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4.5 font-medium text-white">
                        {cafe.nombre}
                      </td>
                      <td className="px-6 py-4.5 font-mono text-sm text-neutral-200">
                        {cafe.hora_apertura ? `${cafe.hora_apertura.slice(0, 5)} – ${cafe.hora_cierre?.slice(0, 5)}` : "Sin horario registrado"}
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={() => openEditModal(cafe)} 
                            className="p-2.5 text-neutral-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
                            title="Editar cafetería"
                            aria-label={`Editar cafetería ${cafe.nombre}`}
                          >
                            <FiEdit2 size={17} />
                          </button>
                          <button 
                            onClick={() => handleDelete(cafe.id_tiendita, cafe.nombre)} 
                            className="p-2.5 text-neutral-300 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                            title="Eliminar cafetería"
                            aria-label={`Eliminar cafetería ${cafe.nombre}`}
                          >
                            <FiTrash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <ChatWidget />

      {/* MODAL CREAR CAFETERÍA */}
      {showModal && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-create-title"
        >
          <div className="bg-[#0a1830] w-full max-w-lg rounded-2xl p-6 sm:p-8 border border-white/[0.12] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
              <h3 id="modal-create-title" className="font-display text-2xl sm:text-3xl text-white font-normal">
                Registrar Cafetería
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-neutral-400 hover:text-white p-1.5 cursor-pointer"
                aria-label="Cerrar modal"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-sm font-sans">
              <div>
                <label htmlFor="new-cafe-nombre" className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">Nombre</label>
                <input 
                  id="new-cafe-nombre"
                  name="nombre" 
                  className="w-full p-3.5 bg-[#071326] border border-white/[0.1] rounded-xl text-white text-base focus:outline-none focus:border-[#B39A3A]" 
                  placeholder="Nombre de la cafetería" 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="new-cafe-apertura" className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">Apertura</label>
                  <input 
                    id="new-cafe-apertura"
                    type="time" 
                    name="hora_apertura" 
                    className="w-full p-3.5 bg-[#071326] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-[#B39A3A] font-mono text-sm" 
                    onChange={handleChange} 
                  />
                </div>
                <div>
                  <label htmlFor="new-cafe-cierre" className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">Cierre</label>
                  <input 
                    id="new-cafe-cierre"
                    type="time" 
                    name="hora_cierre" 
                    className="w-full p-3.5 bg-[#071326] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-[#B39A3A] font-mono text-sm" 
                    onChange={handleChange} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="new-cafe-latitud" className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">Latitud</label>
                  <input 
                    id="new-cafe-latitud"
                    type="number" 
                    step="any" 
                    placeholder="29.083..." 
                    name="latitud" 
                    className="w-full p-3.5 bg-[#071326] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-[#B39A3A] font-mono text-sm" 
                    onChange={handleChange} 
                  />
                </div>
                <div>
                  <label htmlFor="new-cafe-longitud" className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">Longitud</label>
                  <input 
                    id="new-cafe-longitud"
                    type="number" 
                    step="any" 
                    placeholder="-110.961..." 
                    name="longitud" 
                    className="w-full p-3.5 bg-[#071326] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-[#B39A3A] font-mono text-sm" 
                    onChange={handleChange} 
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-cafe-facultad" className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">Facultad</label>
                <select 
                  id="new-cafe-facultad"
                  name="id_facultad" 
                  className="w-full p-3.5 bg-[#071326] border border-white/[0.1] rounded-xl text-white text-base focus:outline-none focus:border-[#B39A3A]" 
                  onChange={handleChange} 
                  required
                >
                  <option value="">Seleccionar facultad...</option>
                  {facultades.map((f) => <option key={f.id_facultad} value={f.id_facultad}>{f.nombre}</option>)}
                </select>
              </div>

              <label className="cursor-pointer bg-white/[0.04] border border-white/[0.1] text-neutral-300 px-4 py-3.5 rounded-xl text-sm font-mono uppercase tracking-wider flex items-center gap-2 justify-center hover:bg-white/[0.08] transition">
                <FiImage size={17} /> 
                <span>Imagen de portada</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, false)} />
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-5 py-2.5 text-sm font-mono uppercase tracking-wider text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-7 py-3 bg-white text-black font-sans text-sm font-mono uppercase tracking-wider rounded-full hover:bg-neutral-200 transition-colors cursor-pointer font-semibold shadow-md"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CAFETERÍA (CON TABS) */}
      {showEditModal && editingCafe && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-edit-title"
        >
          <div className="bg-[#0a1830] w-full max-w-2xl h-[85vh] rounded-2xl border border-white/[0.12] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-white/[0.08] bg-[#071326]">
              <h3 id="modal-edit-title" className="font-display text-2xl sm:text-3xl text-white font-normal">
                Editar: {editingCafe.nombre}
              </h3>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="text-neutral-400 hover:text-white p-1.5 cursor-pointer"
                aria-label="Cerrar ventana de edición"
              >
                <FiX size={20} />
              </button>
            </div>
            
            {/* TABS DE NAVEGACIÓN */}
            <div className="flex border-b border-white/[0.08] bg-[#071326] px-6 gap-8 text-sm font-mono uppercase tracking-wider" role="tablist">
              <button 
                role="tab"
                aria-selected={activeTab === "info"}
                onClick={() => setActiveTab("info")} 
                className={`py-4 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "info" ? "text-white border-[#B39A3A] font-semibold" : "text-neutral-400 border-transparent hover:text-white"
                }`}
              >
                Información
              </button>
              <button 
                role="tab"
                aria-selected={activeTab === "menu"}
                onClick={() => setActiveTab("menu")} 
                className={`py-4 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "menu" ? "text-white border-[#B39A3A] font-semibold" : "text-neutral-400 border-transparent hover:text-white"
                }`}
              >
                Menú ({cafeMenu.length})
              </button>
              <button 
                role="tab"
                aria-selected={activeTab === "reviews"}
                onClick={() => setActiveTab("reviews")} 
                className={`py-4 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "reviews" ? "text-white border-[#B39A3A] font-semibold" : "text-neutral-400 border-transparent hover:text-white"
                }`}
              >
                Reseñas ({cafeReviews.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-7">
              {/* --- TAB 1: INFORMACIÓN GENERAL --- */}
              {activeTab === "info" && (
                <form onSubmit={handleUpdateCafe} className="space-y-4 font-sans text-sm">
                  <div>
                    <label htmlFor="edit-cafe-nombre" className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">Nombre</label>
                    <input 
                      id="edit-cafe-nombre"
                      className="w-full p-3.5 bg-[#071326] border border-white/[0.1] rounded-xl text-white text-base focus:outline-none focus:border-[#B39A3A]" 
                      value={editingCafe.nombre} 
                      onChange={(e) => setEditingCafe({ ...editingCafe, nombre: e.target.value })} 
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-cafe-direccion" className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">Dirección / Ubicación</label>
                    <input 
                      id="edit-cafe-direccion"
                      className="w-full p-3.5 bg-[#071326] border border-white/[0.1] rounded-xl text-white text-base focus:outline-none focus:border-[#B39A3A]" 
                      value={editingCafe.direccion || ""} 
                      placeholder="Ubicación o edificio del campus" 
                      onChange={(e) => setEditingCafe({ ...editingCafe, direccion: e.target.value })} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-cafe-apertura" className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">Apertura</label>
                      <input 
                        id="edit-cafe-apertura"
                        type="time" 
                        className="w-full p-3.5 bg-[#071326] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-[#B39A3A] font-mono text-sm" 
                        value={editingCafe.hora_apertura || ""} 
                        onChange={(e) => setEditingCafe({ ...editingCafe, hora_apertura: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-cafe-cierre" className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">Cierre</label>
                      <input 
                        id="edit-cafe-cierre"
                        type="time" 
                        className="w-full p-3.5 bg-[#071326] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-[#B39A3A] font-mono text-sm" 
                        value={editingCafe.hora_cierre || ""} 
                        onChange={(e) => setEditingCafe({ ...editingCafe, hora_cierre: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-cafe-latitud" className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">Latitud</label>
                      <input 
                        id="edit-cafe-latitud"
                        type="number" 
                        step="any" 
                        className="w-full p-3.5 bg-[#071326] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-[#B39A3A] font-mono text-sm" 
                        value={editingCafe.latitud || ""} 
                        onChange={(e) => setEditingCafe({ ...editingCafe, latitud: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-cafe-longitud" className="block font-mono text-xs uppercase tracking-wider text-neutral-300 mb-1.5 font-medium">Longitud</label>
                      <input 
                        id="edit-cafe-longitud"
                        type="number" 
                        step="any" 
                        className="w-full p-3.5 bg-[#071326] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-[#B39A3A] font-mono text-sm" 
                        value={editingCafe.longitud || ""} 
                        onChange={(e) => setEditingCafe({ ...editingCafe, longitud: e.target.value })} 
                      />
                    </div>
                  </div>
                  <label className="cursor-pointer bg-white/[0.04] border border-white/[0.1] text-neutral-300 px-4 py-3.5 rounded-xl text-sm font-mono uppercase tracking-wider flex items-center gap-2 justify-center hover:bg-white/[0.08] transition">
                    <FiImage size={17} /> 
                    <span>Actualizar Fotografía</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                  </label>
                  <button 
                    type="submit" 
                    className="w-full py-3.5 bg-white text-black font-sans text-sm font-mono uppercase tracking-wider rounded-full hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2 font-semibold shadow-md"
                  >
                    <FiSave size={16} /> 
                    <span>Guardar Cambios</span>
                  </button>
                </form>
              )}

              {/* --- TAB 2: MENÚ DEL DÍA --- */}
              {activeTab === "menu" && (
                <div className="space-y-6">
                  <div className="bg-[#071326] p-5 sm:p-6 rounded-2xl border border-white/[0.08]">
                    <span className="font-mono text-sm uppercase tracking-wider text-[#B39A3A] block mb-3 font-semibold">
                      {editingMenuItemId ? "Editar Platillo" : "Agregar Platillo a la Carta"}
                    </span>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <input 
                        className="col-span-2 p-3 bg-[#0a1830] border border-white/[0.1] rounded-xl text-white text-sm sm:text-base focus:outline-none focus:border-[#B39A3A]" 
                        placeholder="Nombre del platillo" 
                        value={newMenuItem.nombre} 
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, nombre: e.target.value })} 
                      />
                      <input 
                        className="col-span-1 p-3 bg-[#0a1830] border border-white/[0.1] rounded-xl text-white text-sm sm:text-base font-mono focus:outline-none focus:border-[#B39A3A]" 
                        type="number" 
                        placeholder="Precio ($)" 
                        value={newMenuItem.precio} 
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, precio: e.target.value })} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <select 
                        className="p-3 bg-[#0a1830] border border-white/[0.1] rounded-xl text-white text-sm sm:text-base focus:outline-none focus:border-[#B39A3A]" 
                        value={newMenuItem.categoria} 
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, categoria: e.target.value })}
                      >
                        <option value="">Categoría...</option>
                        {categoriasComida.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input 
                        className="p-3 bg-[#0a1830] border border-white/[0.1] rounded-xl text-white text-sm sm:text-base focus:outline-none focus:border-[#B39A3A]" 
                        placeholder="Descripción breve" 
                        value={newMenuItem.descripcion} 
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, descripcion: e.target.value })} 
                      />
                    </div>
                    <div className="flex gap-3 justify-end pt-1">
                      {editingMenuItemId && (
                        <button 
                          onClick={cancelEditMenuItem} 
                          className="px-4 py-2 text-sm font-mono uppercase tracking-wider text-neutral-400 hover:text-white cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                      <button 
                        onClick={handleSaveMenuItem} 
                        className="px-6 py-2.5 bg-white text-black font-sans text-sm font-mono uppercase tracking-wider rounded-full hover:bg-neutral-200 transition-colors cursor-pointer font-semibold shadow-md"
                      >
                        {editingMenuItemId ? "Actualizar" : "Guardar Platillo"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display text-2xl text-white mb-3 flex items-center gap-2 font-normal">
                      <FiList size={18} className="text-[#B39A3A]" /> 
                      <span>Carta Actual ({cafeMenu.length})</span>
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 divide-y divide-white/[0.04]">
                      {cafeMenu.length === 0 && (
                        <p className="text-neutral-400 text-center text-sm py-6 font-light">
                          No hay platillos registrados en este menú.
                        </p>
                      )}
                      {cafeMenu.map((item) => (
                        <div key={item.id_menu} className="pt-3 pb-3 flex justify-between items-center group">
                          <div>
                            <p className="font-medium text-white text-base">{item.nombre}</p>
                            <p className="text-sm text-neutral-400 font-light">{item.categoria} {item.descripcion ? `· ${item.descripcion}` : ""}</p> 
                            <p className="text-sm text-[#B39A3A] font-mono mt-0.5 font-medium">${parseFloat(item.precio).toFixed(2)}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => startEditMenuItem(item)} 
                              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition cursor-pointer"
                              title="Editar platillo"
                              aria-label={`Editar platillo ${item.nombre}`}
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteMenuItem(item.id_menu)} 
                              className="p-2 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                              title="Eliminar platillo"
                              aria-label={`Eliminar platillo ${item.nombre}`}
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 3: RESEÑAS Y MODERACIÓN --- */}
              {activeTab === "reviews" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-display text-2xl text-white flex items-center gap-2 font-normal">
                      <FiMessageSquare size={18} className="text-[#B39A3A]" /> 
                      <span>Moderación de Opiniones</span>
                    </h4>
                    <span className="font-mono text-sm text-neutral-400">Total: {cafeReviews.length}</span>
                  </div>

                  {cafeReviews.length === 0 ? (
                    <div className="text-center py-10 text-neutral-400 text-sm font-light">
                      No hay reseñas registradas para este establecimiento.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 divide-y divide-white/[0.04]">
                      {cafeReviews.map((review) => (
                        <div key={review.id_resena} className="pt-3.5 pb-3.5 flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-sans font-medium text-sm sm:text-base text-white flex items-center gap-1.5">
                                <FiUser size={14} className="text-neutral-400" />
                                {review.nombre_usuario || "Anónimo"}
                              </span>
                              <span className="text-xs font-mono text-neutral-400">· {new Date(review.fecha_registro).toLocaleDateString()}</span>
                            </div>
                            <div className="flex text-[#B39A3A] text-sm mb-2">
                              {[...Array(5)].map((_, i) => (
                                <FaStar key={i} size={12} className={i < review.calificacion ? "" : "text-neutral-700"} />
                              ))}
                            </div>
                            <p className="text-sm sm:text-[15px] text-neutral-200 font-light leading-relaxed">"{review.comentario}"</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteReview(review.id_resena)}
                            className="p-2 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                            title="Eliminar comentario"
                            aria-label={`Eliminar comentario de ${review.nombre_usuario || "usuario"}`}
                          >
                            <FiTrash2 size={17} />
                          </button>
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