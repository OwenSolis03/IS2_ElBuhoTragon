import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Importamos App para usarlo como página principal
import App from "./App.jsx";

import Home from "./pages/Home.jsx";
import Cafeterias from "./pages/Cafeterias.jsx";
import Facultad from "./pages/Facultad.jsx";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import PlantillaCafeteria from "./pages/PlantillaCafeteria.jsx";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>

                {/* --- CAMBIO AQUÍ: Usamos App en la raíz para ver el mapa --- */}
                <Route path="/" element={<App />} />

                <Route path="/home" element={<Home />} />
                <Route path="/cafeterias" element={<Cafeterias />} />
                <Route path="/facultad" element={<Facultad />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Registro />} />

                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/cafeterias/:id" element={<PlantillaCafeteria />} />

            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);