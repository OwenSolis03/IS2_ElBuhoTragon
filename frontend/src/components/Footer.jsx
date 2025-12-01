// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom"; // Importamos Link para navegación interna
import { VscGithubAlt } from "react-icons/vsc";

const Footer = () => {
    return (
        <footer style={{
            backgroundColor: "#18181b",
            color: "#e4e4e7",
            textAlign: "center",
            padding: "2rem 1rem",
            marginTop: "auto",
            fontSize: "0.9rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)"
        }}>

            <a
                href="https://github.com/ComputerChemistry/Ing-Software-Proyecto-2025-1"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "#e4e4e7",
                    textDecoration: "none",
                    padding: "0.6rem 1.2rem",
                    borderRadius: "9999px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    transition: "all 0.2s ease",
                    fontSize: "0.9rem",
                    fontWeight: "500",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(234, 179, 8, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(234, 179, 8, 0.5)";
                    e.currentTarget.style.color = "#fbbf24";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.color = "#e4e4e7";
                }}
            >
                <VscGithubAlt size={20} />
                <span>Sigue El Búho Tragón en GitHub</span>
            </a>

            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                alignItems: "center"
            }}>
                <span style={{ fontWeight: "600", letterSpacing: "0.025em" }}>El Búho Tragón © 2025 - Universidad de Sonora</span>

                {/* ENLACES CORREGIDOS AQUI */}
                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "1.5rem",
                    fontSize: "0.85rem",
                    color: "#a1a1aa",
                    marginTop: "0.25rem"
                }}>
                    {/* Usamos Link en lugar de <a> para evitar la recarga o el # */}
                    <Link to="/terminos" style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s ease" }}>Términos</Link>
                    <Link to="/privacidad" style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s ease" }}>Privacidad</Link>
                    <Link to="/contacto" style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s ease" }}>Contacto</Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;