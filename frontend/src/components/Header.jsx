// src/components/Header.jsx
import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png"; //

const Header = () => {
  // Define el estilo común para los enlaces de texto
  const linkStyle = "text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out";

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-gray-900/70 backdrop-blur-md shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cambiado a 'relative' para posicionar el logo en el centro */}
        <div className="relative flex items-center justify-between h-16">

          {/* Sección Izquierda: Navegación Principal (antes centro) */}
          {/* Oculta en pantallas pequeñas */}
          <nav className="hidden md:flex items-center space-x-4">
             <Link to="/cafeterias" className={linkStyle}>
               Cafeterías
             </Link>
             <Link to="/facultad" className={linkStyle}>
               Mapa
             </Link>
             {/* Puedes añadir más enlaces aquí si es necesario */}
          </nav>
          {/* Placeholder para mantener el espacio en móvil si es necesario */}
          <div className="md:hidden flex-1"></div>


          {/* Sección Central: Logo y Nombre (Posicionado Absolutamente) */}
          {/* 'absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2' para centrar */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Link to="/" className="flex items-center gap-2 text-decoration-none"> {/* Reducido gap */}
              <img src={logo} alt="Logo El Búho Tragón" className="h-9 w-9" /> {/* Ligeramente más pequeño */}
              <span className="text-lg font-bold text-white hidden sm:inline"> {/* Oculta texto en extra-pequeño */}
                El Búho Tragón
              </span>
            </Link>
          </div>


          {/* Sección Derecha: Login y Registro */}
          {/* Placeholder para mantener el espacio en móvil */}
           <div className="md:hidden flex-1"></div>
           {/* Oculta en pantallas pequeñas */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/login" className={linkStyle}>
              Login
            </Link>
            <Link to="/registro" className={linkStyle}>
              Registro
            </Link>
          </div>

          {/* --- INICIO: Botones visibles solo en pantallas pequeñas (Menú Hamburguesa y Auth) --- */}
          <div className="md:hidden flex items-center space-x-2">
              <Link to="/login" className={linkStyle}>
                 Login
              </Link>
              <Link to="/registro" className={linkStyle}>
                 Registro
              </Link>
              {/* Aquí podrías añadir un botón de menú hamburguesa si la nav izquierda crece */}
              {/* <button>...</button> */}
          </div>
          {/* --- FIN: Botones visibles solo en pantallas pequeñas --- */}

        </div>
      </div>
    </header>
  );
};

export default Header;