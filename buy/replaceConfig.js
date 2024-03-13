const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

config.id = "값입력필요";
config.password = "값입력필요";
config.secret_key = "값입력필요";
config.access_key = "값입력필요";

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
