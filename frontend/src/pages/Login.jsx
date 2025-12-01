// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiUser, FiLock, FiLogIn, FiAlertCircle } from "react-icons/fi"; // Iconos

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch("http://127.0.0.1:8000/api/login/", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // --- Guardar sesión ---
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('username', data.username); 
        localStorage.setItem('es_admin', data.es_admin);
        
        // Avisar a la app que hubo un login
        window.dispatchEvent(new Event("storage"));
        
        navigate('/');
      } else {
        setError(data.error || 'Credenciales inválidas');
      }

    } catch (err) {
      console.error(err);
      setError('Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 1. MANTENEMOS TU CONTENEDOR ORIGINAL EXACTO (CSS INLINE)
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
        paddingTop: "4rem", // Un pequeño ajuste para que no choque con el header
        width: "100%",
      }}>
        
        {/* 2. AQUÍ EMPIEZA EL DISEÑO MODERNO (Refactorizado con Tailwind dentro del contenedor seguro) */}
        
        {/* Tarjeta Glassmorphism */}
        <div className="w-full max-w-md bg-[#1e2538]/60 backdrop-blur-lg border border-white/10 p-8 rounded-2xl shadow-2xl relative">
          
          {/* Decoración superior (Brillo dorado) */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] rounded-b-full"></div>

          <div className="text-center mb-8">
             <h1 className="text-3xl font-extrabold text-white tracking-tight">
               Bienvenido
             </h1>
             <p className="text-gray-400 text-sm mt-2">
               Ingresa tus credenciales para continuar
             </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Input Usuario */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Usuario</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="text-gray-400 group-focus-within:text-yellow-500 transition-colors" size={20} />
                </div>
                <input
                  type="text"
                  placeholder="Tu nombre de usuario"
                  className="w-full pl-10 pr-4 py-3 bg-[#141b2d] border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Contraseña</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="text-gray-400 group-focus-within:text-yellow-500 transition-colors" size={20} />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-[#141b2d] border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Mensaje de Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm animate-pulse">
                <FiAlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full flex items-center justify-center gap-2 py-3 px-4 
                bg-yellow-500 text-[#141b2d] font-bold rounded-lg shadow-lg
                hover:bg-yellow-400 hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-200
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isLoading ? (
                "Cargando..."
              ) : (
                <>
                  Ingresar <FiLogIn size={20} />
                </>
              )}
            </button>
          </form>

          {/* Footer del Login (Link a Registro) */}
          <div className="mt-8 text-center text-sm text-gray-400">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-yellow-500 hover:text-yellow-400 font-semibold hover:underline decoration-yellow-500/50 underline-offset-4">
              Regístrate aquí
            </Link>
          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Login;