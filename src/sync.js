import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { secretsFile, secrets, getToken } from "./common.js";

if (!secrets.refreshToken) {
    console.error("No refresh token found. Please run 'npm run token' first.");
    process.exit(1);
} else if (!secrets.album || !secrets.album.id) {
    console.error("No valid album found in secrets. Please run 'npm run albums' first.");
    process.exit(1);
}

const args = process.argv.slice(2);
const argsConfig = {
    path: args.length > 0 ? args[0] : "./album",
    downloadVideo: false, //args.includes("--video") not implemented,
    downloadRaw: args.includes("--raw"),
}
argsConfig.path = path.resolve(argsConfig.path);

if (!fs.existsSync(argsConfig.path)) {
    try {
        fs.mkdirSync(argsConfig.path);
    } catch (e) {
        console.error("Could not create album directory: ", e);
        process.exit(1);
    }
} else {
    try {
        fs.accessSync(argsConfig.path, fs.constants.W_OK);
    } catch {
        console.error("Album directory is not writable: ", argsConfig.path);
        process.exit(1);
    }
}

let tokenDeath = 0;
let token = "";
const filenameCounter = {};

function shouldDownload(mimeType) {
    switch (true) {
        case mimeType.startsWith("video/"): return argsConfig.downloadVideo;
        case mimeType === "image/raw": return argsConfig.downloadRaw;
        case mimeType === "image/jpeg": return true;
        case mimeType === "image/png": return true;
        default: return false;
    }
}

async function syncImage(imageObject) {
    if (!shouldDownload(imageObject.mimeType)) return;

    /*
        Problem: Google Photo Albums can have multiple images with the same filename.
        We want to preserve the original filename, but we also want to make sure that
        each image is only downloaded when necessary.
        
        Solution: We use a counter to keep track of how many times we've downloaded
        the same filename. This is only dependend on the sync but not accross syncs.
        This want work when the creation time of the images change because Google sorts
        images by that. And we can't sort them ourself because "orderBy" needs a
        "dateFilter" and that is exclusive with the "albumId"...
    */

    const filename = filenameCounter[imageObject.filename] ? `${imageObject.filename.substring(0, imageObject.filename.lastIndexOf("."))}_${filenameCounter[imageObject.filename] + 1}.${imageObject.filename.substring(imageObject.filename.lastIndexOf(".") + 1)}` : imageObject.filename;
    filenameCounter[imageObject.filename] = filenameCounter[imageObject.filename] ? filenameCounter[imageObject.filename] + 1 : 1;

    const filepath = path.resolve(argsConfig.path, filename);
    if (fs.existsSync(filepath)) {
        console.log(`Skipping ${filename} (already exists)`);
        return
    };

    const response = await fetch(`${imageObject.baseUrl}=w${imageObject.mediaMetadata.width}-h${imageObject.mediaMetadata.height}`);
    const fileStream = fs.createWriteStream(filepath);
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

async function checkTokenUpdate() {
    if(tokenDeath < Date.now()) {
        const [newToken, expiresIn] = await getToken();
        token = newToken;
        tokenDeath = Date.now() + (expiresIn - 30) * 1000;
    }
}

async function updateAlbumData() {
    const response = await fetch(`https://photoslibrary.googleapis.com/v1/albums/${secrets.album.id}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
    if (response.status !== 200) {
        console.error("Could not fetch album data: ", response.status);
        console.error("Was the album deleted?");
        process.exit(1);
    }
    const data = await response.json();

    if (secrets.album.name !== data.title || secrets.album.count !== data.mediaItemsCount) {
        secrets.album.name = data.title;
        secrets.album.count = data.mediaItemsCount;
        fs.writeFileSync(secretsFile, JSON.stringify(secrets, null, 2));
    }

}

(async () => {
    await checkTokenUpdate();
    await updateAlbumData();

    let nextPageToken;
    let runs = 0;
    do {
        await checkTokenUpdate();

        const searchOptions = {
            albumId: secrets.album.id,
            pageSize: 100
        };
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
