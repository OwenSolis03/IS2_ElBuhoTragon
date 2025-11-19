import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { FiMenu, FiX, FiLogOut, FiUser, FiSettings } from "react-icons/fi";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [esAdmin, setEsAdmin] = useState(false); // Estado para controlar el botón admin
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Función que revisa el LocalStorage
  const checkUser = () => {
    const storedUser = localStorage.getItem('username');
    const adminStatus = localStorage.getItem('es_admin'); // Leemos el valor mágico
    
    if (storedUser) {
      setUsuario(storedUser);
      // Comparamos con '1' porque localStorage guarda todo como texto
      setEsAdmin(adminStatus == '1'); 
    } else {
      setUsuario(null);
      setEsAdmin(false);
    }
  };

  // Escuchar cambios (Login/Logout)
  useEffect(() => {
    checkUser();
    window.addEventListener("storage", checkUser);
    return () => window.removeEventListener("storage", checkUser);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUsuario(null);
    setEsAdmin(false);
    setIsMenuOpen(false);
    window.dispatchEvent(new Event("storage"));
    navigate('/login');
  };

  const navLinkClass = "text-gray-300 font-semibold hover:text-yellow-500 transition-colors duration-200";
  const authButtonClass = "px-4 py-2 rounded-md font-bold transition-all duration-200";

  return (
    <header className="fixed top-0 w-full z-50 bg-[#141b2d]/95 backdrop-blur-md shadow-lg border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* --- IZQUIERDA --- */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/cafeterias" className={navLinkClass}>Cafeterías</Link>
            <Link to="/facultad" className={navLinkClass}>Mapa</Link>
            
            {/* --- BOTÓN DE ADMIN (Solo se ve si esAdmin es true) --- */}
            {esAdmin && (
              <Link to="/admin/dashboard" className="text-yellow-400 font-bold hover:text-yellow-300 flex items-center gap-1 ml-4 border border-yellow-500/30 px-3 py-1 rounded-full bg-yellow-500/10">
                <FiSettings /> Administración
              </Link>
            )}
          </div>

          {/* --- CENTRO --- */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="El Búho Tragón" className="h-10 w-10" />
              <span className="font-bold text-xl text-gray-100 tracking-wide">
                El Búho Tragón
              </span>
            </Link>
          </div>

          {/* --- DERECHA --- */}
          <div className="hidden md:flex items-center space-x-4">
            {usuario ? (
              <>
                <div className="flex items-center gap-2 text-yellow-500 font-medium mr-2">
                  <FiUser />
                  <span>{usuario}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-md border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all duration-200 font-semibold text-sm"
                >
                  <FiLogOut /> Salir
                </button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <button className={`${authButtonClass} text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10`}>
                    Login
                  </button>
                </Link>
                <Link to="/registro">
                  <button className={`${authButtonClass} bg-yellow-500 text-[#141b2d] hover:bg-yellow-400 shadow-lg shadow-yellow-500/20`}>
                    Registro
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* --- MÓVIL --- */}
          <div className="md:hidden flex items-center">
            <button onClick={toggleMenu} className="text-gray-300 hover:text-yellow-500 focus:outline-none p-2">
              {isMenuOpen ? <FiX size={28} /> : <FiMenu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* MENÚ DESPLEGABLE MÓVIL */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#141b2d] border-t border-white/10 absolute w-full shadow-2xl">
          <div className="px-4 pt-2 pb-6 space-y-2 flex flex-col text-center">
            
            {usuario && (
              <div className="py-2 text-yellow-500 font-bold border-b border-white/5 mb-2">
                Hola, {usuario}
              </div>
            )}

            <Link to="/cafeterias" className="block px-3 py-3 rounded-md text-base font-medium text-gray-300 hover:text-yellow-500 hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>
              Cafeterías
            </Link>
            <Link to="/facultad" className="block px-3 py-3 rounded-md text-base font-medium text-gray-300 hover:text-yellow-500 hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>
              Facultad
            </Link>

            {/* BOTÓN ADMIN MÓVIL */}
            {esAdmin && (
               <Link to="/admin/dashboard" className="block px-3 py-3 rounded-md text-base font-bold text-yellow-400 hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>
                 <span className="flex items-center justify-center gap-2"><FiSettings /> Panel Admin</span>
               </Link>
            )}
            
            <div className="border-t border-white/10 my-2 pt-4 flex flex-col gap-3 px-3">
              {usuario ? (
                <button 
                  onClick={handleLogout}
                  className="w-full py-2 rounded-md text-red-400 border border-red-500/30 hover:bg-red-500/10 font-semibold transition-colors flex justify-center items-center gap-2"
                >
                  <FiLogOut /> Cerrar Sesión
                </button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <button className="w-full py-2 rounded-md text-gray-300 border border-white/20 hover:bg-white/5 font-semibold transition-colors">
                      Login
                    </button>
                  </Link>
                  <Link to="/registro" onClick={() => setIsMenuOpen(false)}>
                    <button className="w-full py-2 rounded-md bg-yellow-500 text-[#141b2d] hover:bg-yellow-400 font-bold shadow-md">
                      Registro
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;