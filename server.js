"use strict";
const express = require("express");
const cors = require("cors");
const errorHandler = require('errorhandler');
const got = require("got");
const decodeJwt = require("jwt-decode");
const port = 8080;
const config = require("./config.json");
const oauth = require("./oauth.json");
const app = express();

app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(errorHandler({dumpExceptions: true, showStack: true}));
app.use(cors()); // enable cores

const server = app.listen(port, () => console.log("Hello running on port " + port));

/** Request an access token! **/

let tokenDevices = {};
let users = config.users;
let devices = config.devices;

app.post("/auth/token", async (req, res) => {
  const clientAssertion = req.body.assertion;
  if (!clientAssertion) {
    res.status(400).json({message: "Invalid Request"});
    return;
  }

  try {
    const payload = await validateClientAssertion(clientAssertion);
    const token = await generateAccessToken(payload);
    res.status(200).json({"access_token":token, "token_type": "bearer", "expires_in": "XXX"});
  } catch (err) {
    console.error(`Error validate client assertion: : ${err}`);
    res.status(401).json({message: "Error validating client assertion"});
  }
});

async function validateClientAssertion(clientAssertion) {
  const payload = decodeJwt(clientAssertion);
  console.log("JWT:", payload);
  const jwks = await getJwks(payload.iss);
  return payload;
}

async function getJwks(iss) {
  try{
    const openid_conf_uri = iss + "/.well-known/openid-configuration";
    console.log("OpenID: " + openid_conf_uri);
    const openid_res = await got(openid_conf_uri);
    if (openid_res.statusCode === 200 && openid_res?.body) {
      const openidConf = JSON.parse(openid_res.body);
      console.log(openidConf);
      if (openidConf?.jwks_uri) {
        console.log("JWKS: " + openidConf.jwks_uri);
        const jwks_res = await got(openidConf.jwks_uri);
        if (jwks_res.statusCode === 200 && jwks_res?.body) {
          console.log(JSON.parse(jwks_res.body).keys[0]);
          return jwks_res;
        }
      }
    }
  } catch (err) {
      console.error(`Error: Cannot load Senza keys: ${err.message}, ${err.stack}`);
  }
  console.error(`Error: Cannot load Senza keys`);
}

function getDeviceId(payload) {
  let subjects = payload.sub.split(":");
  return subjects[subjects.length - 1];
}

async function generateAccessToken(payload) {
  let deviceId = getDeviceId(payload);
  let accessToken = newAcccessToken();
  tokenDevices[accessToken] = deviceId;
  console.log(`Set device ${deviceId} for access token ${accessToken}`);
  return accessToken;
}

function newAcccessToken() {
    return Array.from({ length: 6 }, () => Math.random().toString(36).substr(2)).join('');
};

/** Use the access token to get the user info **/

app.get('/hello', function (req, res) {
  try {
    let deviceId = validateAccessToken(req);
    let userInfo = structuredClone(getUserInfo(deviceId));
    delete userInfo.password;
    res.json(userInfo);
  } catch (error) {
    res.status(401).json({message: error.message});
  }
});

function validateAccessToken(req) {
  let authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new Error("No access token!");
  }
  let accessToken = authorization.substring("Bearer ".length);
  let deviceId = tokenDevices[accessToken];
  if (!deviceId) {
    throw new Error("Invalid access token!");
  }
  console.log(`Got device ${deviceId} for access token ${accessToken}`);
  return deviceId;
}

function getUserInfo(deviceId) {
  let username = devices[deviceId];
  if (!username) throw new Error("Device not authorized!");
  let userInfo = users[username];
  if (!userInfo) throw new Error("Unknown user!");

  console.log("User info:", userInfo);
  return userInfo;
}




/** Use username and password to authorize the device **/

app.post('/authorize', function (req, res) {
  try {
    console.log(req.body);
    let deviceId = validateAccessToken(req);
    let username = req.body.username;
    if (!username) throw new Error("Missing username.");
    let userInfo = users[username];
    if (!userInfo) throw new Error("Invalid username: " + username);
    let password = req.body.password;
    if (!password) throw new Error("Missing password.");
    if (password != userInfo.password) throw new Error("Invalid password: " + password);
   
    // authorized the device for the user
    // you should store this in your database
    devices[deviceId] = username; 
    console.log("Authorized " + username);
    
    // let the app know to try using device authorization again
    sendDeviceMessage(deviceId, {authorized: true}, "DeviceAuthorized");
    
    res.json({status: "authorized"});
  } catch (error) {
    console.log(error.message)
    res.status(401).json({message: error.message});
  }
});

app.get('/goodbye', function (req, res) {
  try {
    let deviceId = validateAccessToken(req);
    
    // deauthorze the device for the user
    // you should remove this from your database
    delete devices[deviceId];
    console.log("Deauthorized " + deviceId);

    res.json({});
  } catch (error) {
    console.log(error.message)
    res.status(401).json({message: error.message});
  }
});

// Use this function to create password hashes
function passwordHash(str) {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    let chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
    hash = Math.abs(hash);
  }
  return hash;
}

/** When the device has been authorized, send a message to have it try again **/

async function getSenzaAcesssToken() {
  let tokenResponse = await fetch("https://auth.synamedia.com/oauth/token", {
  	method: "post",
  	body: JSON.stringify(oauth),
  	headers: {"Content-Type": "application/json"}
  });
  let json = await tokenResponse.json();
  return json.access_token;
}

let senzaAccessToken = "";
getSenzaAcesssToken().then((token) => {
  senzaAccessToken = token;
  setTimeout(() => senzaAcesssToken = getSenzaAcesssToken(), 21600000);
});

async function sendDeviceMessage(deviceId, payload, eventName) {
  await fetch("https://hyperscale-message-broker-main.ingress.active.streaming.synamedia.com/" + 
    "message-broker/1.0/messages/devices/" + deviceId, {
  	method: "post",
  	body: JSON.stringify({
      payload, 
      eventName, 
      "target": "application",
      "origin": "internal"
    }),
  	headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + senzaAccessToken
    }
  });
}
