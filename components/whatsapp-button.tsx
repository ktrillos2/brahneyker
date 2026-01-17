"use client"

import Image from "next/image"

export function WhatsAppButton() {
  const handleClick = () => {
    window.open(
      "https://wa.me/573212067024?text=¡Hola!%20Me%20gustaría%20obtener%20más%20información%20sobre%20sus%20servicios.",
      "_blank",
    )
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 bg-background border-2 border-primary p-2 rounded-full shadow-lg hover:scale-110 transition-all group"
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
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-background text-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-primary">
        ¡Escríbenos!
      </span>
    </button>
  )
}
