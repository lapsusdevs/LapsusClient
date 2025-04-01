//
// Thanks for using Lapsus Client
// 
//  * Leave a like on the repository
//

"use strict";

// Load packages.

const fs = require("fs");
const fetch = require('node-fetch');
const chalk = require("chalk");
const axios = require("axios");
const os = require("os");
const { networkInterfaces } = require("os");
const arciotext = require('./stuff/arciotext')
global.Buffer = global.Buffer || require('buffer').Buffer;

if (typeof btoa === 'undefined') {
  global.btoa = function (str) {
    return new Buffer(str, 'binary').toString('base64');
  };
}
if (typeof atob === 'undefined') {
  global.atob = function (b64Encoded) {
    return new Buffer(b64Encoded, 'base64').toString('binary');
  };
}

// Load settings.

const settings = require("./settings.json");

const defaultthemesettings = {
  index: "index.ejs",
  notfound: "index.ejs",
  redirect: {},
  pages: {},
  mustbeloggedin: [],
  mustbeadmin: [],
  variables: {}
};

module.exports.renderdataeval =
  `(async () => {
   let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
	const JavaScriptObfuscator = require('javascript-obfuscator');

 
    let renderdata = {
      req: req,
      settings: newsettings,
      userinfo: req.session.userinfo,
      packagename: req.session.userinfo ? await db.get("package-" + req.session.userinfo.id) ? await db.get("package-" + req.session.userinfo.id) : newsettings.api.client.packages.default : null,
      extraresources: !req.session.userinfo ? null : (await db.get("extra-" + req.session.userinfo.id) ? await db.get("extra-" + req.session.userinfo.id) : {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0
      }),
		packages: req.session.userinfo ? newsettings.api.client.packages.list[await db.get("package-" + req.session.userinfo.id) ? await db.get("package-" + req.session.userinfo.id) : newsettings.api.client.packages.default] : null,
      coins: newsettings.api.client.coins.enabled == true ? (req.session.userinfo ? (await db.get("coins-" + req.session.userinfo.id) ? await db.get("coins-" + req.session.userinfo.id) : 0) : null) : null,
      pterodactyl: req.session.pterodactyl,
      theme: theme.name,
      extra: theme.settings.variables,
	    db: db
    };
    if (newsettings.api.arcio.enabled == true && req.session.arcsessiontoken) {
      renderdata.arcioafktext = JavaScriptObfuscator.obfuscate(\`
        let token = "\${req.session.arcsessiontoken}";
        let everywhat = \${newsettings.api.arcio["afk page"].every};
        let gaincoins = \${newsettings.api.arcio["afk page"].coins};
        let arciopath = "\${newsettings.api.arcio["afk page"].path.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, "\\\\\\"")}";

        \${arciotext}
      \`);
    };

    return renderdata;
  })();`;

// Load database

const Keyv = require("keyv");
const db = new Keyv(settings.database);

db.on('error', err => {
  console.log(chalk.red("[ERROR] An error has occured when attempting to access the database."))
});

module.exports.db = db;

// Load websites.

const express = require("express");
const app = express();
require('express-ws')(app);

// Load express addons.

const ejs = require("ejs");
const session = require("express-session");
const indexjs = require("./index.js");

// Load the website.

module.exports.app = app;

app.use(session({secret: settings.website.secret, resave: false, saveUninitialized: false}));

app.use(express.json({
  inflate: true,
  limit: '500kb',
  reviver: null,
  strict: true,
  type: 'application/json',
  verify: undefined
}));

const listener = app.listen(settings.website.port, function() {
  console.clear();
  console.log(chalk.gray("  "));
  console.log(chalk.gray("  ") + chalk.bgBlack("  LAPSUS CLIENT IS ONLINE  "));
  console.log(chalk.gray("  "));
  console.log(chalk.gray("  ") + chalk.green("[VERSION]") + chalk.white(" You're using version ") + chalk.underline(settings.version));
  console.log(chalk.gray("  "));
  console.log(chalk.gray("  ") + chalk.blue("[THEME]") + chalk.white(" You're using ") + chalk.underline(settings.defaulttheme) + " theme");
  console.log(chalk.gray("  "));
  console.log(chalk.gray("  ") + chalk.cyan("[SYSTEM]") + chalk.white(" You can now access the dashboard at ") + chalk.underline(settings.api.client.oauth2.link + "/"));
  console.log(chalk.gray("  "));
  console.log(chalk.gray("  ") + chalk.red("[CRITICAL]") + chalk.white(" Failed while loading assets to render pages. Continue at your own risk!"));
  if (settings.version !== '4apr1l f00ls'){
  console.log(chalk.gray("  "));
  console.log(chalk.gray("  ") + chalk.red("[ERROR]") + chalk.white(" SQLite Database is corrupted! Data cannot be saved"));
  }
  if (settings.defaulttheme !== 'lapsus' && settings.defaulttheme !== 'lapsusv2' && settings.defaulttheme !== 'pylex') {
  console.log(chalk.gray("  "));
  console.log(chalk.gray("  ") + chalk.yellow("[WARNING]") + chalk.white(" You're using an unofficial theme. This means you are exposed to vulnerabilities and bugs. Consider using the official theme or a third party theme provided by Lapsus."));  }
  });

