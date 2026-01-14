import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const key = new TextEncoder().encode(process.env.JWT_SECRET || "complex-secret-key-change-this")

export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(key)
}

export async function decrypt(input: string): Promise<any> {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ["HS256"],
        })
        return payload
    } catch (error) {
        return null
    }
}

export async function createSession(userId: string) {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const session = await encrypt({ userId, expires })

    const cookieStore = await cookies()
    cookieStore.set("session", session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        expires,
        sameSite: "lax",
        path: "/",
    })
}

export async function getSession() {
    const cookieStore = await cookies()
    const session = cookieStore.get("session")?.value
    if (!session) return null
    return await decrypt(session)
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete("session")
}

export async function verifySession() {
    const session = await getSession()
    if (!session?.userId) {
        redirect("/admin")
    }
    return { isAuth: true, userId: session.userId }
}
