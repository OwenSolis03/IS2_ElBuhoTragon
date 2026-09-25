// frontend/src/components/PageHeader.jsx
import React from "react";

/**
 * PageHeader — Encabezado editorial estándar con tipografía Cormorant Garamond
 * y ceja técnica en font-mono dorada.
 */
const PageHeader = ({
  eyebrow = "Universidad de Sonora · Campus Hermosillo",
  title,
  description,
  children,
  className = "mb-12 border-b border-white/[0.08] pb-8",
  maxWidth = "max-w-7xl"
}) => {
  return (
    <section className={`${maxWidth} mx-auto w-full ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-3xl">
          {eyebrow && (
            <span className="font-mono text-sm uppercase tracking-[0.22em] text-[#B39A3A] block mb-2.5 font-medium">
              {eyebrow}
            </span>
          )}
          {title && (
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-[#F2F2F0] font-normal tracking-tight mb-3 leading-[1.05]">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-neutral-200 text-base sm:text-lg font-light leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {children && (
          <div className="flex-shrink-0 flex items-center gap-4">
            {children}
          </div>
        )}
      </div>
    </section>
  );
};

export default PageHeader;
