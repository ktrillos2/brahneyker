import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Salón de Belleza Brahneyker'
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
    const appUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'

    const logoUrl = `${appUrl}/images/freepik-background-93643.png`

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'white',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <img
                    src={logoUrl}
                    alt="Brahneyker Logo"
                    style={{
                        width: '400px',
                        height: 'auto',
                        objectFit: 'contain',
                    }}
                />
            </div>
        ),
        {
            ...size,
        }
    )
}
