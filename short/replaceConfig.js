const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "config.json");
const configPath2 = path.join(__dirname, "config.back");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
fs.writeFileSync(configPath2, JSON.stringify(config, null, 2));

config.id = "값입력필요";
config.password = "값입력필요";
config.secret_key = "값입력필요";
config.access_key = "값입력필요";

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
