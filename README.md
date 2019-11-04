# webspace-backup
Easy to use backup script for web-spaces via ftp or ftps. Compatible to windows, linux and macos systems.

**This project is still in development**.

## Why?
Because I haven't found any good and easy-to-use backup scripts that fit my needs.

## What is the aim of this project?
The aim is to provide an easy-to-use script for all operating systems that backups both data from webspace and SQL Databases altogether. That is what most people need.

# Current features
* download all files and folders from an remote directory.
* log failed downloads to a log file. After the backup the failed downloads could be repeated manually.
* readable outputs
* text file with statistics like number of folders, number of files, start date, end date, duration of the backup

# Planed features
* more logging
* Input credentials at the start as an alternative to permanently store it to the config.json
* compression of backups
* configurable lifespan of backups
* backup of SQL databases
* SSH support


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
          "host": "example_host",
          "user": "user",
          "password": "password",
          "port": 21,
          "protocol": "ftp" <- this setting is ignored at the moment. It's ftps by default.
        },
        "backup": {
          "root": "/", <- the path mus start end end with /.
          "downloadPath": "" <- let this empty to donwload next to the script.
        }
    }

# Development

## Installation
1. Clone this repository.
2. In the terminal go to `webspace-backup` folder
3. run npm install (nodejs must be installed)

## run development build

Run `npm start`.
