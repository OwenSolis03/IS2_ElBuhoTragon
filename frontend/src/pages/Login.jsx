// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "../components/Header";
import Footer from "../components/Footer";

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
      console.log("Enviando:", { username, password }); 
      const res = await fetch("http://127.0.0.1:8000/api/login/", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // --- Guardar sesión y estado de ADMIN ---
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('username', data.username); 
        localStorage.setItem('es_admin', data.es_admin); // <--- ¡ESTA ES LA CLAVE!
        
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
      // alignItems: "center", <--- ESTO SE QUITÓ PARA QUE EL FOOTER SE ESTIRE
      position: "relative",
      overflowX: "hidden", // Importante
      boxSizing: "border-box" 
    }}>
    <Header />

    <main style={{
      flexGrow: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center", // Centramos el contenido AQUÍ
      justifyContent: "center",
      padding: "2rem",
      paddingTop: "8rem",
      width: "100%", // El main ocupa todo el ancho
    }}>
      <h1 style={{
        fontSize: "2rem",
        marginBottom: "2rem",
        fontWeight: "bold",
        textAlign: "center"
      }}>
        Ingrese su cuenta
      </h1>
      <div style={{
        backgroundColor: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(30px)",
        padding: "2rem",
        borderRadius: "1rem",
        width: "100%",
        maxWidth: "600px", 
        boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
      }}>
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
            Usuario
          </label>
          <input
            type="text"
            placeholder="👤 Ingresa tu usuario"
            style={inputStyle}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label style={{ display: "block", margin: "1rem 0 0.5rem", fontWeight: "bold" }}>
            Contraseña
          </label>
          <input
            type="password"
            placeholder="🔒 Ingresa tu contraseña"
            style={inputStyle}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}

          <button type="submit" style={buttonStyle} disabled={isLoading}>
            {isLoading ? 'Cargando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
    
    {/* El footer se estira al 100% */}
    <Footer />
    </div>
  );
};

const inputStyle = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: "0.5rem",
  border: "none",
  outline: "none",
  fontSize: "1rem",
  marginBottom: "0.5rem",
};

const buttonStyle = {
  width: "100%",
  marginTop: "1.5rem",
  padding: "0.75rem",
  backgroundColor: "#4b4e91",
  color: "#fff",
  fontWeight: "bold",
  border: "none",
  borderRadius: "0.5rem",
  cursor: "pointer",
  fontSize: "1rem",
  transition: "background-color 0.3s ease",
};

export default Login;