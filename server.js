"use strict";
const express = require("express");
const cors = require("cors");
const errorHandler = require('errorhandler');
const got = require("got");
const decodeJwt = require("jwt-decode");
const port = 8080;
const users = require("./users.json");
const app = express();

app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(errorHandler({dumpExceptions: true, showStack: true}));
app.use(cors()); // enable cores

const server = app.listen(port, () => console.log("Hello running on port " + port));


/** Request auth token **/

let tokenDevices = {};

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


/** Get user info **/

app.get('/hello', function (req, res) {
  try {
    let deviceId = validateAccessToken(req);
    let userInfo = getUserInfo(deviceId, true);
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

function getUserInfo(deviceId, allowGuest) {
  let userInfo = users[deviceId];
  if (!userInfo && allowGuest) {
    userInfo = users["default"];
  }
  if (!userInfo) {
    throw new Error("Device not recognized!");
  }
  console.log("User info:", userInfo);
  return userInfo;
}
