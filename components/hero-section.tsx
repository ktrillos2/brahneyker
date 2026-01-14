import Image from "next/image"
import { Header } from "./header"

export function HeroSection() {
  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center">
      <Header />

      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/491813894-2183997298706391-1269233796612998089-n.jpg"
          alt="Salón de Belleza Brahneyker"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center pt-20">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <span className="inline-block text-primary font-serif text-lg tracking-[0.3em] uppercase">
              Bienvenidos a
            </span>
          </div>
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-foreground mb-6 leading-tight">
            Salón de Belleza <span className="text-primary italic">Brahneyker</span>
          </h1>
          <div className="w-24 h-[1px] bg-primary mx-auto mb-8" />
          <p className="text-foreground/80 text-lg md:text-xl font-light max-w-2xl mx-auto leading-relaxed">
            Más de 20 años realzando tu belleza con maestría
          </p>
          <div className="mt-12">
            <a
              href="#servicios"
              className="inline-block bg-primary text-primary-foreground px-8 py-4 font-medium tracking-wider uppercase text-sm hover:bg-primary/90 transition-colors"
            >
              Descubre Nuestros Servicios
            </a>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex justify-center pt-2">
          <div className="w-1 h-3 bg-primary rounded-full" />
        </div>
      </div>
    </section>
  )
}
