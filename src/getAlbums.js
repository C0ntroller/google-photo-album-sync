import fetch from "node-fetch";
import readline from "readline";
import { writeFileSync } from "fs";
import { secretsFile, secrets, getToken } from "./common.js";

if (!secrets.refreshToken) {
    console.error("No refresh token found. Please run 'npm run token' first.");
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


(async () => {
    let nextPageToken;
    const albums = [];
    do {
        const response = await fetch(`https://photoslibrary.googleapis.com/v1/albums?pageSize=50${nextPageToken ? `&${nextPageToken}`: ""}`, {
            headers: {
                Authorization: `Bearer ${(await getToken())[0]}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        albums.push(...data.albums);
        nextPageToken = data.nextPageToken;
    } while (nextPageToken);
    for(let i = 0; i < albums.length; i++) {
        console.log(`${i+1}:\t${albums[i].title} (${albums[i].mediaItemsCount} items)`);
    }
    console.log("\n");
    let albumIndex;
    while(true) {
        albumIndex = await new Promise((resolve) => rl.question("Please choose an album: ", resolve));
        if(Number.isNaN(Number.parseInt(albumIndex)) || Number.parseInt(albumIndex) < 1 || Number.parseInt(albumIndex) > albums.length) {
            console.warn("This is not a valid number, please try again.");
            continue;
        } else {
            break;
        }
    }
    const album = albums[Number.parseInt(albumIndex) - 1];
    rl.close();
    console.log("Writeing album settings to secrets...");
    secrets.album = {
        name: album.title,
        id: album.id,
        count: album.mediaItemsCount
    };
    writeFileSync(secretsFile, JSON.stringify(secrets, null, 2));
    console.log("Done!");
})()
