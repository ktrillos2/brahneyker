import { MapPin, Navigation } from "lucide-react"

export function LocationSection() {
  return (
    <section id="ubicacion" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-primary font-serif text-sm tracking-[0.3em] uppercase">Encuéntranos</span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mt-4 mb-6">
            Nuestra <span className="text-primary italic">Ubicación</span>
          </h2>
          <div className="w-24 h-[1px] bg-primary mx-auto mb-12" />

          <div className="bg-background p-8 md:p-12 border border-border">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h3 className="font-serif text-2xl text-foreground mb-2">Cúcuta, Colombia</h3>
            <p className="text-primary font-medium mb-4">Barrio Chapinero, Localidad de Atalaya</p>
            <p className="text-foreground/70 text-lg mb-8">Calle 0 Avenida 1 #5AN-29</p>
            <p className="text-foreground/60 mb-8 max-w-lg mx-auto">
              Estamos ubicados en el corazón de Cúcuta, listos para recibirte y brindarte una experiencia de belleza
              inolvidable.
            </p>

            <div className="w-full aspect-video mb-8 border border-border overflow-hidden">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3951.88850359651!2d-72.51473008867677!3d7.906715292083547!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e6645262235d0d1%3A0x3019801b2c193df8!2sBrahneyker!5e0!3m2!1ses-419!2sco!4v1768399116726!5m2!1ses-419!2sco"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación de Brahneyker"
              />
            </div>

            <a
              href="https://maps.app.goo.gl/h1mF2zRaUdKATYTd6"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 font-medium tracking-wider uppercase text-sm hover:bg-primary/90 transition-colors"
            >
              <Navigation className="w-5 h-5" />
              Cómo Llegar
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
