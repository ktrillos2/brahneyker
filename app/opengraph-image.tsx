import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Salón de Belleza Brahneyker'
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: '#09090b', // zinc-950
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'serif',
                }}
            >
                {/* Decorative Diamond Shape (SVG) */}
                <svg
                    width="120"
                    height="120"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fbbf24" // amber-400
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginBottom: 40 }}
                >
                    <path d="M6 3h12l4 6-10 13L2 9Z" />
                    <path d="M11 3 8 9l4 13 4-13-3-6" />
                    <path d="M2 9h20" />
                </svg>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                        style={{
                            fontSize: 24,
                            letterSpacing: '0.3em',
                            color: '#a1a1aa', // zinc-400
                            textTransform: 'uppercase',
                            marginBottom: 10,
                        }}
                    >
                        Sala de Belleza
                    </div>
                    <div
                        style={{
                            fontSize: 100,
                            fontWeight: 900,
                            color: '#fbbf24', // amber-400 primary color
                            lineHeight: 1,
                        }}
                    >
                        Brahneyker
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
