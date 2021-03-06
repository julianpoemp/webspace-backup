<h1 align="center">webspace-backup</h1>

<p align="center">
   Easy to use backup script for web-spaces via ftp or ftps. Compatible to Windows, Linux and MacOS systems.<br/>
   <b>This project is still in development</b>
   <img src="doc/img/webspace_backup.gif"/>
   
   **Notice: If you want to backup your owncloud installation I recommend this way: https://github.com/julianpoemp/oc-backup**
</p>

## Why?
Because I haven't found any good and easy-to-use backup script that fits my needs.

## What is the aim of this project?
The aim is to provide an easy-to-use script for all operating systems that backups both data from webspace and SQL Databases altogether. That is what most people need.

# Current features
* download of all files and folders from a remote directory to a local directory
* user-friendly outputs to the console
* create log files next to the backup
* text file with statistics like number of folders, number of files, start date, end date, duration of the backup
* compression of the backup folder to an (password encrypted) zip file
* input credentials at the start as an alternative to permanently store it to the config.json

# Planned features
* SSH support
* backup of SQL databases
* configurable lifespan of backups
* option to continue failed downloads

# Usage
1. make sure that your system fits the requirements.
2. download the release for your operating system.
3. unpack the zip folder.
4. go to the unzipped folder and change the config.json. You need to set your credentials in order to use this script.
5. on windows use cmd and go to the unzipped folder. On macOS or linux use the terminal.
6. run `./webspace-backup`
7. the backup starts. By default the errors.log and statistics.txt is saved next to the script. To cancel the backup do CTRL + C.

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
        "tty": false,
        "showColors": false
      }
    }


# Development

## Installation
1. Clone this repository.
2. In the terminal go to `webspace-backup` folder
3. Run npm install (nodejs must be installed)
4. Duplicate ``config_sample.json`` and rename it to ``config.json``
5. Change the config.json so that you can connect to your webspace and test the functionality.

## run development build

Run `npm start`.
