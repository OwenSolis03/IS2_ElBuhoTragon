// src/pages/Contacto.jsx
import React, { useState } from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiMail, FiMapPin, FiGithub } from 'react-icons/fi';

const Contacto = () => {
    const [enviado, setEnviado] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Aquí iría la conexión con el backend para enviar el correo real
        setEnviado(true);
    };

    return (
        // 1. ESTRUCTURA SEGURA (Fondo CSS Inline)
        <div style={{
            minHeight: "100vh",
            width: "100vw",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#141b2d", // Azul Nocturno Oficial
            color: "white",
            overflowX: "hidden",
            position: "relative"
        }}>
            <Header />

            {/* 2. CONTENIDO PRINCIPAL */}
            <main style={{ flexGrow: 1, paddingTop: '8rem' }} className="px-6 pb-20 w-full flex justify-center">
                
                <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-12">

                    {/* Columna Izquierda: Info */}
                    <div className="flex flex-col justify-center">
                        <h1 className="text-4xl font-extrabold text-white mb-6 tracking-tight">
                            Contáctanos
                        </h1>
                        <p className="text-gray-400 mb-8 text-lg leading-relaxed">
                            ¿Encontraste un error en el menú? ¿Quieres sugerir una nueva cafetería o reportar un bug?
                            <br />Estamos aquí para escucharte.
                        </p>

                        <div className="space-y-8">
                            <div className="flex items-start gap-4 group">
                                <div className="bg-[#1e2538] p-4 rounded-xl border border-white/10 text-yellow-500 group-hover:border-yellow-500/50 transition-colors shadow-lg">
                                    <FiMapPin size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Ubicación</h3>
                                    <p className="text-gray-400 text-sm mt-1">
                                        Universidad de Sonora<br/>
                                        Departamento de Matemáticas<br/>
                                        Licenciatura en Ciencias de la Computación<br/>
                                        Hermosillo, Sonora
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 group">
                                <div className="bg-[#1e2538] p-4 rounded-xl border border-white/10 text-yellow-500 group-hover:border-yellow-500/50 transition-colors shadow-lg">
                                    <FiMail size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Correo Electrónico</h3>
                                    <p className="text-gray-400 text-sm mt-1">a223201053@unison.mx</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 group">
                                <div className="bg-[#1e2538] p-4 rounded-xl border border-white/10 text-yellow-500 group-hover:border-yellow-500/50 transition-colors shadow-lg">
                                    <FiGithub size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Proyecto Open Source</h3>
                                    <a href="https://github.com/OwenSolis03/IS2_ElBuhoTragon" target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm mt-1 hover:underline">
                                        github.com/OwenSolis03/IS2_ElBuhoTragon
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Formulario (Glassmorphism) */}
                    <div className="bg-[#1e2538]/60 backdrop-blur-lg border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                        
                        {/* Decoración superior */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 to-yellow-400"></div>

                        {enviado ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-10 animate-fade-in">
                                <div className="text-green-400 text-7xl mb-6 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">✓</div>
                                <h3 className="text-3xl font-bold text-white mb-2">¡Mensaje Enviado!</h3>
                                <p className="text-gray-400 mb-8">Gracias por tus comentarios. El equipo del Búho los leerá pronto.</p>
                                <button
                                    onClick={() => setEnviado(false)}
                                    className="px-6 py-2 border border-yellow-500/50 text-yellow-500 rounded-full hover:bg-yellow-500 hover:text-[#141b2d] transition-all font-bold"
                                >
                                    Enviar otro mensaje
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <h2 className="text-2xl font-bold text-white mb-6">Envíanos un mensaje</h2>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Nombre</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-[#141b2d] border border-gray-600 rounded-xl p-3 text-white focus:border-yellow-500 focus:outline-none transition-colors placeholder-gray-600"
                                        placeholder="Tu nombre"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Correo</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-[#141b2d] border border-gray-600 rounded-xl p-3 text-white focus:border-yellow-500 focus:outline-none transition-colors placeholder-gray-600"
                                        placeholder="tucorreo@ejemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Mensaje</label>
                                    <textarea
                                        rows="4"
                                        required
                                        className="w-full bg-[#141b2d] border border-gray-600 rounded-xl p-3 text-white focus:border-yellow-500 focus:outline-none transition-colors resize-none placeholder-gray-600"
                                        placeholder="¿En qué podemos ayudarte?"
                                    ></textarea>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-[#141b2d] font-bold py-3.5 rounded-xl transition-transform transform hover:scale-[1.02] shadow-lg mt-2"
                                >
                                    Enviar Mensaje
                                </button>
                            </form>
                        )}
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Contacto;