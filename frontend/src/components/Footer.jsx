// src/components/Footer.jsx
import React from "react";
// IMPORTANTE: Importamos Link para la navegación interna
import { Link } from "react-router-dom"; 
import UnisonLogo from "../assets/unison-logo.png";

const Footer = () => {
  return (
    <footer className="w-full relative mt-auto">
      
      {/* Línea divisoria sutil */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-yellow-600/30 to-transparent"></div>

      <div style={{
        backgroundColor: "#0b101b",
        color: "#a1a1aa",
        padding: "1.5rem 1rem", 
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.8rem", 
      }}>

        {/* 1. LOGO UNISON */}
        <div className="flex flex-col items-center">
            <img 
                src={UnisonLogo} 
                alt="Logo Universidad de Sonora" 
                className="h-12 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity duration-300"
            />
        </div>

        {/* 2. TEXTO PRINCIPAL Y LEGAL */}
        <div className="text-center flex flex-col gap-1">
            <p className="text-xs text-gray-400">
                El Búho Tragón © 2025 • Universidad de Sonora
            </p>
            
            {/* ENLACES DE NAVEGACIÓN */}
            <div className="flex justify-center gap-4 text-[10px] uppercase tracking-wider font-medium text-gray-600 mt-1">
                <Link to="/terminos" className="hover:text-yellow-500 transition-colors">
                    Términos
                </Link>
                
                <Link to="/privacidad" className="hover:text-yellow-500 transition-colors">
                    Privacidad
                </Link>
                
                <Link to="/contacto" className="hover:text-yellow-500 transition-colors">
                    Contacto
                </Link>
            </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;