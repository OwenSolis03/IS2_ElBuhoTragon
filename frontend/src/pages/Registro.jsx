// src/pages/Registro.jsx
import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom"; 

const Registro = () => {
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [email, setEmail] = useState(""); 
  const [contrasena, setContrasena] = useState("");
  const [confirmContrasena, setConfirmContrasena] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [esExito, setEsExito] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje(""); 

    const requiredDomain = "@unison.mx";

    // 1. Validar campos requeridos
    if (!nombreUsuario || !email || !contrasena || !confirmContrasena) {
      setMensaje("Todos los campos son obligatorios.");
      setEsExito(false);
      return;
    }

    // 2. Validar Dominio de Correo (unison.mx)
    if (!email.toLowerCase().endsWith(requiredDomain)) {
      setMensaje(`El correo debe ser institucional de la Universidad de Sonora (${requiredDomain}).`);
      setEsExito(false);
      return;
    }

    // 3. Validar Coincidencia de Contraseña
    if (contrasena !== confirmContrasena) {
      setMensaje("Las contraseñas no coinciden.");
      setEsExito(false);
      return;
    }

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        // CAMBIO CLAVE: Incluir el email en el payload
        body: JSON.stringify({
          nombre_usuario: nombreUsuario,
          email: email, // <-- ¡ENVIANDO CORREO AL BACKEND!
          contrasena: contrasena
        })
      });

      if (respuesta.ok) {
        // const data = await respuesta.json(); // No se usa data en este bloque
        setMensaje("¡Cuenta creada con éxito! Serás redirigido al login.");
        setEsExito(true);
        setNombreUsuario("");
        setEmail("");
        setContrasena("");
        setConfirmContrasena("");
        setTimeout(() => navigate('/login'), 2000); // Redirigir al login
      } else {
        const errorData = await respuesta.json();
        setMensaje(errorData.mensaje || "Error al registrar. Verifica si el usuario ya existe.");
        setEsExito(false);
      }
    } catch (error) {
      console.error("Error al enviar datos:", error);
      setMensaje("No se pudo conectar con el servidor. Verifica que el backend esté activo.");
      setEsExito(false);
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
        paddingTop: "8rem",
        width: "100%"
      }}>
        <h1 style={{
          fontSize: "2rem",
          marginBottom: "2rem",
          fontWeight: "bold",
          textAlign: "center"
        }}>
          Crear una cuenta nueva
        </h1>

        <div style={{
          backgroundColor: "rgba(0,0,0,0.25)",
          backdropFilter: "blur(8px)",
          padding: "2rem",
          borderRadius: "1rem",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 8px 16px rgba(0,0,0,0.3)"
        }}>
          <form onSubmit={handleSubmit}>
            
            {/* Campo Usuario */}
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
              Nombre de usuario
            </label>
            <input
              type="text"
              placeholder="usuario123"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              style={inputStyle}
            />

            {/* Campo Correo */}
            <label style={{ display: "block", margin: "1rem 0 0.5rem", fontWeight: "bold" }}>
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="alumno@unison.mx"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />

            {/* Campo Contraseña */}
            <label style={{ display: "block", margin: "1rem 0 0.5rem", fontWeight: "bold" }}>
              Contraseña
            </label>
            <input
              type={mostrarContrasena ? "text" : "password"}
              placeholder="Crea tu contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              style={inputStyle}
            />

            {/* Campo Verificar Contraseña */}
            <label style={{ display: "block", margin: "1rem 0 0.5rem", fontWeight: "bold" }}>
              Verificar Contraseña
            </label>
            <input
              type={mostrarContrasena ? "text" : "password"}
              placeholder="Repite la contraseña"
              value={confirmContrasena}
              onChange={(e) => setConfirmContrasena(e.target.value)}
              style={inputStyle}
            />

            <div style={{ marginTop: "0.5rem", textAlign: "left" }}>
              <label style={{ fontSize: "0.85rem" }}>
                <input
                  type="checkbox"
                  checked={mostrarContrasena}
                  onChange={() => setMostrarContrasena(!mostrarContrasena)}
                  style={{ marginRight: "0.5rem" }}
                />
                Mostrar contraseña
              </label>
            </div>

            <button type="submit" style={buttonStyle}>
              Registrarse
            </button>

            {mensaje && (
              <p style={{ marginTop: "1rem", color: esExito ? 'lightgreen' : 'red', textAlign: "center" }}>
                {mensaje}
              </p>
            )}
          </form>
        </div>
      </main>

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
  marginBottom: "0.5rem"
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
  transition: "background-color 0.3s ease"
};

export default Registro;