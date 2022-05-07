import fetch from "node-fetch";
import {dirname} from "path";
import {fileURLToPath} from "url";
import {readFileSync} from "fs";

// Read and parse JSON. There is no __dirname for modules
export const secretsFile = `${dirname(fileURLToPath(import.meta.url))}/../secrets.json`;
export const secrets = JSON.parse(readFileSync(secretsFile, "utf8"));

export async function getToken() {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: JSON.stringify({
            client_id: secrets.clientId,
            client_secret: secrets.clientSecret,
            grant_type: "refresh_token",
            refresh_token: secrets.refreshToken
        }),
        headers: {'Content-Type': 'application/json'}
    });
    const data = await response.json();
    return [data.access_token, data.expires_in];
}