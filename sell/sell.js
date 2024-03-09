const UPBIT_SERVICE = require("../service/upbit");
const AUTH_SERVICE = require("../service/auth");
const fs = require("fs");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

const parse = require("csv-parse").parse;

let isRunning = false;
let USER = {};
let chkMode = "상승";
let surgingCoins = [];

async function init() {
  await loadConfig();

  const login = await AUTH_SERVICE.login(USER.id, USER.password);
  if (!login.success) {
    console.log("로그인 실패");
    return;
  }

  const csvData = fs.readFileSync("sell.csv", "utf-8");
  parse(csvData, { columns: true }, (err, records) => {
    if (err) {
      console.error("CSV 파싱 오류:", err);
      return;
    }
    records.forEach((record) => {
      const coinName = record.market;
      const targetPrice = parseFloat(record.price);
      console.log("======================\n");
      console.log(`=== ${coinName}/${targetPrice} 판매 시도 ===`);
      console.log("======================\n");
    });
  });
  const answer = await question(` 코인을 판매 시도합니다 계속하시겠습니까? (Y/N) `);

  if (answer.toUpperCase() !== "Y") {
    console.log("프로그램을 종료합니다.");
    process.exit(0);
  }

  console.log(`[${getTimestamp()}] 프로그램을 시작합니다.`);
  setInterval(main, 10 * 1000);
}

async function getParsedData() {
  const csvData = fs.readFileSync("sell.csv", "utf-8");
  return new Promise((resolve, reject) => {
    parse(csvData, { columns: true }, (err, records) => {
      if (err) {
        reject(err);
      }
      resolve(records);
    });
  });
}

async function main() {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    const data = await getParsedData();
    for (const record of data) {
      const coinName = record.market;
      const targetPrice = parseFloat(record.price);
      const currentPrice = await UPBIT_SERVICE.getCurrentPrice("KRW-" + coinName);
      console.log(`[${getTimestamp()}] ${coinName}의 현재 가격: ${currentPrice}`);
      if (currentPrice >= targetPrice) {
        console.log(`[${getTimestamp()}] ${coinName}의 현재 가격이 목표가에 도달했습니다.`);
        const result = await UPBIT_SERVICE.sell(USER.accessToken, coinName, currentPrice);
        if (result.success) {
          console.log(`[${getTimestamp()}] ${coinName}을 ${currentPrice}에 판매했습니다.`);
        } else {
          console.error(`[${getTimestamp()}] ${coinName}을 판매하는데 실패했습니다.`);
        }
      }
    }
    console.log(`[${getTimestamp()}] BTC의 현재 가격: ${currentPrice}`);
  } catch (e) {
    console.error(e);
  } finally {
    isRunning = false;
  }
}

async function loadConfig() {
  try {
    USER = JSON.parse(fs.readFileSync("./config.json", "utf8"));
  } catch (e) {
    console.error(e);
  }
}

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function question(query) {
  return new Promise((resolve) => readline.question(query, resolve));
}

init();
