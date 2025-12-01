import React from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";

const Terminos = () => {
    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
            <Header />

            <main className="flex-grow container mx-auto px-6 py-20 max-w-4xl">
                <h1 className="text-4xl font-bold text-yellow-400 mb-8 border-b border-gray-700 pb-4">
                    Términos y Condiciones
                </h1>

                <div className="space-y-6 text-gray-300 leading-relaxed text-lg">
                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-2">1. Sobre el Proyecto</h2>
                        <p>
                            "El Búho Tragón" es un proyecto académico desarrollado por estudiantes de la <strong>Universidad de Sonora</strong>.
                            El objetivo principal es facilitar la visualización de menús y ubicaciones de las cafeterías dentro del campus universitario.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-2">2. Uso de la Información</h2>
                        <p>
                            La información mostrada (precios, horarios, menús y disponibilidad) es recopilada con fines informativos. Aunque nos esforzamos por mantener los datos actualizados,
                            no garantizamos la exactitud total en tiempo real. Los precios pueden variar sin previo aviso en los establecimientos físicos.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-2">3. Propiedad Intelectual</h2>
                        <p>
                            Todos los logotipos, marcas y nombres comerciales de las cafeterías mencionados pertenecen a sus respectivos dueños.
                            El código fuente de este proyecto es propiedad intelectual de sus desarrolladores.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-2">4. Limitación de Responsabilidad</h2>
                        <p>
                            Este sitio web no procesa pagos reales ni realiza pedidos físicos. No nos hacemos responsables por inconvenientes derivados del uso de la información aquí presentada.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Terminos;