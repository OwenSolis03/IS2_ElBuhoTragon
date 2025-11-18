// src/components/ChatWidget.jsx
import React, { useState, useRef, useEffect } from "react";
import { FiMessageSquare, FiX, FiSend } from "react-icons/fi";
import logo from "../assets/logo.png";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { type: "bot", text: "¡Hola! Soy el Búho Tragón 🦉. ¿En qué puedo ayudarte hoy?" }
  ]);
  
  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newHistory = [...chatHistory, { type: "user", text: message }];
    setChatHistory(newHistory);
    setMessage("");

    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        { type: "bot", text: "Aún estoy aprendiendo a recomendar comida, ¡pero pronto seré un experto!" }
      ]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* --- VENTANA DE CHAT --- */}
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
                <h3 className="font-bold text-white text-sm">Búho Tragón IA</h3>
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
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.type === "user" 
                      ? "bg-yellow-500 text-[#141b2d] rounded-br-none font-medium" 
                      : "bg-[#2a324a] text-gray-200 rounded-bl-none border border-white/5"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
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
            />
            <button 
              type="submit" 
              className="bg-yellow-500 text-[#141b2d] p-2.5 rounded-full hover:bg-yellow-400 transition-colors flex items-center justify-center shadow-lg"
              disabled={!message.trim()}
            >
              <FiSend size={18} />
            </button>
          </form>
        </div>
      )}

      {/* --- BOTÓN FLOTANTE CON TEXTO --- */}
      <button
        onClick={toggleChat}
        className={`
          group flex items-center justify-center shadow-[0_4px_20px_rgba(234,179,8,0.4)] transition-all duration-300 focus:outline-none z-50
          bg-yellow-500 hover:bg-yellow-400 text-[#141b2d] rounded-full
          ${isOpen ? "w-14 h-14" : "h-14 px-6 gap-3 hover:scale-105"} 
        `}
      >
        {isOpen ? (
          // Cuando está abierto, solo muestra la X
          <FiX size={28} className="transition-transform duration-300 rotate-90" />
        ) : (
          // Cuando está cerrado, muestra Icono + Texto
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