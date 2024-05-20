let accessToken = "";

window.addEventListener("load", async () => {
  await hs.init();
  
  let assertion = await getClientAssertion();
  accessToken = await getAccessToken(assertion);
  console.log("Access token: " + accessToken);
  
  hello();

  hs.messageManager.addEventListener("message", async (event) => {
    hello();
  });

  hs.uiReady();
});

async function getClientAssertion() {
  try {
    const client_assertion = await hs.auth.getClientAssertion();
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

async function hello() {
  let response = await fetch("/hello", {
  	headers: { "Authorization": "Bearer " + accessToken }
  });
  if (response.status == 401) {
    console.log("Unauthorized.");
    showQRCode();
  } 
  let json = await response.json();
  console.log("Hello: ", json);
  updateUserInfo(json);
} 

function updateUserInfo(userInfo) {
  if (userInfo?.name && userInfo?.color) {
    banner.innerHTML = `Hello, ${userInfo.name}!`;
    body.style.backgroundColor = userInfo?.color;
    qrcode.style.display = "none";
  }
}

function showQRCode() {
  let page = window.location.href;
  if (page.endsWith("html") || page.endsWith("/")) {
    page = page.substring(0, page.lastIndexOf('/'));
  }
  let size = 400; 
  let data = encodeURIComponent(page + "/login.html#" + accessToken);
  let src = `https://api.qrserver.com/v1/create-qr-code/?data=${data}&size=${size}x${size}`;
  qrcode.src = src;
  qrcode.style.display = "block";
  
}

document.addEventListener("keydown", (event) => {
  if (event.key == "Escape") {
    goodbye();
  }
});

async function goodbye() {
  let response = await fetch("/goodbye", {
  	headers: { "Authorization": "Bearer " + accessToken }
  });
  banner.innerHTML = "";
  body.style.backgroundColor = "white";
  showQRCode();
} 

