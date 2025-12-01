import React from 'react';
import CampusMap from './components/CampusMap'; // Importamos el mapa nuevo
import CafeCardGlass from "./components/CafeCardGlass";

function App() {
    return (
        <div className="p-4 md:p-8 bg-gray-900 min-h-screen text-white flex flex-col gap-6">

            {/* Encabezado */}
            <header className="mb-2 text-center md:text-left">
                <h1 className="text-4xl font-bold text-yellow-400 mb-2">
                    Mapa del Búho Tragón 🦉
                </h1>
                <p className="text-gray-400">
                    Explora todas las cafeterías del campus en tiempo real.
                </p>
            </header>

            {/* --- AQUÍ VA EL MAPA --- */}
            {/* Es importante darle altura (h-96 o h-[500px]) para que se vea */}
            <section className="w-full h-[60vh] md:h-[500px]">
                <CampusMap />
            </section>

            {/* Sección informativa extra */}
            <section className="text-center text-gray-500 text-sm mt-4">
                <p>Haz clic en un marcador para ver el horario y el menú.</p>
            </section>

        </div>
    );
}

export default App;