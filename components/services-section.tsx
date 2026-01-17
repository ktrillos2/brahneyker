import Image from "next/image"

export function ServicesSection() {
  const hairServices = [
    {
      image: "/images/565430127-18423412708107436-2238141757400346214-n.jpeg",
      title: "Alisado Profesional",
      description: "Cabello liso, sedoso y brillante con tratamientos de última generación",
    },
    {
      image: "/images/611709326-18436607719107436-3531632225455469513-n.jpeg",
      title: "Ondas y Rizos",
      description: "Ondas perfectas y rizos definidos para cualquier ocasión",
    },
    {
      image: "/images/491813894-2183997298706391-1269233796612998089-n.jpg",
      title: "Peinados para Eventos",
      description: "Diseños elegantes para bodas, quinceañeras y eventos especiales",
    },
  ]

  const nailServices = [
    {
      image: "/images/611906854-18436601668107436-7274788911852177312-n.jpeg",
      title: "Nail Art Personalizado",
      description: "Diseños únicos y exclusivos que reflejan tu personalidad",
    },
    {
      image: "/images/522007310-18410705179107436-871763440534631846-n.jpg",
      title: "Manicure Francesa",
      description: "Elegancia clásica con acabados impecables",
    },
    {
      image: "/images/520762488-18409761880107436-7576528391235054683-n.jpg",
      title: "Diseños Temáticos",
      description: "Creaciones artísticas inspiradas en las últimas tendencias",
    },
  ]

  return (
    <section id="servicios" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="text-primary font-serif text-sm tracking-[0.3em] uppercase">Lo Que Ofrecemos</span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mt-4 mb-6">
            Nuestros <span className="text-primary italic">Servicios</span>
          </h2>
          <div className="w-24 h-[1px] bg-primary mx-auto" />
        </div>

        {/* Hair Services */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-[1px] bg-primary" />
            <h3 className="font-serif text-2xl md:text-3xl text-foreground">Cabello</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {hairServices.map((service) => (
              <div key={service.title} className="group relative overflow-hidden bg-muted">
                <div className="relative h-80 overflow-hidden">
                  <Image
                    src={service.image || "/placeholder.svg"}
                    alt={service.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h4 className="font-serif text-xl text-foreground mb-2">{service.title}</h4>
                  <p className="text-foreground/70 text-sm">{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nail Services */}
        <div>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-[1px] bg-primary" />
            <h3 className="font-serif text-2xl md:text-3xl text-foreground">Uñas</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {nailServices.map((service) => (
              <div key={service.title} className="group relative overflow-hidden bg-muted">
                <div className="relative h-80 overflow-hidden">
                  <Image
                    src={service.image || "/placeholder.svg"}
                    alt={service.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h4 className="font-serif text-xl text-foreground mb-2">{service.title}</h4>
                  <p className="text-foreground/70 text-sm">{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
