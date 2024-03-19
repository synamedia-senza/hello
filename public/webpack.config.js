const path = require("path");

module.exports = {
    entry: ["./hello.js"],
    mode: "development",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js"
    }
};
