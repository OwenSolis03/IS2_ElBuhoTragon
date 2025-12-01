import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Páginas Principales
import Home from "./pages/Home.jsx";
import Cafeterias from "./pages/Cafeterias.jsx";
import Facultad from "./pages/Facultad.jsx";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

// Plantilla Dinámica
import PlantillaCafeteria from "./pages/PlantillaCafeteria.jsx";

// --- NUEVAS PÁGINAS ---
import Terminos from "./pages/Terminos.jsx";
import Privacidad from "./pages/Privacidad.jsx";
import Contacto from "./pages/Contacto.jsx";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                {/* --- RUTAS GENERALES --- */}
                <Route path="/" element={<Home />} />
                <Route path="/cafeterias" element={<Cafeterias />} />
                <Route path="/facultad" element={<Facultad />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Registro />} />

                {/* --- RUTA DE ADMINISTRACIÓN --- */}
                <Route path="/admin/dashboard" element={<AdminDashboard />} />

                {/* --- RUTA DINÁMICA DE CAFETERÍAS --- */}
                <Route path="/cafeterias/:id" element={<PlantillaCafeteria />} />

                {/* --- RUTAS DEL FOOTER (NUEVAS) --- */}
                <Route path="/terminos" element={<Terminos />} />
                <Route path="/privacidad" element={<Privacidad />} />
                <Route path="/contacto" element={<Contacto />} />

            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);