var cache = false;
app.use(function(req, res, next) {
  let manager = (JSON.parse(fs.readFileSync("./settings.json").toString())).api.client.ratelimits;
  if (manager[req._parsedUrl.pathname]) {
    if (cache == true) {
      setTimeout(async () => {
        let allqueries = Object.entries(req.query);
        let querystring = "";
        for (let query of allqueries) {
          querystring = querystring + "&" + query[0] + "=" + query[1];
        }
        querystring = "?" + querystring.slice(1);
        res.redirect((req._parsedUrl.pathname.slice(0, 1) == "/" ? req._parsedUrl.pathname : "/" + req._parsedUrl.pathname) + querystring);
      }, 1000);
      return;
    } else {
      cache = true;
      setTimeout(async () => {
        cache = false;
      }, 1000 * manager[req._parsedUrl.pathname]);
    }
  };
  next();
});


// Load the API files.

let apifiles = fs.readdirSync('./api').filter(file => file.endsWith('.js'));

apifiles.forEach(file => {
  let apifile = require(`./api/${file}`);
	apifile.load(app, db);
});

app.all("*", async (req, res) => {
  if (req.session.pterodactyl) if (req.session.pterodactyl.id !== await db.get("users-" + req.session.userinfo.id)) return res.redirect("/login?prompt=none");
  let theme = indexjs.get(req);
let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
if (newsettings.api.arcio.enabled == true) req.session.arcsessiontoken = Math.random().toString(36).substring(2, 15);
  if (theme.settings.mustbeloggedin.includes(req._parsedUrl.pathname)) if (!req.session.userinfo || !req.session.pterodactyl) return res.redirect("/login" + (req._parsedUrl.pathname.slice(0, 1) == "/" ? "?redirect=" + req._parsedUrl.pathname.slice(1) : ""));
  if (theme.settings.mustbeadmin.includes(req._parsedUrl.pathname)) {
    ejs.renderFile(
      `./themes/${theme.name}/${theme.settings.notfound}`, 
      await eval(indexjs.renderdataeval),
      null,
    async function (err, str) {
      delete req.session.newaccount;
      delete req.session.password;
      if (!req.session.userinfo || !req.session.pterodactyl) {
        if (err) {
          console.log(chalk.red(`[ERROR] An error has occured on path ${req._parsedUrl.pathname}:`));
          console.log(err);
          return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
        };
        res.status(200);
        return res.send(str);
      };

      let cacheaccount = await fetch(
        settings.pterodactyl.domain + "/api/application/users/" + (await db.get("users-" + req.session.userinfo.id)) + "?include=servers",
        {
          method: "get",
          headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
        }
      );
      if (await cacheaccount.statusText == "Not Found") {
        if (err) {
          console.log(chalk.red(`[ERROR] An error has occured on path ${req._parsedUrl.pathname}:`));
          console.log(err);
          return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
        };
        return res.send(str);
      };
      let cacheaccountinfo = JSON.parse(await cacheaccount.text());
    
      req.session.pterodactyl = cacheaccountinfo.attributes;
      if (cacheaccountinfo.attributes.root_admin !== true) {
        if (err) {
          console.log(chalk.red(`[ERROR] An error has occured on path ${req._parsedUrl.pathname}:`));
          console.log(err);
          return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
        };
        return res.send(str);
      };

      ejs.renderFile(
        `./themes/${theme.name}/${theme.settings.pages[req._parsedUrl.pathname.slice(1)] ? theme.settings.pages[req._parsedUrl.pathname.slice(1)] : theme.settings.notfound}`, 
        await eval(indexjs.renderdataeval),
        null,
      function (err, str) {
        delete req.session.newaccount;
        if (err) {
          console.log(`[ERROR] An error has occured on path ${req._parsedUrl.pathname}:`);
          console.log(err);
          return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
        };
        res.status(200);
        res.send(str);
      });
    });
    return;
  };
    const data = await eval(indexjs.renderdataeval)
  ejs.renderFile(
    `./themes/${theme.name}/${theme.settings.pages[req._parsedUrl.pathname.slice(1)] ? theme.settings.pages[req._parsedUrl.pathname.slice(1)] : theme.settings.notfound}`, 
    data,
    null,
  function (err, str) {
    delete req.session.newaccount;
    if (err) {
      console.log(chalk.red(`[ERROR] An error has occured on path ${req._parsedUrl.pathname}:`));
      console.log(err);
      return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
    };
    res.status(200);
    res.send(str);
  });
});

