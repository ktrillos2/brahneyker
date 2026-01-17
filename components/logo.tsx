
import Image from "next/image"

export function Logo({ className = "", showText = true }: { className?: string; showText?: boolean }) {
    return (
        <div className={`relative ${className}`}>
            <Image
                src="/images/og-image.png"
                alt="Brahneyker Sala de Belleza"
                fill
                className="object-contain"
                priority
                sizes="(max-width: 768px) 100px, 200px"
            />
        </div>
    )
}
