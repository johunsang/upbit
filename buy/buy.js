const UPBIT_SERVICE = require("../service/upbit");
const fs = require("fs");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

const parse = require("csv-parse").parse;

let isRunning = false;
let USER = {};

async function init() {
  await loadConfig();

  const token = await UPBIT_SERVICE.getToken(USER.access_key, USER.secret_key);
  checkMyCoin(token);
}

const checkMyCoin = async (token) => {
  const targetMarket = USER.targetMarket;
  const sellIfBuyPriceIsHigherThan = USER.sellIfBuyPriceIsHigherThan;
  const sellIfBuyPriceIsLowerThan = USER.sellIfBuyPriceIsLowerThan;
  const snapShot = await UPBIT_SERVICE.getTicker("KRW-" + targetMarket,token);

  if(!snapShot.success || !snapShot.data[0]){
    console.error(`[${getTimestamp()}] ${coinName} 업비트 API 요청 중 에러 발생 ` );
    return;
  }
  const currentPrice = snapShot.data[0].trade_price;

  console.log(`-------------------------------------------------------`);
  console.log(`[${getTimestamp()}] ${targetMarket}의 현재 가격: ${currentPrice}`);
  console.log(`[${getTimestamp()}] ${targetMarket}의 목표 가격: ${sellIfBuyPriceIsHigherThan} ~ ${sellIfBuyPriceIsLowerThan}`);
  console.log(`-------------------------------------------------------`);

  if(currentPrice > sellIfBuyPriceIsHigherThan  && currentPrice < sellIfBuyPriceIsLowerThan){
    console.log(`[${getTimestamp()}] ${targetMarket}의 현재 가격이 목표가에 도달했습니다. 구매를 시도합니다`);
    const result = await bidCoin("KRW-" + targetMarket, token);
    if(result.success){
      console.log(`[${getTimestamp()}] ${targetMarket}을 구매했습니다. 프로그램을 종료합니다.`);
      process.exit(0);
    }else{
      console.error(`[${getTimestamp()}] ${targetMarket}을 구매하는데 실패했습니다.`);
    }
  }else{
    console.log(`[${getTimestamp()}] ${targetMarket}의 현재 가격이 목표가에 도달하지 않았습니다. 1분 후에 다시 확인합니다.`);
    await delay(60000); // 1분(60000밀리초) 대기
    checkMyCoin(token); // 재귀적으로 호출하여 반복 체크
  }
}

async function bidCoin(market, token) {
  return new Promise(async (resolve, reject) => {
    try{
      const orderbook = await UPBIT_SERVICE.getOrderBook(market, token);
      const volume = USER.invest / orderbook.data[0].orderbook_units[0].bid_price;

      console.log(`[${getTimestamp()}] ${market}의 현재 매도 호가:`, orderbook.data[0].orderbook_units[0].ask_price); 

      const body = {
        market: market,
        side: "bid",
        volume: volume.toString(),
        price: orderbook.data[0].orderbook_units[0].ask_price.toString(),
        ord_type: "limit",
      };
    
      const userToken = await UPBIT_SERVICE.getUserToken(USER.access_key, USER.secret_key, body);
      const orderResult = await UPBIT_SERVICE.createOrder(body, userToken);
    
      console.log(`[${getTimestamp()}] ${market} 매수 주문:`, orderResult);

      resolve({
        success: true,
        message: "success",
      });
    }catch(e){
      resolve({
        success: false,
        message: e.message,
      });
    }
  });
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