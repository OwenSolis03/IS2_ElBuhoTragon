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
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
            <Header />

            <main className="flex-grow container mx-auto px-6 py-20">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">

                    {/* Columna Izquierda: Info */}
                    <div>
                        <h1 className="text-4xl font-bold text-yellow-400 mb-6">Contáctanos</h1>
                        <p className="text-gray-300 mb-8 text-lg">
                            ¿Encontraste un error en el menú? ¿Quieres sugerir una nueva cafetería o reportar un bug?
                            Estamos aquí para escucharte.
                        </p>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-gray-800 p-3 rounded-lg text-orange-400">
                                    <FiMapPin size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Ubicación</h3>
                                    <p className="text-gray-400">Universidad de Sonora<br/>Departamento de Matematicas<br/>Licenciatura en Ciencias de la Computacion<br/>Hermosillo, Sonora</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="bg-gray-800 p-3 rounded-lg text-orange-400">
                                    <FiMail size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Correo Electrónico</h3>
                                    <p className="text-gray-400">a223201053@unison.mx</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="bg-gray-800 p-3 rounded-lg text-orange-400">
                                    <FiGithub size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Proyecto Open Source</h3>
                                    <p className="text-gray-400">https://github.com/OwenSolis03/IS2_ElBuhoTragon</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Formulario */}
                    <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
                        {enviado ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-10">
                                <div className="text-green-400 text-6xl mb-4">✓</div>
                                <h3 className="text-2xl font-bold mb-2">¡Mensaje Enviado!</h3>
                                <p className="text-gray-400">Gracias por tus comentarios. Te responderemos pronto.</p>
                                <button
                                    onClick={() => setEnviado(false)}
                                    className="mt-6 text-yellow-400 hover:text-yellow-300 underline font-semibold"
                                >
                                    Enviar otro mensaje
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-yellow-400 focus:outline-none transition-colors"
                                        placeholder="Tu nombre"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Correo</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-yellow-400 focus:outline-none transition-colors"
                                        placeholder="tucorreo@ejemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Mensaje</label>
                                    <textarea
                                        rows="4"
                                        required
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-yellow-400 focus:outline-none transition-colors resize-none"
                                        placeholder="¿En qué podemos ayudarte?"
                                    ></textarea>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 rounded-lg transition-transform transform hover:scale-[1.02] shadow-md"
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