"use client"

import Image from "next/image"
import { useState, useEffect } from "react"

export function WhatsAppButton() {
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    // Mostrar el mensaje después de 2 segundos
    const timer = setTimeout(() => {
      setShowMessage(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleClick = () => {
    window.open(
      "https://wa.me/573212067024?text=¡Hola!%20Me%20gustaría%20obtener%20más%20información%20sobre%20sus%20servicios.",
      "_blank",
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={handleClick}
        className="bg-background border-2 border-primary p-2 rounded-full shadow-lg hover:scale-110 transition-all group relative"
        aria-label="Contactar por WhatsApp"
      >
        <Image
          src="/images/whatsapp-logo.png"
          alt="WhatsApp"
          width={60}
          height={60}
          className="w-14 h-14 object-contain"
          sizes="60px"
        />

        {/* Tooltip on hover */}
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-background text-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-primary">
          ¡Escríbenos!
        </span>
      </button>

      {/* Mensaje animado */}
      <div
        className={`absolute bottom-full right-0 mb-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-xl max-w-[280px] min-w-[240px] transition-all duration-500 ${showMessage ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
      >
        <p className="text-base font-normal text-center leading-relaxed">
          ¡Ven y agenda tu cita con nosotros!
        </p>
        {/* Flecha apuntando al botón */}
        <div className="absolute -bottom-2 right-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-primary" />

        {/* Botón para cerrar el mensaje */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMessage(false)
          }}
          className="absolute -top-2 -right-2 bg-background text-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-muted transition-colors border border-primary"
          aria-label="Cerrar mensaje"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
