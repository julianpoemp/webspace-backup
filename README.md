# webspace-backup
Easy to use backup script for web-spaces via ftp or ftps. Compatible to windows, linux and macos systems.

**This project is still in development**.

## Why?
Because I haven't found any good and easy-to-use backup scripts that fit my needs.

## What is the aim of this project?
The aim is to provide an easy-to-use script for all operating systems that backups both data from webspace and SQL Databases altogether. That is what most people need.

# Current features
* download of all files and folders from a remote directory to a local directory
* logging of failed downloads to a local file. After the backup the failed downloads could be repeated manually
* user-friendly outputs to the console
* text file with statistics like number of folders, number of files, start date, end date, duration of the backup
* compression of the backup folder to an (password encrypted) zip file

# Planed features
* input credentials at the start as an alternative to permanently store it to the config.json
* SSH support
* backup of SQL databases
* configurable lifespan of backups
* more logging

# Usage
1. download the release for your operating system.
2. unpack the zip folder.
3. go to the unzipped folder and change the config.json. You need to set your credentials in order to use this script.
3. on windows use cmd and go to the unzipped folder. On macOS or linux use the terminal.
4. run `./webspace-backup`
5. the backup starts. By default the errors.log and statistics.txt is saved next to the script. To cancel the backup do CTRL + C.

## Configuration
    {
      "version": "1.0.0",
      "server": {
        "host": "example.com",
        "user": "user",
        "password": "password",
        "port": 21,
        "protocol": "ftps" | "ftp",
        "timeout": 30,
        "verbose": false
      },
      "backup": {
        "root": "/",
        "downloadPath": "",
        "zip": {
          "enabled": false,
          "password": ""
        }
      },
      "console": {
        "tty": false
      }
    }


# Development

## Installation
1. Clone this repository.
2. In the terminal go to `webspace-backup` folder
3. run npm install (nodejs must be installed)

## run development build

Run `npm start`.
