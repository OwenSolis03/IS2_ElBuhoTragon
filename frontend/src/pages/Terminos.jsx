// src/pages/Terminos.jsx
import React from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";

const Terminos = () => {
    return (
        // 1. ESTRUCTURA SEGURA (Fondo CSS Inline)
        <div style={{
            margin: 0,
            padding: 0,
            width: "100vw",
            minHeight: "100vh",
            backgroundColor: "#141b2d", // Fondo Azul Nocturno
            backgroundSize: "100% 100%", // Clave para cubrir toda la pantalla
            color: "white",
            paddingTop: "3.2rem",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflowX: "hidden",
            boxSizing: "border-box"
        }}>
            <Header />

            {/* 2. CONTENIDO PRINCIPAL */}
            <main style={{ 
                flexGrow: 1, 
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "2rem",
                paddingTop: "6rem",
                width: "100%"
            }}>
                
                {/* 3. TARJETA GLASSMORPHISM */}
                <div className="max-w-4xl w-full bg-[#1e2538]/60 backdrop-blur-lg border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative">
                    
                    {/* Detalle decorativo superior */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-1 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] rounded-b-full"></div>

                    <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-8 border-b border-white/10 pb-6 tracking-tight text-center">
                        Términos y Condiciones
                    </h1>

                    <div className="space-y-8 text-gray-300 leading-relaxed text-base md:text-lg">
                        
                        <section>
                            <h2 className="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2">
                                1. Sobre el Proyecto
                            </h2>
                            <p>
                                "El Búho Tragón" es un proyecto académico desarrollado por estudiantes de la <strong>Universidad de Sonora</strong>.
                                El objetivo principal es facilitar la visualización de menús y ubicaciones de las cafeterías dentro del campus universitario.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2">
                                2. Uso de la Información
                            </h2>
                            <p>
                                La información mostrada (precios, horarios, menús y disponibilidad) es recopilada con fines informativos. Aunque nos esforzamos por mantener los datos actualizados,
                                no garantizamos la exactitud total en tiempo real. Los precios pueden variar sin previo aviso en los establecimientos físicos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2">
                                3. Propiedad Intelectual
                            </h2>
                            <p>
                                Todos los logotipos, marcas y nombres comerciales de las cafeterías mencionados pertenecen a sus respectivos dueños.
                                El código fuente de este proyecto es propiedad intelectual de sus desarrolladores.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2">
                                4. Limitación de Responsabilidad
                            </h2>
                            <p>
                                Este sitio web no procesa pagos reales ni realiza pedidos físicos. No nos hacemos responsables por inconvenientes derivados del uso de la información aquí presentada.
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Terminos;