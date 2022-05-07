import fetch from "node-fetch";
import { createWriteStream } from "fs";
import { secrets, getToken } from "./common.js";

if (!secrets.refreshToken) {
    console.error("No refresh token found. Please run 'npm run token' first.");
} else if (!secrets.album || !secrets.album.id || !secrets.album.count || !secrets.album.name) {
    console.error("No valid album found in secrets. Please run 'npm run albums' first.");
}

// TODO: Check for argument for folder
// TODO: Create folder and check permissions
const path = "./album";

let tokenDeath = 0;
let token = "";

async function syncImage(imageObject) {
    // TODO: Test if file exists
    if (imageObject.mimeType !== "image/jpeg" && imageObject.mimeType !== "image/png") return;

    const response = await fetch(`${imageObject.baseUrl}=w${imageObject.mediaMetadata.width}-h${imageObject.mediaMetadata.height}`);
    const fileStream = createWriteStream(`${path}/${imageObject.filename}`);
    await new Promise((resolve, reject) => {
        response.body.pipe(fileStream);
        response.body.on("error", reject);
        fileStream.on("finish", resolve);
    });
}

async function downloadList(imageList) {
    const asyncDownloads = imageList.map(syncImage);
    await Promise.all(asyncDownloads);
}

(async () => {
    let nextPageToken;
    let runs = 0;
    do {
        if(tokenDeath < Date.now()) {
            const [newToken, expiresIn] = await getToken();
            token = newToken;
            tokenDeath = Date.now() + (expiresIn - 30) * 1000;
        }

        const searchOptions = {
            albumId: secrets.album.id,
            pageSize: 100
        }
        if (nextPageToken) searchOptions.pageToken = nextPageToken;
        const response = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:search", {
            method: "POST",
            body: JSON.stringify(searchOptions),
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        const data = await response.json();
        nextPageToken = data.nextPageToken;
        console.log(`Downloading images ${runs * 100 + 1} to ${runs * 100 + data.mediaItems.length}... (of ${secrets.album.count})`);
        await downloadList(data.mediaItems);
    } while (nextPageToken);
})()
