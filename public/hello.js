import { init, uiReady, auth } from "@Synamedia/hs-sdk";

window.addEventListener("load", async () => {
  await init();
  
  let assertion = await getClientAssertion();
  let accessToken = await getAccessToken(assertion);
  let userInfo = await hello(accessToken);
  updateUserInfo(userInfo);

  console.log("Access token: " + accessToken);
  console.log("Hello:", userInfo);

  uiReady();
});

async function getClientAssertion() {
  try {
    const client_assertion = await auth.getClientAssertion();
    console.log("Client assertion: ", client_assertion);
    return client_assertion.hostplatform_assertion;
  } catch (e) {
    console.error("getClientAssertion failed", e);
  }  
}

async function getAccessToken(assertion) {
  let response = await fetch("/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + assertion
  });
  let json = await response.json();
  return json.access_token;
}

async function hello(accessToken) {
  let response = await fetch("/hello", {
  	headers: { "Authorization": "Bearer " + accessToken }
  });
  let json = await response.json();
  return json;
} 

function updateUserInfo(userInfo) {
  if (userInfo?.name && userInfo?.color) {
    banner.innerHTML = `Hello, ${userInfo.name}!`;
    body.style.backgroundColor = userInfo?.color;
  }
}