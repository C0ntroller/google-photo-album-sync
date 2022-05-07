# Google Photo Album Sync
A script that will download all images from an album.
Perfect to use if you have a local directory for your background, chromecast or whatever.

## Setup
1. [Create a Google Project](https://developers.google.com/photos/library/guides/get-started)
    - You will need the client id and client secret and put it in the `secrets.json`
2. Run `npm run token`
    - A browser tab should open where you log in with your Google Account and allow access to your app.
    - If something fails, press `Ctrl + C` in the terminal and try again.
3. Run `npm run albums` and pick an album you want to sync. This will **not** start the download.
4. You are all set up!

## Running it
```console
$ npm run sync -- [output_directory] [options...]
```
This will download the album to your drive. By default a directory named `album` is created where the images are stored. If this is sufficient you can omit this and still use the options below.

Other options are available as well:
| Option | Effect |
|--------|--------|
| `--force` | Redownload all images no matter if they already exist on the system. By default they are skipped. |
| `--cleanup` | Delete images not found in the album anymore. |
| `--quiet` | No useless logs. |
| `--raw` | Download RAW images. |

## Using it
Run it manually or add a cronjob with the following configuration:
```console
# crontab -u username -e
```

```crontab
# Add this line
*/15 * * * * node /path/to/src/sync.js /path/to/output --quiet --cleanup
```
Of course any options can be used.