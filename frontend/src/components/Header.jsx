// src/components/Header.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { FiMenu, FiX, FiLogOut, FiUser, FiSettings, FiCompass, FiMap, FiBookOpen, FiMessageSquare } from "react-icons/fi";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleAssistant = () => {
    window.dispatchEvent(new CustomEvent("toggle-assistant"));
  };

  useEffect(() => {
    const handleAssistantState = (e) => {
      setIsAssistantOpen(!!e.detail?.isOpen);
    };
    window.addEventListener("assistant-state-changed", handleAssistantState);
    return () => window.removeEventListener("assistant-state-changed", handleAssistantState);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  // Bloquear scroll de fondo en móvil cuando el menú está abierto
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const checkUser = () => {
    const storedUser = localStorage.getItem("username");
    const adminStatus = localStorage.getItem("es_admin");

    if (storedUser) {
      setUsuario(storedUser);
      setEsAdmin(adminStatus === "1");
    } else {
      setUsuario(null);
      setEsAdmin(false);
    }
  };

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
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `relative py-1.5 text-sm tracking-[0.14em] uppercase transition-colors duration-200 flex items-center gap-2.5 ${
      isActive(path)
        ? "text-white font-semibold after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-[2px] after:bg-[#204a8e]"
        : "text-neutral-300 hover:text-white font-normal"
    }`;

  return (
    <header className="fixed top-0 w-full z-50 bg-[#071326]/95 backdrop-blur-md transition-all border-b border-white/[0.06]">
      {/* Filtro cromático de identidad UNISON para el Búho */}
      <svg className="absolute w-0 h-0 pointer-events-none opacity-0 overflow-hidden" aria-hidden="true" focusable="false">
        <filter id="buho-unison-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="-0.55 2.05 -0.45 0 0.08  -0.22 1.48 -0.02 0 0.01  1.05 -1.35 1.90 0 0.04  0 0 0 1 0"
          />
        </filter>
      </svg>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 sm:h-22">
          
          {/* --- MARCA E IDENTIDAD --- */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3.5 group" aria-label="Hungry Owl — Inicio">
              <img
                src={logo}
                alt=""
                style={{ filter: "url(#buho-unison-filter)" }}
                className="w-10 h-10 object-contain transition-all duration-200 group-hover:scale-105"
              />
              <div className="flex flex-col">
                <span className="font-display font-semibold text-2xl tracking-wider text-white group-hover:text-neutral-200 transition-colors uppercase">
                  Hungry Owl
                </span>
                <span className="text-xs tracking-[0.16em] uppercase font-sans text-neutral-300 -mt-0.5 font-medium">
                  UNISON Hermosillo
                </span>
              </div>
            </Link>
          </div>

          {/* --- NAVEGACIÓN PRINCIPAL (DESKTOP) EDITORIAL Y LIGERA --- */}
          <nav className="hidden md:flex items-center space-x-7 lg:space-x-9" aria-label="Navegación principal">
            <Link to="/" className={navLinkClass("/")} aria-current={isActive("/") ? "page" : undefined}>
              <FiCompass size={16} className={isActive("/") ? "text-[#204a8e]" : "text-neutral-400"} />
              <span>Explorar</span>
            </Link>

            <Link to="/facultad" className={navLinkClass("/facultad")} aria-current={isActive("/facultad") ? "page" : undefined}>
              <FiMap size={16} className={isActive("/facultad") ? "text-[#204a8e]" : "text-neutral-400"} />
              <span>Mapa</span>
            </Link>

            <Link to="/cafeterias" className={navLinkClass("/cafeterias")} aria-current={isActive("/cafeterias") ? "page" : undefined}>
              <FiBookOpen size={16} className={isActive("/cafeterias") ? "text-[#204a8e]" : "text-neutral-400"} />
              <span>Pasaporte</span>
            </Link>

            {esAdmin && (
              <Link
                to="/admin/dashboard"
                aria-current={isActive("/admin/dashboard") ? "page" : undefined}
                className={`py-1.5 text-sm tracking-[0.14em] uppercase transition-colors flex items-center gap-2 ${
                  isActive("/admin/dashboard")
                    ? "text-[#B39A3A] font-semibold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <FiSettings size={15} />
                <span>Admin</span>
              </Link>
            )}
          </nav>

          {/* --- SECCIÓN DE USUARIO / ACCIONES (DESKTOP) --- */}
          <div className="hidden md:flex items-center space-x-5">
            {/* Acceso discreto Asistente */}
            <button
              type="button"
              onClick={toggleAssistant}
              className={`relative py-1.5 text-sm tracking-[0.14em] uppercase transition-colors cursor-pointer flex items-center gap-2 ${
                isAssistantOpen
                  ? "text-white font-semibold after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-[2px] after:bg-[#B39A3A]"
                  : "text-neutral-300 hover:text-white font-normal"
              }`}
              title="Abrir Asistente Hungry Owl"
              aria-label="Abrir asistente de inteligencia artificial"
            >
              <FiMessageSquare size={15} className={isAssistantOpen ? "text-[#B39A3A]" : "text-neutral-400"} />
              <span>Asistente</span>
            </button>

            <span className="text-white/15 h-4 w-px" aria-hidden="true" />

            {usuario ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0a1830] border border-white/10 text-neutral-200 text-sm">
                  <div className="w-6 h-6 rounded-full bg-[#163A70] border border-[#204a8e]/50 flex items-center justify-center text-xs font-bold text-white uppercase">
                    {usuario.charAt(0)}
                  </div>
                  <span className="font-medium tracking-wide">{usuario}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 rounded-full border border-white/10 text-neutral-300 hover:text-white hover:border-white/20 transition-all text-sm font-medium tracking-wide flex items-center gap-2 cursor-pointer"
                  title="Cerrar sesión"
                >
                  <FiLogOut size={14} />
                  <span>Salir</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-sm font-medium tracking-wider uppercase text-neutral-300 hover:text-white transition-colors"
                >
                  Ingresar
                </Link>
                <Link
                  to="/registro"
                  className="px-5 py-2.5 text-sm font-medium tracking-wider uppercase bg-white hover:bg-neutral-200 text-black rounded-full transition-all duration-200 font-sans font-semibold"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>

          {/* --- BOTÓN MÓVIL (Mínimo 44x44px accesible) --- */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-neutral-200 hover:text-white p-2.5 rounded-xl bg-white/[0.05] border border-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
              aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* --- MENÚ DESPLEGABLE MÓVIL --- */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#071326] border-b border-white/10 px-4 pt-4 pb-8 space-y-2 shadow-2xl animate-fade-in max-h-[calc(100vh-80px)] overflow-y-auto">
          {usuario && (
            <div className="px-3 py-2.5 text-sm font-semibold text-neutral-200 border-b border-white/[0.08] mb-3 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#163A70] flex items-center justify-center text-xs text-white">
                {usuario.charAt(0).toUpperCase()}
              </div>
              <span>Conectado como {usuario}</span>
            </div>
          )}

          <Link
            to="/"
            className={`block px-4 py-3.5 rounded-xl text-base font-medium transition-colors ${
              isActive("/") ? "bg-white/[0.08] text-white font-semibold" : "text-neutral-300 hover:bg-white/[0.04]"
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Explorar
          </Link>
          <Link
            to="/facultad"
            className={`block px-4 py-3.5 rounded-xl text-base font-medium transition-colors ${
              isActive("/facultad") ? "bg-white/[0.08] text-white font-semibold" : "text-neutral-300 hover:bg-white/[0.04]"
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Mapa del Campus
          </Link>
          <Link
            to="/cafeterias"
            className={`block px-4 py-3.5 rounded-xl text-base font-medium transition-colors ${
              isActive("/cafeterias") ? "bg-white/[0.08] text-white font-semibold" : "text-neutral-300 hover:bg-white/[0.04]"
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Pasaporte Tragón
          </Link>

          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              toggleAssistant();
            }}
            className="w-full text-left px-4 py-3.5 rounded-xl text-base font-medium text-neutral-300 hover:bg-white/[0.04] flex items-center gap-3 cursor-pointer"
          >
            <FiMessageSquare size={18} className="text-[#B39A3A]" />
            <span>Asistente Hungry Owl</span>
          </button>

          {esAdmin && (
            <Link
              to="/admin/dashboard"
              className={`block px-4 py-3.5 rounded-xl text-base font-semibold transition-colors text-[#B39A3A] ${
                isActive("/admin/dashboard") ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Panel de Administración
            </Link>
          )}

          <div className="pt-4 mt-3 border-t border-white/[0.08]">
            {usuario ? (
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3.5 rounded-xl text-base text-rose-300 hover:bg-rose-500/10 flex items-center gap-2.5 cursor-pointer"
              >
                <FiLogOut size={18} />
                <span>Cerrar sesión ({usuario})</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full text-center py-3 px-4 rounded-full border border-white/15 text-sm font-mono uppercase tracking-wider text-neutral-200 hover:text-white"
                >
                  Ingresar
                </Link>
                <Link
                  to="/registro"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full text-center py-3 px-4 rounded-full bg-white text-black text-sm font-mono uppercase tracking-wider font-semibold hover:bg-neutral-200"
                >
                  Registro
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;