import React from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";

const Privacidad = () => {
    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
            <Header />

            <main className="flex-grow container mx-auto px-6 py-20 max-w-4xl">
                <h1 className="text-4xl font-bold text-yellow-400 mb-8 border-b border-gray-700 pb-4">
                    Aviso de Privacidad
                </h1>

                <div className="space-y-6 text-gray-300 leading-relaxed text-lg">
                    <p className="italic text-gray-400">
                        Última actualización: Diciembre 2025
                    </p>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-2">1. Recopilación de Datos</h2>
                        <p>
                            Queremos ser transparentes: <strong>Este sitio web no utiliza cookies de rastreo de terceros ni vende tu información</strong>.
                            Respetamos tu privacidad como estudiante y usuario de la comunidad universitaria.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-2">2. Información de Registro</h2>
                        <p>
                            Si decides registrarte en nuestra plataforma, únicamente almacenamos tu nombre de usuario, contraseña (encriptada) y correo electrónico.
                            Estos datos se utilizan exclusivamente para permitirte acceder a funciones personalizadas.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-2">3. Uso de Ubicación (GPS)</h2>
                        <p>
                            La funcionalidad de mapas puede solicitar acceso a tu ubicación GPS únicamente para mostrarte las cafeterías más cercanas en tiempo real.
                            Esta información de ubicación se procesa en tu dispositivo y no se almacena en nuestros servidores.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-2">4. Contacto</h2>
                        <p>
                            Si tienes dudas sobre cómo manejamos tus datos, puedes contactarnos a través de la sección de Contacto.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Privacidad;