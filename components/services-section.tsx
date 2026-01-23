import Image from "next/image"

export function ServicesSection() {
  const hairServices = [
    {
      image: "/images/trabajos/521597634_18410206414107436_5331871502149144010_n.jpg",
      title: "Cortes de Cabello",
      description: "Cortes modernos y clásicos para dama y caballero",
    },
    {
      image: "/images/trabajos/529002309_18413000485107436_8142966667177345745_n.jpg",
      title: "Cepillados y Planchados",
      description: "Cabello liso y sedoso con técnicas profesionales",
    },
    {
      image: "/images/trabajos/529849155_18412611241107436_5217734762315617169_n.jpg",
      title: "Tratamientos Capilares",
      description: "Hidratación, anticaídas y tratamientos especializados",
    },
    {
      image: "/images/trabajos/alisados-service.png",
      title: "Alisados Permanentes",
      description: "Cabello liso, sedoso y brillante con tratamientos de última generación",
    },
    {
      image: "/images/trabajos/tintes-service.jpg",
      title: "Tintes",
      description: "Coloración profesional con productos de alta calidad",
    },
    {
      image: "/images/491813894-2183997298706391-1269233796612998089-n.jpg",
      title: "Peinados",
      description: "Diseños elegantes para bodas, quinceañeras y eventos especiales",
    },
  ]

  const beautyServices = [
    {
      image: "/images/trabajos/565926601_18423413257107436_4521632505382447549_n.heic",
      title: "Depilaciones en Cera",
      description: "Depilación profesional con cera de alta calidad",
    },
    {
      image: "/images/trabajos/cejas-pestanas-service.png",
      title: "Cejas y Pestañas",
      description: "Diseño y perfilado de cejas, tinte de pestañas",
    },
    {
      image: "/images/trabajos/maquillaje-service.png",
      title: "Maquillaje",
      description: "Maquillaje profesional para cualquier ocasión",
    },
  ]

  const nailServices = [
    {
      image: "/images/611906854-18436601668107436-7274788911852177312-n.jpeg",
      title: "Manicure y Pedicure",
      description: "Cuidado completo de manos y pies",
    },
    {
      image: "/images/trabajos/polygel-service.png",
      title: "Polygel",
      description: "Uñas resistentes y naturales con polygel",
    },
    {
      image: "/images/522007310-18410705179107436-871763440534631846-n.jpg",
      title: "Semipermanentes",
      description: "Esmalte de larga duración con brillo perfecto",
    },
    {
      image: "/images/trabajos/unas-tradicionales-service.png",
      title: "Uñas Tradicionales",
      description: "Manicure clásico con acabados impecables",
    },
    {
      image: "/images/trabajos/unas-acrilicas-service.png",
      title: "Uñas Acrílicas",
      description: "Diseños personalizados con acrílico de alta calidad",
    },
    {
      image: "/images/520762488-18409761880107436-7576528391235054683-n.jpg",
      title: "Soft Gel",
      description: "Uñas suaves y flexibles con acabado natural",
    },
  ]

  return (
    <section id="servicios" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="text-primary font-serif text-sm tracking-[0.3em] uppercase">Lo Que Ofrecemos</span>
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mt-4 mb-6">
            Nuestros <span className="text-primary italic">Servicios</span>
          </h1>
          <div className="w-24 h-[1px] bg-primary mx-auto" />
        </div>

        {/* Hair Services */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-[1px] bg-primary" />
            <h2 className="font-serif text-2xl md:text-3xl text-foreground">Servicios de Cabello</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {hairServices.map((service) => (
              <div key={service.title} className="group relative overflow-hidden bg-muted rounded-lg">
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
                  <h3 className="font-serif text-xl text-foreground mb-2">{service.title}</h3>
                  <p className="text-foreground/70 text-sm">{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Beauty Services */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-[1px] bg-primary" />
            <h2 className="font-serif text-2xl md:text-3xl text-foreground">Tratamientos de Belleza</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {beautyServices.map((service) => (
              <div key={service.title} className="group relative overflow-hidden bg-muted rounded-lg">
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
                  <h3 className="font-serif text-xl text-foreground mb-2">{service.title}</h3>
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
            <h2 className="font-serif text-2xl md:text-3xl text-foreground">Servicios de Uñas</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {nailServices.map((service) => (
              <div key={service.title} className="group relative overflow-hidden bg-muted rounded-lg">
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
                  <h3 className="font-serif text-xl text-foreground mb-2">{service.title}</h3>
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
