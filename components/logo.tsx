
import { Gem } from "lucide-react"

export function Logo({ className = "", showText = true }: { className?: string; showText?: boolean }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative flex items-center justify-center">
                <Gem className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            {showText && (
                <div className="flex flex-col">
                    <span className="text-[0.6rem] tracking-[0.2em] uppercase text-muted-foreground leading-tight">
                        Sala de Belleza
                    </span>
                    <span className="font-serif text-xl md:text-2xl font-bold text-primary leading-none tracking-tight">
                        Brahneyker
                    </span>
                </div>
            )}
        </div>
    )
}
