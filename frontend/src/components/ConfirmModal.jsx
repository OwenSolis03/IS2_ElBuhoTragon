// frontend/src/components/ConfirmModal.jsx
import React, { useEffect } from "react";
import { FiAlertTriangle, FiX } from "react-icons/fi";

/**
 * ConfirmModal — Diálogo modal sobrio con identidad V2 para reemplazar window.confirm() nativo.
 */
const ConfirmModal = ({
  isOpen,
  title = "Confirmar Acción",
  message = "¿Estás seguro de que deseas proceder con esta acción?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDestructive = false,
  onConfirm,
  onCancel
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="bg-[#0a1830] w-full max-w-md rounded-2xl p-6 sm:p-7 border border-white/[0.12] shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {isDestructive ? (
              <div className="w-10 h-10 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0">
                <FiAlertTriangle size={20} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#163A70]/60 border border-[#204a8e]/40 text-[#B39A3A] flex items-center justify-center flex-shrink-0">
                <FiAlertTriangle size={20} />
              </div>
            )}
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400 block mb-1">
                Confirmación
              </span>
              <h3 id="confirm-modal-title" className="font-display text-2xl sm:text-3xl text-white font-normal leading-tight">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <FiX size={20} />
          </button>
        </div>

        <p className="text-base text-neutral-200 font-light leading-relaxed pl-13">
          {message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-mono uppercase tracking-wider text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              isDestructive
                ? "bg-[#702B32] hover:bg-[#8f3740] text-white border border-rose-500/30"
                : "bg-white text-black hover:bg-neutral-200 shadow-md"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
