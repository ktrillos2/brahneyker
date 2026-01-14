import Image from "next/image"
import { Phone, MapPin, Clock } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Logo & Description */}
          <div>
            <div className="mb-6">
              <Image
                src="/images/freepik-background-93643.png"
                alt="Brahneyker Sala de Belleza"
                width={300}
                height={80}
                className="w-auto h-20 object-contain"
              />
            </div>
            <p className="text-foreground/60 text-sm leading-relaxed">
              Más de 20 años realzando tu belleza con maestría. Tu satisfacción es nuestra mayor recompensa.
            </p>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-serif text-lg text-foreground mb-6">Contacto</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-foreground/70">
                <Phone className="w-5 h-5 text-primary" />
                <span>321 206 7024</span>
              </div>
              <div className="flex items-center gap-3 text-foreground/70">
                <MapPin className="w-5 h-5 text-primary" />
                <span>Cúcuta, Colombia  </span>
              </div>
              <div className="flex items-center gap-3 text-foreground/70">
                <Clock className="w-5 h-5 text-primary" />
                <span>Lun - Sáb: 8am - 7pm</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-lg text-foreground mb-6">Enlaces</h4>
            <div className="space-y-3">
              {["Inicio", "Nosotros", "Servicios", "Ubicación", "Contacto"].map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  className="block text-foreground/70 hover:text-primary transition-colors text-sm"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 text-center">
          <p className="text-foreground/50 text-sm">
            © {new Date().getFullYear()} Salón de Belleza Brahneyker. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
