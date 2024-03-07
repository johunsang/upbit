const UPBIT_SERVICE = require("../service/upbit");
const fs = require("fs");

let isRunning = false;
let USER = {};

const openConfig = async () => {
  return new Promise((resolve, reject) => {
    try {
      const data = fs.readFileSync("./bconfig.json", "utf8");
      const jsonData = JSON.parse(data);
      resolve(jsonData);
    } catch (e) {
      console.error(e);
      resolve({});
      // console.log("설정파일을 읽을 수 없습니다.");
    }
  });
};
 

const init = async () => {
  console.log(formatTimestamp() + " 같은 디렉토리에 bconfig.json 파일을 읽습니다.");
  USER = await openConfig();
  setInterval(main, USER.program_interval * 1000);
};

init();

const main = async () => {
  if (isRunning) {
    console.log(formatTimestamp() + " 이미 실행 중입니다. 다음 실행을 대기합니다.");
    return; // 이미 실행 중이면 바로 종료
  }
  try {
    isRunning = true;
    const token = await UPBIT_SERVICE.getToken(USER.access_key, USER.secret_key);
    const candles = await UPBIT_SERVICE.getCandles("KRW-BTC", token);
    const targetMarkrt = await identifySurgingCoin(candles.data);
    if (targetMarkrt.success) {
      const orderbook = await UPBIT_SERVICE.getOrderBook("KRW-BTC", token);
      const volume = USER.amount / orderbook.data[0].orderbook_units[0].ask_price;

      const body = {
        market: "KRW-BTC",
        side: "bid",
        volume: volume + "",
        price: orderbook.data[0].orderbook_units[0].ask_price + "",
        ord_type: "limit",
      };

      const userToken = await UPBIT_SERVICE.getUserTokens(USER.access_key, USER.secret_key, body);
      const orderResult = await UPBIT_SERVICE.orderToUpbit(body, userToken);
      console.log(formatTimestamp() + "매수완료: ", orderResult.message);
      console.log(orderResult);
    } else {
    }

    await delay(100);
  } finally {
    isRunning = false; // 실행 완료 후 상태를 false로 재설정
  }
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const identifySurgingCoin = async (candles) => {
  return new Promise(async (resolve, reject) => {
    const increases = {
      "1min": calculateIncrease(candles[1].trade_price, candles[0].trade_price),
      "5min": calculateIncrease(candles[5].trade_price, candles[0].trade_price),
    //   "30min": calculateIncrease(candles[29].trade_price, candles[0].trade_price),
    };

    let allIncreasesArePositive = Object.values(increases).every((value) => value < 0);

    console.log(formatTimestamp() + "각 시간별 증가율: ", increases);

    if (allIncreasesArePositive) {
      resolve({
        success: true,
        increases: increases,
      });
      return;
    } else {
      resolve({
        success: false,
        message: increases,
      });
      return;
    }
  });
};

const calculateIncrease = (startPrice, endPrice) => {
  return ((endPrice - startPrice) / startPrice) * 100;
};

function formatTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}] ====>> `;
}
