import Image from "next/image"
import { Gem, Award, Heart } from "lucide-react"

export function AboutSection() {
  const features = [
    {
      icon: Gem,
      title: "Excelencia",
      description: "Servicios de primera calidad con productos premium",
    },
    {
      icon: Award,
      title: "Experiencia",
      description: "Más de una década perfeccionando nuestro arte",
    },
    {
      icon: Heart,
      title: "Pasión",
      description: "Amamos lo que hacemos y se refleja en cada detalle",
    },
  ]

  return (
    <section id="nosotros" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Images Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative h-64 lg:h-80">
              <Image
                src="/images/565430127-18423412708107436-2238141757400346214-n.jpeg"
                alt="Cabello lacio perfecto"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="relative h-64 lg:h-80 mt-8">
              <Image
                src="/images/611709326-18436607719107436-3531632225455469513-n.jpeg"
                alt="Ondas perfectas"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>

          {/* Content */}
          <div>
            <span className="text-primary font-serif text-sm tracking-[0.3em] uppercase">Sobre Nosotros</span>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mt-4 mb-6">
              Una Década de <span className="text-primary italic">Excelencia</span>
            </h2>
            <div className="w-16 h-[1px] bg-primary mb-8" />
            <p className="text-foreground/70 leading-relaxed mb-6">
              En <strong className="text-foreground">Salón de Belleza Brahneyker</strong>, llevamos más de 20 años
              transformando y realzando la belleza natural de nuestras clientas. Nuestra pasión por el arte de la
              belleza nos ha convertido en referentes en Cúcuta.
            </p>
            <p className="text-foreground/70 leading-relaxed mb-10">
              Cada servicio que ofrecemos está respaldado por años de experiencia, formación continua y un compromiso
              inquebrantable con la excelencia. Tu belleza es nuestra inspiración.
            </p>

            {/* Features */}
            <div className="grid sm:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="text-center sm:text-left">
                  <feature.icon className="w-8 h-8 text-primary mx-auto sm:mx-0 mb-3" />
                  <h3 className="font-serif text-lg text-foreground mb-1">{feature.title}</h3>
                  <p className="text-foreground/60 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
