import React, { useState, useRef, useEffect } from "react";
import { FiMessageSquare, FiX, FiSend, FiLoader } from "react-icons/fi";
import logo from "../assets/logo.png";

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState([
        {
            type: "bot",
            text: "¡Hola! Soy el Buhito 🦉. ¿Qué se te antoja hoy? Puedo ayudarte a encontrar comida en el campus."
        }
    ]);

    const messagesEndRef = useRef(null);

    const toggleChat = () => setIsOpen(!isOpen);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    // Obtener ubicación del usuario (opcional)
    const getUserLocation = () => {
        return new Promise((resolve) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lon: position.coords.longitude
                        });
                    },
                    () => resolve(null) // Si falla, enviar sin ubicación
                );
            } else {
                resolve(null);
            }
        });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || isLoading) return;

        const userMessage = message.trim();
        const newHistory = [...chatHistory, { type: "user", text: userMessage }];
        setChatHistory(newHistory);
        setMessage("");
        setIsLoading(true);

        try {
            // Obtener ubicación (opcional)
            const location = await getUserLocation();

            // Llamar al backend
            const response = await fetch("http://127.0.0.1:8000/api/chatbot/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: userMessage,
                    lat: location?.lat,
                    lon: location?.lon
                }),
            });

            const data = await response.json();

            if (data.success) {
                setChatHistory((prev) => [
                    ...prev,
                    { type: "bot", text: data.answer }
                ]);
            } else {
                throw new Error(data.error || "Error desconocido");
            }
        } catch (error) {
            console.error("Error:", error);
            setChatHistory((prev) => [
                ...prev,
                {
                    type: "bot",
                    text: "😔 Lo siento, hubo un problema. ¿Puedes intentar de nuevo?"
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

            {/* VENTANA DE CHAT */}
            {isOpen && (
                <div className="mb-4 w-80 sm:w-96 h-[500px] bg-[#1e2538] rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-fade-in-up">
                    {/* Header */}
                    <div className="bg-[#141b2d] p-4 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img src={logo} alt="Buhito" className="w-10 h-10 rounded-full bg-yellow-500/10 p-1" />
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#141b2d] rounded-full"></span>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">El Buhito</h3>
                                <p className="text-xs text-green-400">En línea</p>
                            </div>
                        </div>
                        <button onClick={toggleChat} className="text-gray-400 hover:text-white transition-colors">
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* Mensajes */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#1e2538]">
                        {chatHistory.map((msg, index) => (
                            <div key={index} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-line ${
                                        msg.type === "user"
                                            ? "bg-yellow-500 text-[#141b2d] rounded-br-none font-medium"
                                            : "bg-[#2a324a] text-gray-200 rounded-bl-none border border-white/5 leading-relaxed"
                                    }`}
                                    style={msg.type === "bot" ? { textIndent: "-1em", paddingLeft: "1em" } : {}}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {/* Indicador de carga */}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-[#2a324a] text-gray-200 p-3 rounded-2xl rounded-bl-none border border-white/5 flex items-center gap-2">
                                    <FiLoader className="animate-spin" />
                                    <span className="text-sm">Pensando...</span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-[#141b2d] border-t border-white/5 flex gap-2">
                        <input
                            type="text"
                            placeholder="Escribe tu mensaje..."
                            className="flex-1 bg-[#1e2538] text-white text-sm rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 border border-white/5 placeholder-gray-500"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className="bg-yellow-500 text-[#141b2d] p-2.5 rounded-full hover:bg-yellow-400 transition-colors flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!message.trim() || isLoading}
                        >
                            <FiSend size={18} />
                        </button>
                    </form>
                </div>
            )}

            {/* BOTÓN FLOTANTE */}
            <button
                onClick={toggleChat}
                className={`
          group flex items-center justify-center shadow-[0_4px_20px_rgba(234,179,8,0.4)] transition-all duration-300 focus:outline-none z-50
          bg-yellow-500 hover:bg-yellow-400 text-[#141b2d] rounded-full
          ${isOpen ? "w-14 h-14" : "h-14 px-6 gap-3 hover:scale-105"} 
        `}
            >
                {isOpen ? (
                    <FiX size={28} className="transition-transform duration-300 rotate-90" />
                ) : (
                    <>
                        <FiMessageSquare size={24} className="transition-transform duration-300" />
                        <span className="font-bold text-base whitespace-nowrap">Chatea con buhito</span>
                    </>
                )}
            </button>
        </div>
    );
};

export default ChatWidget;