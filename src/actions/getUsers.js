import { SignJWT } from "jose";

async function fetchApi(url, secret) {
    const authToken = await new SignJWT({ user: "cloudflare-worker" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("5 minutes")
      .sign(secret);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
            'Authorization': `Bearer ${authToken}`,
            "Content-Type": "application/json"
        }
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
        console.log(`Failed while getting API response: ${response.status}`)
        throw new Error(`Failed while getting API response: ${response.status}`);
    }
    return await response.json()
}

export async function getUsers(env) {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const apiUrl = env.VERCEL_API;
    try {
        const { users } = await fetchApi(apiUrl, secret);
        return users
    } catch (error) {
        throw new Error(`Failed while getting API getting emails: ${error}`);
    }
}