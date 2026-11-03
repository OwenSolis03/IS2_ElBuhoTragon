// src/pages/Registro.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom"; 
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatWidget from "../components/ChatWidget";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { API_URL } from "../config";

const Registro = () => {
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [email, setEmail] = useState("");
  
  const [mensaje, setMensaje] = useState("");
  const [esError, setEsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje("");
    setEsError(false);

    if (!nombreUsuario || !contrasena || !email) {
      setMensaje("Todos los campos son obligatorios.");
      setEsError(true);
      setIsLoading(false);
      return;
    }

    if (!email.endsWith("@unison.mx")) {
      setMensaje("El registro requiere un correo institucional (@unison.mx).");
      setEsError(true);
      setIsLoading(false);
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre_usuario: nombreUsuario,
          contrasena: contrasena,
          email: email
        })
      });

      if (respuesta.ok) {
        setMensaje("Registro exitoso. Tu cuenta ha sido creada, ya puedes iniciar sesión.");
        setEsError(false);
        setNombreUsuario("");
        setContrasena("");
        setEmail("");
      } else {
        const contentType = respuesta.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await respuesta.json();
          let errorMessage = "Error al completar el registro.";
          
          if (errorData.nombre_usuario) errorMessage = `Usuario: ${errorData.nombre_usuario[0]}`;
          else if (errorData.email) errorMessage = `Email: ${errorData.email[0]}`;
          else if (errorData.contrasena) errorMessage = `Contraseña: ${errorData.contrasena[0]}`;
          else if (errorData.detail) errorMessage = errorData.detail;

          setMensaje(errorMessage);
        } else {
          console.error("Error del servidor:", await respuesta.text());
          setMensaje("Error interno del servidor universitario. Por favor intenta más tarde.");
        }
        setEsError(true);
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      setMensaje("Error de conexión con el servidor. Verifica tu red.");
      setEsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0e2246] text-[#F2F2F0] flex flex-col font-sans selection:bg-[#163A70] selection:text-white">
      <Header />

      <main className="flex-grow flex items-center justify-center pt-32 pb-24 px-4 sm:px-6 lg:px-8 w-full">
        <div className="w-full max-w-md mx-auto">
          
          {/* Encabezado Editorial */}
          <div className="text-center mb-8">
            <span className="font-mono text-sm uppercase tracking-[0.22em] text-[#B39A3A] block mb-3 font-medium">
              Comunidad Universitaria UNISON
            </span>
            <h1 className="font-display text-4xl sm:text-5xl text-[#F2F2F0] font-normal tracking-tight mb-2.5">
              Crear Cuenta
            </h1>
            <p className="text-neutral-200 text-base font-light leading-relaxed">
              Regístrate con tu correo institucional para evaluar las cafeterías del campus.
            </p>
          </div>

          {/* Formulario */}
          <form 
            onSubmit={handleSubmit} 
            className="p-8 sm:p-9 rounded-2xl bg-[#0a1830] border border-white/[0.1] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)]"
          >
            {mensaje && (
              <div 
                className={`p-4 rounded-xl text-sm font-mono flex items-center gap-2.5 mb-6 animate-fade-in ${
                  esError 
                    ? "bg-rose-950/40 border border-rose-500/40 text-rose-300" 
                    : "bg-emerald-950/40 border border-emerald-500/40 text-emerald-300"
                }`}
                role="alert"
              >
                {esError ? <FiAlertCircle size={17} className="flex-shrink-0 text-rose-400" /> : <FiCheckCircle size={17} className="flex-shrink-0 text-emerald-400" />}
                <span>{mensaje}</span>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label 
                  htmlFor="register-username" 
                  className="block font-mono text-xs uppercase tracking-wider text-neutral-200 mb-2 font-medium"
                >
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <input
                    id="register-username"
                    type="text"
                    required
                    value={nombreUsuario}
                    onChange={(e) => setNombreUsuario(e.target.value)}
                    placeholder="ej. buho_21"
                    className="w-full bg-[#071326] border border-white/[0.14] focus:border-[#B39A3A] text-white text-base rounded-xl px-4 py-3.5 placeholder-neutral-400 focus:outline-none transition-colors pr-11 font-sans"
                  />
                  <FiUser className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-neutral-400 pointer-events-none" size={17} />
                </div>
              </div>

              <div>
                <label 
                  htmlFor="register-email" 
                  className="block font-mono text-xs uppercase tracking-wider text-neutral-200 mb-2 font-medium"
                >
                  Correo Institucional
                </label>
                <div className="relative">
                  <input
                    id="register-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="a22000000@unison.mx"
                    className="w-full bg-[#071326] border border-white/[0.14] focus:border-[#B39A3A] text-white text-base rounded-xl px-4 py-3.5 placeholder-neutral-400 focus:outline-none transition-colors pr-11 font-sans"
                  />
                  <FiMail className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-neutral-400 pointer-events-none" size={17} />
                </div>
                <span className="font-mono text-xs text-neutral-300 mt-1.5 block">
                  Debe pertenecer al dominio @unison.mx
                </span>
              </div>

              <div>
                <label 
                  htmlFor="register-password" 
                  className="block font-mono text-xs uppercase tracking-wider text-neutral-200 mb-2 font-medium"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={mostrarContrasena ? "text" : "password"}
                    required
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#071326] border border-white/[0.14] focus:border-[#B39A3A] text-white text-base rounded-xl px-4 py-3.5 pr-11 placeholder-neutral-400 focus:outline-none transition-colors font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarContrasena(!mostrarContrasena)}
                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    aria-label={mostrarContrasena ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {mostrarContrasena ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 mt-2 bg-white text-black font-sans text-sm font-mono uppercase tracking-wider rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer font-semibold"
              >
                {isLoading ? "Registrando usuario..." : "Crear Cuenta"}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.08] text-center">
              <p className="text-sm text-neutral-200 font-light">
                ¿Ya cuentas con usuario registrado?{" "}
                <Link to="/login" className="text-white hover:text-[#B39A3A] underline font-medium ml-1 transition-colors">
                  Iniciar sesión
                </Link>
              </p>
            </div>
          </form>

        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
};

export default Registro;