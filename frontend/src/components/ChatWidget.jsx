// src/components/ChatWidget.jsx
import React, { useState, useRef, useEffect } from "react";
import { FiX, FiSend, FiLoader, FiHelpCircle } from "react-icons/fi";
import logo from "../assets/logo.png";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      type: "bot",
      text: "Hola. Soy el asistente de Hungry Owl. ¿Qué platillo, cafetería o presupuesto buscas hoy en el campus universitario?"
    }
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const drawerRef = useRef(null);

  // Sugerencias rápidas para estudiantes
  const quickPrompts = [
    "¿Qué cafeterías están abiertas ahora?",
    "Comidas por menos de $50 pesos",
    "¿Dónde comer cerca de Medicina?",
    "¿Hay desayunos o comida corrida?"
  ];

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener("toggle-assistant", handleToggle);
    window.addEventListener("open-assistant", handleOpen);
    window.addEventListener("close-assistant", handleClose);

    return () => {
      window.removeEventListener("toggle-assistant", handleToggle);
      window.removeEventListener("open-assistant", handleOpen);
      window.removeEventListener("close-assistant", handleClose);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("assistant-state-changed", { detail: { isOpen } })
    );

    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Manejo de tecla Escape y Focus Trap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const buildHistoryPairs = (history) => {
    const pairs = [];
    for (let i = 0; i < history.length - 1; i++) {
      if (history[i].type === "user" && history[i + 1].type === "bot") {
        pairs.push([history[i].text, history[i + 1].text]);
      }
    }
    return pairs.slice(-6);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

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
          () => resolve(null)
        );
      } else {
        resolve(null);
      }
    });
  };

  const handleSendMessage = async (userText) => {
    const textToSend = (typeof userText === "string" ? userText : message).trim();
    if (!textToSend || isLoading) return;

    const newHistory = [...chatHistory, { type: "user", text: textToSend }];
    setChatHistory(newHistory);
    setMessage("");
    setIsLoading(true);

    try {
      const location = await getUserLocation();

      const response = await fetch("http://127.0.0.1:8000/api/chatbot/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          lat: location?.lat,
          lon: location?.lon,
          history: buildHistoryPairs(chatHistory)
        }),
      });

      const data = await response.json();

      if (data.success) {
        let formattedAnswer = data.answer;

        if (formattedAnswer.includes('\\n')) {
          formattedAnswer = formattedAnswer.replace(/\\n/g, '\n');
        }

        if (formattedAnswer.includes('•') && !formattedAnswer.includes('\n•')) {
          formattedAnswer = formattedAnswer
            .split('•')
            .map((part, i) => i === 0 ? part : '• ' + part.trim())
            .join('\n')
            .trim();
        }

        setChatHistory((prev) => [
          ...prev,
          { type: "bot", text: formattedAnswer }
        ]);
      } else {
        throw new Error(data.error || "Error desconocido");
      }
    } catch (error) {
      console.error("Error al comunicarse con el asistente:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          type: "bot",
          text: "No fue posible conectar con el servidor RAG en este momento. Por favor intenta de nuevo en unos minutos."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Telón de fondo (backdrop) */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity duration-300 ease-in-out ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Panel lateral drawer (450px) desplegable desde la izquierda */}
      <aside
        ref={drawerRef}
        className={`fixed top-0 bottom-0 left-0 z-50 w-full sm:w-[450px] max-w-[94vw] h-full bg-[#071326] border-r border-white/10 shadow-[20px_0_50px_rgba(0,0,0,0.85)] flex flex-col font-sans transition-transform duration-300 ease-out transform ${
          isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-label="Asistente inteligente de campus Hungry Owl"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera Editorial del Panel */}
        <div className="bg-[#071326] px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt=""
              className="w-8 h-8 object-contain filter grayscale invert contrast-125 brightness-110 opacity-90"
            />
            <div>
              <h3 className="font-display text-xl font-normal text-white leading-none">
                Asistente Hungry Owl
              </h3>
              <span className="font-mono text-xs text-emerald-400 uppercase tracking-[0.16em] block mt-1.5 font-medium">
                En servicio · RAG Campus UNISON
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-neutral-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 cursor-pointer"
            aria-label="Cerrar asistente"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Historial de Mensajes */}
        <div
          className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-[#0a1830]"
          aria-live="polite"
        >
          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] p-4 text-sm sm:text-[15px] leading-relaxed ${
                  msg.type === "user"
                    ? "bg-[#163A70] text-white rounded-2xl rounded-br-sm font-normal border border-[#204a8e]/40 shadow-md"
                    : "bg-[#071326] text-neutral-100 border border-white/[0.08] rounded-2xl rounded-bl-sm font-light whitespace-pre-line shadow-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Sugerencias Rápidas para el estudiante si solo está el saludo inicial */}
          {chatHistory.length === 1 && !isLoading && (
            <div className="pt-2 space-y-2.5">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-300 block px-1 flex items-center gap-2 font-medium">
                <FiHelpCircle size={13} className="text-[#B39A3A]" />
                <span>Consultas frecuentes</span>
              </span>
              <div className="flex flex-col gap-2">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-left p-3 rounded-xl bg-[#071326]/75 hover:bg-[#071326] border border-white/[0.08] hover:border-[#B39A3A]/40 text-sm text-neutral-200 hover:text-white transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Indicador de Carga */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#071326] text-neutral-200 text-sm px-4 py-3 rounded-2xl rounded-bl-sm border border-white/[0.08] flex items-center gap-3 font-mono">
                <FiLoader className="animate-spin text-[#B39A3A]" size={16} />
                <span>Consultando cafeterías del campus...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Formulario de Entrada */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-4 bg-[#071326] border-t border-white/[0.08] flex gap-3 items-center"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Pregunta por platillos, presupuestos o tienditas..."
            className="flex-1 bg-[#0a1830] text-white text-sm sm:text-base rounded-full px-4 py-3 border border-white/[0.12] focus:border-[#B39A3A]/70 focus:outline-none placeholder:text-neutral-400 font-sans"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
            aria-label="Mensaje para el asistente"
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="w-11 h-11 rounded-full bg-white text-black hover:bg-neutral-200 transition-colors flex items-center justify-center disabled:opacity-40 cursor-pointer flex-shrink-0"
            aria-label="Enviar pregunta"
          >
            <FiSend size={15} />
          </button>
        </form>
      </aside>
    </>
  );
};

export default ChatWidget;