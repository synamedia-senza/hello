# Hello

A demonstration of client authentication. 

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

