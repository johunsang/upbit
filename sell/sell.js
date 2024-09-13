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


  const myCoinList = await  getMyCoinList(token);
  checkMyCoin(myCoinList,token);

}

const checkMyCoin = async (myCoinList, token) => {
  
  const margin = USER.margin_percent;
  const stopLoss = USER.stopLoss_percent;
  const excludeCoin = USER.exclude_markets.split(",");  

  if (USER.isLoveMyMarkets) {
    let myLovelyMarkets = USER.myLovelyMarkets.split(",");
    myCoinList = myCoinList.filter(coin => {
      if (coin.currency === "KRW") {
        return true;
      }
      if (myLovelyMarkets.includes(coin.currency)) {
        console.log(`[${getTimestamp()}] ${coin.currency} 은 내가 좋아하는 마켓입니다..`);
        return true;
      }
      return false;
    });
  }
  console.log(`[${getTimestamp()}] 제외마켓 ${ excludeCoin}`);

  for(const coin of myCoinList){
    // console.log(coin);
    if(coin.currency === "KRW"){
      continue;
    }

    if(excludeCoin && excludeCoin.includes(coin.currency)){
      console.log(`[${getTimestamp()}] ${coin.currency} 은 제외 마켓입니다. 판매하지 않습니다.`);
      continue;
    }

    const coinName = coin.currency;
    const buyPrice = coin.avg_buy_price;
    const volume = coin.balance;
    const margin_volume_percent = USER.margin_volume_percent;
    const stopLoss_volume_percent = USER.stopLoss_volume_percent; 

    const snapShot = await UPBIT_SERVICE.getTicker("KRW-" + coinName,token);
 
    if(!snapShot.success || !snapShot.data[0]){
      console.error(`[${getTimestamp()}] ${coinName} 업비트 API 요청 중 에러 발생 ` );
     continue;
    }
    const currentPrice = snapShot.data[0].trade_price;
    const marginPrice = buyPrice * (1 + margin / 100);
    const stopLossPrice = buyPrice * (1 + stopLoss / 100);
    const marginVolume = volume * (1 + margin_volume_percent / 100) - volume;
    const stopLossVolume = volume * (1 + stopLoss_volume_percent / 100) - volume;
    const currentMargin = currentPrice - buyPrice;  
    const currentMarginPercent = (currentMargin / buyPrice) * 100;

    console.log(`-------------------------------------------------------`);
    console.log(`[${getTimestamp()}] ${coinName}의 현재 가격: ${currentPrice}`);
    console.log(`[${getTimestamp()}] ${coinName}의 구매 가격의 평균가격: ${buyPrice}`);
    console.log(`[${getTimestamp()}] ${coinName}의 보유량: ${volume}`);
    console.log(`[${getTimestamp()}] ${coinName}는 현재 마진은 ${currentMargin} (${currentMarginPercent.toFixed(2)}%) 입니다 .`);
    console.log(`[${getTimestamp()}] ${coinName}의 목표가: ${marginPrice}(${margin}%)이상으로 오르면 판매합니다.`);
    console.log(`[${getTimestamp()}] ${coinName}의 손절가: ${stopLossPrice}(${stopLoss}%) 이하로 떨어지면 판매합니다.`);
    console.log(`[${getTimestamp()}] ${coinName}의 목표가격에 도달했을 때 판매할 양: ${marginVolume}(${margin_volume_percent}%)`);
    console.log(`[${getTimestamp()}] ${coinName}의 손절가격에 도달했을 때 판매할 양: ${stopLossVolume}(${stopLoss_volume_percent}%)`);
    console.log(`-------------------------------------------------------`);


    if(currentPrice >= marginPrice){
      console.log(`[${getTimestamp()}] ${coinName}의 현재 가격이 목표가에 도달했습니다. 판매를 시도합니다`);
      const result = await sellCoin("KRW-" + coinName, marginVolume, token);
      if(result.success){
        console.log(`[${getTimestamp()}] ${coinName}을 판매했습니다.`);
      }else{
        console.error(`[${getTimestamp()}] ${coinName}을 판매하는데 실패했습니다.`);
      }
    }

    if(currentPrice <= stopLossPrice){
      console.log(`[${getTimestamp()}] ${coinName}의 현재 가격이 손절가에 도달했습니다. 판매를 시도합니다`);
      const result = await sellCoin("KRW-" + coinName, stopLossVolume, token);
      if(result.success){
        console.log(`[${getTimestamp()}] ${coinName}을 판매했습니다.`);
      }
      else{
        console.error(`[${getTimestamp()}] ${coinName}을 판매하는데 실패했습니다.`);
      }
    }

    await delay(1000);
  }
}

async function sellCoin(market, volume, token) {
  return new Promise(async (resolve, reject) => {

    try{
      const orderbook = await UPBIT_SERVICE.getOrderBook(market, token);

      console.log(`[${getTimestamp()}] ${market}의 현재 매도 호가:`, orderbook.data[0].orderbook_units[0].bid_price); 

      const body = {
        market: market,
        side: "ask",
        volume: volume.toString(),
        price: orderbook.data[0].orderbook_units[0].bid_price.toString(),
        ord_type: "limit",
      };
    
      const userToken = await UPBIT_SERVICE.getUserToken(USER.access_key, USER.secret_key, body);
      const orderResult = await UPBIT_SERVICE.createOrder(body, userToken);
    
      console.log(`[${getTimestamp()}] ${market} 매도 주문:`, orderResult);

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


async function getMyCoinList() {
  const userToken = UPBIT_SERVICE.getUserToken(USER.access_key, USER.secret_key, {});
  // console.log(token);
  const result = await UPBIT_SERVICE.getAcountInfo(userToken);
  if (!result.success) {
    console.error("업비트 API 요청 중 에러 발생");
    return;
  }
  // console.log(result.data);
  return result.data;
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

console.log(`[${getTimestamp()}] 1분 후에 프로그램을 시작합니다. 1분마다 프로그램이 반복합니다`);

setInterval(() => {
  console.log(`[${getTimestamp()}] 1분 후에 프로그램을 시작합니다. 1분마다 프로그램이 반복합니다`);
  init();
}, 60000);