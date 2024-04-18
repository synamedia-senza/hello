# Hello

A demonstration of device-based authentication. 

If your device is connected to an account in the config.json file, it will authorize automatically. 

If the device is not connected to an account, it will show a QR code that you can scan with your phone. When you sign in (default credentials are "eliza" / "Senza2024"), it will associate the device with your account. This will take effect as long as the server is running. 

Hit the back button (escape key) to disconnect the device from your account.

## Build

```bash
npm install

cd public
npm install
npm ci
npx webpack --config webpack.config.js
cd ..
```

## Run

```
node server.js
ngrok http 8080
```
Open the link shown by ngrok on a Senza device.