module.exports.get = function(req) {
  let defaulttheme = JSON.parse(fs.readFileSync("./settings.json")).defaulttheme;
  let tname = encodeURIComponent(getCookie(req, "theme"));
  let name = (
    tname ?
      fs.existsSync(`./themes/${tname}`) ?
        tname
      : defaulttheme
    : defaulttheme
  )
  return {
    settings: (
      fs.existsSync(`./themes/${name}/pages.json`) ?
        JSON.parse(fs.readFileSync(`./themes/${name}/pages.json`).toString())
      : defaultthemesettings
    ),
    name: name
  };
};

module.exports.islimited = async function() {
  return cache == true ? false : true;
}

module.exports.ratelimits = async function(length) {
  if (cache == true) return setTimeout(
    indexjs.ratelimits
    , 1
  );
  cache = true;
  setTimeout(
    async function() {
      cache = false;
    }, length * 1000
  )
}

/* Copying the 𝕃𝕒𝕡𝕤𝕦𝕤 repository and claiming as yours or your project will have consequences. Think twice before doing it. */

// Get a cookie.
function getCookie(req, cname) {
  let cookies = req.headers.cookie;
  if (!cookies) return null;
  let name = cname + "=";
  let ca = cookies.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return decodeURIComponent(c.substring(name.length, c.length));
    }
  }
  return "";
}

// Telemetry system (only recopiles basic info, not credentials)

async function sendTelemetry() {
  try {
      const systemInfo = {
          name: settings.name,
          version: settings.version,
          theme: settings.defaulttheme,
          port: settings.website.port,
          panel: settings.pterodactyl.domain,
          auto_update: settings.auto_update,
          os: os.platform(),
          osVersion: os.release(),
          architecture: os.arch(),
          hostname: os.hostname(),
          uptime: os.uptime(),
      };

      const telemetryServer = "http://paid01.pluox.xyz:3001/telemetry";
      
      await fetch(telemetryServer, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify(systemInfo),
      });        
  } catch (error) {
      console.error('Error sending telemetry:', error);
  }
}
if (settings.telemetry === true) {
  sendTelemetry();
}


const path = require("path");
const https = require("https");
const { writeFile, readFileSync } = require("fs");
const unzipper = require("unzipper");
const { exec } = require("child_process");
const fse = require("fs-extra");

const REPO_OWNER = "ManucrackYT";
const REPO_NAME = "LapsusClient";
const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
const ZIP_URL_KEY = "zipball_url";
const SETTINGS_FILE = path.join(__dirname, "settings.json");
const UPDATE_DIR = path.join(__dirname, "update.zip");
const APP_DIR = __dirname;

function getCurrentVersion() {
    try {
        const settings = JSON.parse(readFileSync(SETTINGS_FILE, "utf8"));
        return settings.version;
    } catch (error) {
        console.error("Error reading settings.json:", error);
        return "0.0.0";
    }
}

