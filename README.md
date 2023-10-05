
<div align="center">
  <a href="https://choosealicense.com/licenses/mit/">
    <img src="https://img.shields.io/badge/LICENSE-MIT-blue?style=flat-square" alt="MIT License">
  </a>
  
  <img src="https://img.shields.io/badge/BUILD-PASSING-green?style=flat-square" alt="Build Passing">
</div>

<div align="center">
    <img src="https://shorty-cut.vercel.app/logo.png" height="200px" width="200px">
</div>



# SHORTY URL FULL STACK DEVELOPMENT

A clean & elegant design using Ant Design framework and React Hooks for optimal performance and Express Server for backend operations. All serverless function which is easily deployed on vercel.


## Tech Stack

**CLIENT:** React, Hooks, Ant Design 5+

**SERVER:** Node, Express


## Features

- SSL Secure Shorty Links
- Only HTTPS Links Allowed
- Downloadable QR CODE TAG
- Report Scam Links
- Route Free Single Page Design With Dynamic Menu
- Total Links & Links Clicked Stats
- Per link Stats how many times clicked individually and other info

## Live Preview

https://shorty-cut.vercel.app/

## Screenshots

<details>
  <summary>See SS here.</summary>
  <div align="center">
  <h4>Home Page View</h4>
  <img src="https://github.com/shehari007/url-shorty/blob/main/screenshots/shorty%20(3).png?raw=true" name="image-1">
  <h4>Link Generate View</h4>
  <img src="https://github.com/shehari007/url-shorty/blob/main/screenshots/shorty%20(4).png?raw=true" name="image-2">
  <h4>Report Form View</h4>
  <img src="https://github.com/shehari007/url-shorty/blob/main/screenshots/shorty%20(2).png?raw=true" name="image-3">
  <h4>Contact Form View</h4>
  <img src="https://github.com/shehari007/url-shorty/blob/main/screenshots/shorty%20(1).png?raw=true" name="image-4">
  </div>
</details>

## Pre Requirements

- React 18+
- Node
- XAMPP / Or any cloud based MySQL Database
- VSCODE With ES6+ Module

## Highly Recommended

`Download the release zip for complete Frontend & Backend files and skip cloning steps from Installation for less confusion beacuse of seperate repos for Frontend & Backend`
  
## Installation

Clone the project

```bash
  git clone https://github.com/shehari007/url-shorty.git
```

Go to the project directory

```bash
  cd url-shorty
```

Rename the .env.example file -> .env and fill out the empty fields

```bash
## BACKEND SERVER ENDPOINTS HERE 

REACT_APP_API_URL=                #e.g http://localhost:5000/
REACT_APP_API_REPORT_URL=         #e.g http://localhost:5000/report
REACT_APP_API_STATS_URL=          #e.g http://localhost:5000/stats
REACT_APP_API_CONTACT_URL=        #e.g http://localhost:5000/contact 

REACT_APP_GITHUB_URL= https://github.com/shehari007/

## set false for production
REACT_APP_DEBUG_MODE=true 
```

Install dependencies

```bash
  npm install
```

Start the frontend

```bash
  npm start
```

## For Backend Node Express Server


Clone the project

```bash
  git clone https://github.com/shehari007/url-shorty-server.git
```

Go to the project directory

```bash
  cd url-shorty-server
```

Rename the .env.example file -> .env and fill out the empty fields

```bash
## MAIN PORT ##

PORT=5000   ## keep it 5000 if you used example links in env file for frontend

## DB connection ##

DBHOST=                
DBPORT=
DBUSERNAME=
DBPASS=
DBNAME=

## CORS ORIGIN DOMAINS & METHODS ##

DOMAINS= http://localhost:3000             ## Local running frontend address
METHODS= 'GET,POST'

## SHORT URL GENERATE CONSTRUCTOR ##

SHORTURLDEF=http://localhost:5000/co/      ## this is the default constructor for generated URL's 


##DEFAULT LENGTH OF NANOID PARAM FOR SHORTYURL

PARAMLEN=5 
```

Install dependencies

```bash
  npm install && npm install nodemon --global
```

Start the server

```bash
  nodemon index.js
```

## Server Deployment

`To deploy as a serverless function vercel json config is provided in server files you can deploy this on vercel without any extra configuration`


## Roadmap

- Integrate Google Captcha to emit the use of bots generating short links (work in progress)

- Per link Stats how many times clicked individually and other info (completed & live)

- Show links generated by same ip in a table for each user individually (work in progress)


## License

[MIT](https://choosealicense.com/licenses/mit/)


## Feedback

If you have any feedback, please reach out at shehariyar@gmail.com

## Liked my dedication? Buy me a coffee?
<a href="https://www.buymeacoffee.com/shehari007">☕ Buy Me A Coffee</a>
