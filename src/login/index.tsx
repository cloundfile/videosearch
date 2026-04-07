import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const discovery = {
    authorizationEndpoint: 'https://SEU_OAUTH/authorize',
    tokenEndpoint: 'https://SEU_OAUTH/token',
};

const CLIENT_ID = 'SEU_CLIENT_ID_PUBLICO';
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'myapp', path: 'oauth/callback' });

function base64UrlEncode(bytes: Uint8Array) {
    let str = btoa(String.fromCharCode(...bytes));
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256ToBase64Url(input: string) {
    const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
        encoding: Crypto.CryptoEncoding.BASE64,
    });
    return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(length = 64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let out = '';
    for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

export async function loginOAuthMobileOnly() {
    const state = randomString(40);
    const codeVerifier = randomString(96);
    const codeChallenge = await sha256ToBase64Url(codeVerifier);

    const authUrl =
        `${discovery.authorizationEndpoint}` +
        `?response_type=code` +
        `&client_id=${encodeURIComponent(CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=${encodeURIComponent('openid profile email offline_access')}` +
        `&state=${encodeURIComponent(state)}` +
        `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256`;

    const result = await AuthSession.startAsync({
        authUrl,
        returnUrl: REDIRECT_URI,
    });

    if (result.type !== 'success') throw new Error('Login cancelado');
    if (result.params.state !== state) throw new Error('State inválido');

    const code = result.params.code;
    if (!code) throw new Error('Code ausente');

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
    }).toString();

    const tokenRes = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!tokenRes.ok) throw new Error(`Falha token: ${tokenRes.status}`);
    const token = await tokenRes.json();

    await SecureStore.setItemAsync('access_token', token.access_token);
    if (token.refresh_token) await SecureStore.setItemAsync('refresh_token', token.refresh_token);

    return token;
}
