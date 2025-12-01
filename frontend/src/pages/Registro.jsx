// src/pages/Registro.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom"; 
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiUserPlus, FiAlertCircle, FiCheckCircle } from "react-icons/fi";

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

    // 1. Validación de Campos Vacíos
    if (!nombreUsuario || !contrasena || !email) {
      setMensaje("Todos los campos son obligatorios.");
      setEsError(true);
      setIsLoading(false);
      return;
    }

    // 2. NUEVA VALIDACIÓN: Correo Institucional
    // Verificamos si el string del email termina exactamente en "@unison.mx"
    if (!email.endsWith("@unison.mx")) {
        setMensaje("Lo sentimos, solo estudiantes con correo institucional (@unison.mx) pueden registrarse.");
        setEsError(true);
        setIsLoading(false); // Detenemos la carga
        return; // Detenemos la ejecución, no se envía nada al servidor
    }

    try {
      // Usamos el endpoint estándar del modelo Usuarios
      const respuesta = await fetch("http://127.0.0.1:8000/api/Usuarios/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre_usuario: nombreUsuario,
          contrasena: contrasena,
          email: email,
          es_admin: 0 
        })
      });

      if (respuesta.ok) {
        setMensaje("¡Registro exitoso! Ya puedes iniciar sesión.");
        setEsError(false);
        setNombreUsuario("");
        setContrasena("");
        setEmail("");
      } else {
        const contentType = respuesta.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const errorData = await respuesta.json();
            let errorMessage = "Error al registrar.";
            
            if (errorData.nombre_usuario) errorMessage = `Usuario: ${errorData.nombre_usuario[0]}`;
            else if (errorData.email) errorMessage = `Email: ${errorData.email[0]}`;
            else if (errorData.contrasena) errorMessage = `Contraseña: ${errorData.contrasena[0]}`;
            else if (errorData.detail) errorMessage = errorData.detail;

            setMensaje(errorMessage);
        } else {
            console.error("Error del servidor (No es JSON):", await respuesta.text());
            setMensaje("Hubo un problema interno en el servidor. Intenta más tarde.");
        }
        setEsError(true);
      }
    } catch (error) {
      console.error("Error de red o parsing:", error);
      setMensaje("Ocurrió un error inesperado. Por favor intenta de nuevo.");
      setEsError(true);
    } finally {
        setIsLoading(false);
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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        paddingTop: "6rem", 
        width: "100%" 
      }}>
        
        <div className="w-full max-w-md bg-[#1e2538]/60 backdrop-blur-lg border border-white/10 p-8 rounded-2xl shadow-2xl relative">
          
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] rounded-b-full"></div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Crear Cuenta
            </h1>
            <p className="text-gray-400 text-sm mt-2">
                Únete a la comunidad del Búho Tragón
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300 ml-1">Nombre de usuario</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="text-gray-400 group-focus-within:text-green-400 transition-colors" size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Ej. buho_master_23"
                        value={nombreUsuario}
                        onChange={(e) => setNombreUsuario(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#141b2d] border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                        required
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300 ml-1">Correo Electrónico</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiMail className="text-gray-400 group-focus-within:text-green-400 transition-colors" size={20} />
                    </div>
                    <input
                        type="email"
                        placeholder="tucorreo@unison.mx"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#141b2d] border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                        required
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300 ml-1">Contraseña</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="text-gray-400 group-focus-within:text-green-400 transition-colors" size={20} />
                    </div>
                    <input
                        type={mostrarContrasena ? "text" : "password"}
                        placeholder="••••••••"
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 bg-[#141b2d] border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setMostrarContrasena(!mostrarContrasena)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                        {mostrarContrasena ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                    </button>
                </div>
            </div>

            {/* SECCIÓN DE MENSAJES (ERROR O ÉXITO) */}
            {mensaje && (
                <div className={`
                    rounded-lg p-3 flex items-start gap-2 text-sm border animate-fade-in
                    ${esError 
                        ? "bg-red-500/10 border-red-500/50 text-red-400" 
                        : "bg-green-500/10 border-green-500/50 text-green-400"}
                `}>
                    {/* Icono dinámico según el tipo de mensaje */}
                    {esError ? (
                        <FiAlertCircle className="mt-0.5 min-w-[18px]" size={18} />
                    ) : (
                        <FiCheckCircle className="mt-0.5 min-w-[18px]" size={18} />
                    )}
                    <span className="leading-snug">{mensaje}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className={`
                    w-full flex items-center justify-center gap-2 py-3 px-4 
                    bg-green-600 text-white font-bold rounded-lg shadow-lg
                    hover:bg-green-500 hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                {isLoading ? "Creando cuenta..." : (
                    <>
                        Registrarse <FiUserPlus size={20} />
                    </>
                )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
             ¿Ya tienes cuenta?{' '}
             <Link to="/login" className="text-green-400 hover:text-green-300 font-semibold hover:underline decoration-green-400/50 underline-offset-4">
               Inicia sesión
             </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Registro;