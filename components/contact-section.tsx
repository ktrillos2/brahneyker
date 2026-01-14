"use client"

import type React from "react"
import { useState } from "react"
import { Send, Phone } from "lucide-react"

export function ContactSection() {
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    servicio: "",
    mensaje: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const mensaje = `¡Hola! 👋 Soy *${formData.nombre}*%0A%0A📱 Mi teléfono: ${formData.telefono}%0A💅 Servicio de interés: *${formData.servicio}*%0A%0A💬 Mensaje:%0A${formData.mensaje}%0A%0A_Enviado desde la web de Brahneyker_`

    const whatsappUrl = `https://wa.me/573212067024?text=${mensaje}`
    window.open(whatsappUrl, "_blank")
  }

  return (
    <section id="contacto" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-primary font-serif text-sm tracking-[0.3em] uppercase">Reserva tu Cita</span>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mt-4 mb-6">
              <span className="text-primary italic">Contáctanos</span>
            </h2>
            <div className="w-24 h-[1px] bg-primary mx-auto mb-6" />
            <div className="flex items-center justify-center gap-2 text-foreground/70">
              <Phone className="w-5 h-5 text-primary" />
              <span>321 206 7024</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="nombre"
                  className="block text-sm font-medium text-foreground/80 mb-2 uppercase tracking-wider"
                >
                  Nombre
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  required
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-muted border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Tu nombre completo"
                />
              </div>
              <div>
                <label
                  htmlFor="telefono"
                  className="block text-sm font-medium text-foreground/80 mb-2 uppercase tracking-wider"
                >
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  required
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-muted border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Tu número de contacto"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="servicio"
                className="block text-sm font-medium text-foreground/80 mb-2 uppercase tracking-wider"
              >
                Tipo de Servicio
              </label>
              <select
                id="servicio"
                name="servicio"
                required
                value={formData.servicio}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-muted border border-border text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">Selecciona un servicio</option>
                <option value="Cabello">Cabello</option>
                <option value="Uñas">Uñas</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="mensaje"
                className="block text-sm font-medium text-foreground/80 mb-2 uppercase tracking-wider"
              >
                Mensaje
              </label>
              <textarea
                id="mensaje"
                name="mensaje"
                rows={4}
                value={formData.mensaje}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-muted border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors resize-none"
                placeholder="Cuéntanos qué necesitas..."
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground px-8 py-4 font-medium tracking-wider uppercase text-sm hover:bg-primary/90 transition-colors"
            >
              <Send className="w-5 h-5" />
              Enviar por WhatsApp
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
