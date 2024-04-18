function authorize() {
  let accessToken = (window.location.hash || "#").substring(1);
  fetch("/authorize", {
    method: "POST",
    body: JSON.stringify({
      username: username.value,
      password: passwordHash(password.value)
    }),
    headers: {
      "Authorization": "Bearer " + accessToken,
      "Content-type": "application/json"
    }
  }).then(response => {
    if (response.ok) {
      link.innerHTML = "connected!"
    } else {
      link.innerHTML = "try again!"
    }
  });
}

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
