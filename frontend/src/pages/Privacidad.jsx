// src/pages/Privacidad.jsx
import React from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";

const Privacidad = () => {
    return (
        // 1. ESTRUCTURA EXACTA DE REGISTRO.JSX (Garantiza que el fondo no se rompa)
        <div style={{
            margin: 0,
            padding: 0,
            width: "100vw",
            minHeight: "100vh",
            backgroundColor: "#141b2d",
            backgroundSize: "100% 100%", // Clave para que cubra todo
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
                justifyContent: "center", // Centrado vertical si hay poco texto
                padding: "2rem",
                paddingTop: "6rem",
                width: "100%"
            }}>
                
                {/* TARJETA GLASSMORPHISM */}
                <div className="max-w-4xl w-full bg-[#1e2538]/60 backdrop-blur-lg border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative">
                    
                    {/* Detalle decorativo superior (Barra Dorada) */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-1 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] rounded-b-full"></div>

                    <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-8 border-b border-white/10 pb-6 tracking-tight text-center">
                        Aviso de Privacidad
                    </h1>

                    <div className="space-y-8 text-gray-300 leading-relaxed text-base md:text-lg">
                        <p className="italic text-gray-500 text-sm text-center">
                            Última actualización: Diciembre 2025
                        </p>

                        <section>
                            <h2 className="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2">
                                1. Recopilación de Datos
                            </h2>
                            <p>
                                Queremos ser transparentes: <strong className="text-white">Este sitio web no utiliza cookies de rastreo de terceros ni vende tu información</strong>.
                                Respetamos tu privacidad como estudiante y usuario de la comunidad universitaria.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2">
                                2. Información de Registro
                            </h2>
                            <p>
                                Si decides registrarte en nuestra plataforma, únicamente almacenamos tu nombre de usuario, contraseña (encriptada) y correo electrónico.
                                Estos datos se utilizan exclusivamente para permitirte acceder a funciones personalizadas.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2">
                                3. Uso de Ubicación (GPS)
                            </h2>
                            <p>
                                La funcionalidad de mapas puede solicitar acceso a tu ubicación GPS únicamente para mostrarte las cafeterías más cercanas en tiempo real.
                                Esta información se procesa localmente en tu dispositivo y <strong className="text-white">nunca se almacena en nuestros servidores</strong>.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2">
                                4. Contacto
                            </h2>
                            <p>
                                Si tienes dudas sobre cómo manejamos tus datos, puedes contactarnos a través de los canales oficiales de la Universidad de Sonora.
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Privacidad;