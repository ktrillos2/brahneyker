import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Salón de Belleza Brahneyker'
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
    // Use the absolute URL for the image in production, 
    // but for local generation we need to fetch it or serve it.
    // Ideally, we serve the image directly or use a solid background with text if fetching is complex in edge.
    // However, fetching from the public URL usually works if the base is set.
    // For safety in this environment, we might want to just include the image if it was a file import,
    // but next/og supports standard <img> tags with public paths in some setups, or fetch.

    // Since we want to safeguard against fetch issues in edge without full URL setup:
    // We will assume standard Next.js behavior where we can use the public path if we are careful,
    // OR we can't easily read local files in Edge without `fs` which isn't available.
    // Best approach for "resizing a logo" that is a static asset is to just render it.

    // Note: Next.js OpenGraph image generation runs in Edge. 
    // Fetching localhost images can be flaky. 
    // Let's try to fetch using the deployment URL if available, or just style a nice card if image fetch fails.
    // BUT the user specifically asked for the LOGO.

    // Let's rely on the fetching the image from the deployment URL or a placeholder if local.
    // Actually, we can try to just use an <img> tag with full URL. 
    // If we don't have the full URL (VERCEL_URL), it might break locally.

    // Simpler approach: constructing the URL.
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
                {/* We use a flex container to center the image and control its size explicitly */}
                <img
                    src={logoUrl}
                    alt="Brahneyker Logo"
                    style={{
                        width: '400px', // Explicit smaller width as requested (original might be filling 1200px)
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