async function checkForUpdates() {
    try {
        // Read settings.json to check if auto_update is true
        const settings = JSON.parse(readFileSync(SETTINGS_FILE, "utf8"));
        if (!settings.auto_update) {
            console.log("Auto update is disabled in settings.json.");
            return;
        }

        const response = await fetch(GITHUB_API, {
            headers: { "User-Agent": "LapsusClient-Updater" },
        });
        const data = await response.json();

        if (!data || !data.tag_name) {
            console.error("Failed to fetch latest release from GitHub.");
            return;
        }

        const latestVersion = data.tag_name.replace("v", "");
        const currentVersion = getCurrentVersion();

        if (latestVersion !== currentVersion) {
            console.log(`New version available: ${latestVersion}. Downloading update...`);
            await downloadUpdate(data[ZIP_URL_KEY], latestVersion);
        } else {
            console.log(chalk.gray("  "));
            console.log(chalk.gray("  ") + chalk.magenta("[INFO]") + chalk.white(" You are already running the latest version."));
            
        }
    } catch (error) {
        console.error("Error checking for updates:", error);
    }
}

async function downloadUpdate(url, newVersion) {
    console.log("Downloading update...");
    try {
        const redirectedUrl = await getFinalRedirectUrl(url);
        console.log("Final download URL:", redirectedUrl);

        return new Promise((resolve, reject) => {
            const filePath = path.join(__dirname, "update.zip");
            const file = fs.createWriteStream(filePath); // Fix: Correct file creation

            const options = { headers: { "User-Agent": "LapsusClient-Updater" } };
            https.get(redirectedUrl, options, (response) => {
                if (response.statusCode !== 200) {
                    console.error("Failed to download update, HTTP Status:", response.statusCode);
                    reject(new Error("Download failed"));
                    return;
                }

                response.pipe(file);

                file.on("finish", () => {
                    file.close();
                    console.log("Update downloaded successfully.");
                    resolve(installUpdate(newVersion));
                });

                file.on("error", (error) => {
                    console.error("Error writing update file:", error);
                    reject(error);
                });
            }).on("error", (error) => {
                console.error("Download request failed:", error);
                reject(error);
            });
        });
    } catch (error) {
        console.error("Error downloading update:", error);
    }
}

async function getFinalRedirectUrl(url) {
  return new Promise((resolve, reject) => {
      https.get(url, { headers: { "User-Agent": "LapsusClient-Updater" } }, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
              resolve(response.headers.location); // Follow redirect
          } else if (response.statusCode === 200) {
              resolve(url); // No redirect, return the original
          } else {
              reject(new Error(`Unexpected response: ${response.statusCode}`));
          }
      }).on("error", (error) => reject(error));
  });
}

async function installUpdate(newVersion) {
  try {
      console.log("Checking update file...");
      const fileStats = fs.statSync(UPDATE_DIR);

      if (fileStats.size < 1000) { // Small file likely means corruption
          console.error("Downloaded file is too small, update failed.");
          return;
      }

      console.log("Extracting update...");
      const tempDir = path.join(__dirname, "temp_update");

      await fse.ensureDir(tempDir);
      await fs.createReadStream(UPDATE_DIR)
          .pipe(unzipper.Extract({ path: tempDir }))
          .promise();

      console.log("Replacing old files...");
      const extractedFolders = fs.readdirSync(tempDir);
      if (extractedFolders.length !== 1) {
          throw new Error("Unexpected update folder structure.");
      }

      const extractedPath = path.join(tempDir, extractedFolders[0]);
      await fse.copy(extractedPath, APP_DIR, { overwrite: true });

      fs.unlinkSync(UPDATE_DIR);
      await fse.remove(tempDir);

      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
      settings.version = newVersion;
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));

      console.log("Update installed successfully. Restarting...");
      restartApplication();
  } catch (error) {
      console.error("Error installing update:", error);
  }
}

function restartApplication() {
  console.log("Restarting the application...");

  // Try restarting with PM2
  exec("pm2 restart LapsusClient", (error, stdout, stderr) => {
      if (error) {
          console.error("Failed to restart using PM2, trying direct method...");
          console.error(stderr);

          // Manual restart if PM2 fails
          const pid = process.pid;

          console.log(`Stopping current process (PID: ${pid})...`);
          exec(`taskkill /PID ${pid} /F`, (err, out, errOut) => {
              if (err) {
                  console.error("Manual stop failed:", errOut);
              } else {
                  console.log("Process stopped. Starting a new instance...");
                  setTimeout(() => {
                      exec("node index.js", (restartErr, restartOut, restartErrOut) => {
                          if (restartErr) {
                              console.error("Failed to start new instance:", restartErrOut);
                          } else {
                              console.log("Application restarted successfully.");
                          }
                      });
                  }, 2000); // Delay to ensure full termination
              }
          });
      } else {
          console.log("Application restarted successfully using PM2.");
      }
  });
}

checkForUpdates();