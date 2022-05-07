import express from "express";
import bodyParser from "body-parser";
import open from "open";
import fetch from "node-fetch";
import {readFileSync, writeFileSync} from "fs";
import {dirname} from "path";
import {fileURLToPath} from "url";

const app = express()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const port = 8080;

let state = "code";

// Read and parse JSON. There is no __dirname for modules
const secrets = JSON.parse(readFileSync(`${dirname(fileURLToPath(import.meta.url))}/../secrets.json`, "utf8"));

// Express route that prints request body and query parameters
app.use("/", (req, res) => {
    switch (state) {
        case "code": {
            state = "token";
            getToken(req.query);
            res.status(200).send("Done! You can close this window.").end();
            break;
        }
        case "token": {
            console.log(req.body);
            res.status(200).json(req.body).end();
            break;
        }
        default: res.status(400).end();
    } 
});

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));

const token = "miau";

const params = new URLSearchParams({
    scope: "https://www.googleapis.com/auth/photoslibrary.readonly",
    response_type: "code",
    state: token,
    redirect_uri: "http://localhost:8080",
    client_id: secrets.clientId
});

open(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);

async function getToken(googleResponse) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: JSON.stringify({
            client_id: secrets.clientId,
            client_secret: secrets.clientSecret,
            code: googleResponse.code,
            grant_type: "authorization_code",
            redirect_uri: "http://localhost:8080"
        }),
        headers: {'Content-Type': 'application/json'}
    });
    const data = await response.json();
    console.log("Got the token!");
    console.log("Writing token to secrets...");
    secrets.refreshToken = data.refresh_token;
    writeFileSync("./secrets.json", JSON.stringify(secrets));
    console.log("Done!");

    server.close();
}