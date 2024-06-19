import axios from "axios";

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
console.log(CLIENT_ID);
const redirectUri = "http://localhost:5173";

function generateRandomString(length: number) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}

async function generateCodeChallenge(plainData: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainData);
    const digest = await window.crypto.subtle.digest("SHA-256", data);

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/=/g, '')
        .replace(/\+/g, '-') 
        .replace(/\//g, '_');
}

function createAuthorizationUri() {
    const codeVerifier  = generateRandomString(64);
    const codeChallengePromise = generateCodeChallenge(codeVerifier);
    let codeChallenge = "";
    codeChallengePromise.then(val => codeChallenge = val);
    const state = generateRandomString(16);

    localStorage.setItem("CodeVerifier", codeVerifier);
    localStorage.setItem("State", state);

    const scope = "user-read-private user-read-email user-read-currently-playing user-read-recently-played user-top-read playlist-read-collaborative";
    const authUrl = new URL("https://accounts.spotify.com/authorize");

    const params = {
        response_type: "code",
        client_id: CLIENT_ID,
        scope,
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
        redirect_uri: redirectUri
    } as Record<string, string>;

    authUrl.search = new URLSearchParams(params).toString();
    window.location.href = authUrl.toString(); 
}

async function generateToken(state: string, code: string) {
    const savedState = localStorage.getItem("State");
    localStorage.removeItem("State");

    if (state !== savedState) {
        return { error: true };
    }

    // const postConfig = {
    //     headers: {
    //         'content-type': 'application/x-www-form-urlencoded'
    //     }
    // };

    // const parameters = {
    //     client_id: CLIENT_ID,
    //     grant_type: 'authorization_code',
    //     code,
    //     redirect_uri: "http://localhost:5173",
    //     code_verifier: localStorage.getItem("CodeVerifier")
    // }

    const res = await axios.post(
        "https://accounts.spotify.com/api/token", 
        { 
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            searchParams: {
                client_id: CLIENT_ID,
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                code_verifier: localStorage.getItem("CodeVerifier")
            }
        }
    );

    return res;
}

function saveToken(tokenData: Record<string, string>) {
    const { accessToken, expiresIn, refreshToken } = tokenData;

    localStorage.setItem("AccessTokenKey", accessToken);
    localStorage.setItem("AccessTokenExpiresIn", expiresIn);
    localStorage.setItem("AccessTokenRefreshKey", refreshToken);
}

function getToken() {
    const token = localStorage.getItem("AccessTokenKey") || "";
    
    return token;
}

const Auth = {
    createAuthorizationUri,
    generateToken,
    saveToken,
    getToken
};

export default Auth;