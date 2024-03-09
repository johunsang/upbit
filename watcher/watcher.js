const UPBIT_SERVICE = require("../service/upbit");
const fs = require("fs");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

let isRunning = false;
let USER = {};

async function loadConfig() {
  try {
    USER = JSON.parse(fs.readFileSync("./config.json", "utf8"));
  } catch (e) {
    console.error(e);
  }
}

async function init() {
  await loadConfig();
  console.log(`[${getTimestamp()}] 설정 파일을 읽었습니다.`, USER);
  const buyMode = USER.only_buy ? "구매만 하는 모드" : "구매 및 판매 모드";
  console.log(`[${getTimestamp()}] 현재 모드: ${mode}, ${buyMode}`);

  const answer = await question(`현재 모드는 ${mode}, ${buyMode}입니다. 계속하시겠습니까? (Y/N) `);

  if (answer.toUpperCase() !== "Y") {
    console.log("프로그램을 종료합니다.");
    process.exit(0);
  }

  console.log(`[${getTimestamp()}] 프로그램을 시작합니다.`);
  setInterval(main, 10 * 1000);
}

async function main() {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    const token = await UPBIT_SERVICE.getToken(USER.access_key, USER.secret_key);
    const markets = (await UPBIT_SERVICE.getMarketAll(token)).data;
    const marketsKRW = markets.filter((market) => market.market.indexOf("KRW") > -1);
    const marketParams = marketsKRW.map((market) => market.market).join(",");
    const snapShot = await UPBIT_SERVICE.getTicker(marketParams, token);
    const targetMarkets = filterTargetMarkets(snapShot.data);
    const targetMarketCodes = targetMarkets.map((item) => item.market);
    const targetMarketsKRW = markets.filter((market) => market.market.startsWith("KRW") && targetMarketCodes.includes(market.market));

    console.log(`[${getTimestamp()}] 필터링된 KRW 마켓 이름: ${targetMarketsKRW.map((item) => item.korean_name).join(", ")}`);

    const surgingCoins = await identifySurgingCoins(targetMarketsKRW, token);
    console.log(`[${getTimestamp()}] 급등 코인 확인 :`, surgingCoins.map((item) => item.korean_name).join(", "));

    await Promise.all(surgingCoins.map((market) => tradeCoin(market, token)));
  } catch (e) {
    console.error(`[${getTimestamp()}] 에러 발생:`, e);
  } finally {
    isRunning = false;
  }
}

function filterTargetMarkets(markets) {
  console.log(`[${getTimestamp()}] 마켓을 설정 값에 따라 필터링 합니다!`);
  let filteredMarkets = markets;

  if (USER.isTargetInclude24Price) {
    filteredMarkets = filteredMarkets.sort((a, b) => b.acc_trade_price_24h - a.acc_trade_price_24h);
  }
  if (USER.isTargetInclude24Volume) {
    filteredMarkets = filteredMarkets.sort((a, b) => b.acc_trade_volume_24h - a.acc_trade_volume_24h);
  }
  if (USER.isTargetIncludeChkClosingPrice) {
    filteredMarkets = filteredMarkets.filter((item) => item.trade_price > item.prev_closing_price);
  }

  console.log(`[${getTimestamp()}] 필터링된 마켓 수: ${filteredMarkets.length}`);
  console.log(`[${getTimestamp()}] 최대 마켓 사이즈: ${USER.targetMarketMaxSize}`);

  filteredMarkets = filteredMarkets.slice(0, USER.targetMarketMaxSize);

  console.log(`[${getTimestamp()}] 선택된 마켓 수: ${filteredMarkets.length}`);

  return filteredMarkets;
}

async function identifySurgingCoins(markets, token) {
  const surgingCoins = [];

  for (const market of markets) {
    console.log(`--------------------------------------------------------------------------------------------------------------------`);
    console.log(`[${getTimestamp()}] ${market.korean_name} 급등 코인 여부를 확인합니다.`);

    const candles = await UPBIT_SERVICE.getCandles(market.market, token, "minutes", 1, 200);
    const isSurging = await checkSurge(market, candles.data);

    if (isSurging) {
      surgingCoins.push(market);
      console.log(`[${getTimestamp()}] ${market.korean_name}은(는) 급등 코인으로 선정되었습니다.`);
      if (surgingCoins.length >= USER.surgingCoinsDepth) break;
    }
    // console.log(`--------------------------------------------------------------------------------------------------------------------`);

  }

  return surgingCoins;
}

async function checkSurge(market, candles) {
  const currentPrice = candles[0].trade_price;
  const { shortIncrease, midIncrease, longIncrease } = calculateIncreases(candles, currentPrice);

  const movingAverages = calculateMovingAverages(candles);
  const isTrendingUpward = movingAverages.shortMA > movingAverages.midMA && movingAverages.midMA > movingAverages.longMA;
  const isAboveMinimumIncreases = shortIncrease > USER.targetShortValue && midIncrease >= USER.targetMidValue && longIncrease >= USER.targetLongValue;

  console.log(`[${getTimestamp()}] ${market.korean_name} 상승률과 이동평균선 정보:`);
  console.log(`- 상승률: 단기 ${shortIncrease.toFixed(2)}%, 중기 ${midIncrease.toFixed(2)}%, 장기 ${longIncrease.toFixed(2)}%`);
  console.log(
    `- 이동평균선: 단기 ${movingAverages.shortMA.toFixed(2)}, 중기 ${movingAverages.midMA.toFixed(2)}, 장기 ${movingAverages.longMA.toFixed(2)}`
  );

  console.log("이동평균선 체크 -", isTrendingUpward);
  console.log("상승률 체크 -", isAboveMinimumIncreases);

  if (isTrendingUpward && isAboveMinimumIncreases) {
    console.log(`[${getTimestamp()}] ${market.korean_name}은(는) 급등 코인으로 판단됩니다.`);
    console.log(`- 이유: 상승 추세(단기 이동평균 > 중기 이동평균 > 장기 이동평균)이며, 최소 상승률을 모두 만족합니다.`);
    console.log(`  * 단기 상승률: ${shortIncrease.toFixed(2)}% (최소 ${USER.targetShortValue}% 이상)`);
    console.log(`  * 중기 상승률: ${midIncrease.toFixed(2)}% (최소 ${USER.targetMidValue}% 이상)`);
    console.log(`  * 장기 상승률: ${longIncrease.toFixed(2)}% (최소 ${USER.targetLongValue}% 이상)`);
  } else {
    console.log(`[${getTimestamp()}] ${market.korean_name}은(는) 급등 코인이 아닙니다.`);
    const reasons = [];
    if (!isTrendingUpward) {
      reasons.push("- 상승 추세가 아님 (단기 이동평균 <= 중기 이동평균 또는 중기 이동평균 <= 장기 이동평균)");
    }
    if (!isAboveMinimumIncreases) {
      reasons.push(`- 상승률이 설정한 최저값 미만입니다. (단기: ${shortIncrease.toFixed(2)}%, 중기: ${midIncrease.toFixed(2)}%, 장기: ${longIncrease.toFixed(2)}%)`);
    }

    console.log(`- 이유:`);
    console.log(reasons.join("\n"));
  }

  return isTrendingUpward && isAboveMinimumIncreases;
}
function calculateMovingAverages(candles) {
  const ma = {};

  if (USER.maType === "SMA") {
    ma.shortMA = calculateSMA(candles, USER.targetShort);
    ma.midMA = calculateSMA(candles, USER.targetMid);
    ma.longMA = calculateSMA(candles, USER.targetLong);
  } else {
    ma.shortMA = calculateEMA(candles, USER.targetShort);
    ma.midMA = calculateEMA(candles, USER.targetMid);
    ma.longMA = calculateEMA(candles, USER.targetLong);
  }

  return ma;
}

function calculateSMA(data, period) {
  if (data.length < period) return null;

  const sum = data.slice(0, period).reduce((acc, item) => acc + item.trade_price, 0);
  return sum / period;
}

function calculateEMA(data, period, smoothing = 2) {
  if (data.length < period) return null;

  let ema = calculateSMA(data, period);

  for (let i = period; i < data.length; i++) {
    ema = (data[i].trade_price - ema) * (smoothing / (1 + period)) + ema;
  }

  return ema;
}

function calculateIncreases(candles, currentPrice) {
  return {
    shortIncrease: calculateIncrease(candles[USER.targetShort].trade_price, currentPrice),
    midIncrease: calculateIncrease(candles[USER.targetMid].trade_price, currentPrice),
    longIncrease: calculateIncrease(candles[USER.targetLong].trade_price, currentPrice),
  };
}

function calculateIncrease(fromPrice, toPrice) {
  return ((toPrice - fromPrice) / fromPrice) * 100;
}

async function tradeCoin(market, token) {
  console.log(`[${getTimestamp()}] ${market.korean_name} 거래를 시작합니다.`);

  const orderbook = await UPBIT_SERVICE.getOrderBook(market.market, token);
  const volume = USER.invest / orderbook.data[0].orderbook_units[0].ask_price;
  const body = {
    market: market.market,
    side: "bid",
    volume: volume.toString(),
    price: orderbook.data[0].orderbook_units[0].ask_price.toString(),
    ord_type: "limit",
  };
  if (!USER.test_mode) {
    const userToken = await UPBIT_SERVICE.getUserToken(USER.access_key, USER.secret_key, body);
    const orderResult = await UPBIT_SERVICE.createOrder(body, userToken);
    console.log(`[${getTimestamp()}] ${market.korean_name} 매수 주문:`, orderResult);
  } else {
    console.log(`[${getTimestamp()}] 테스트 모드로 실제 매수 주문은 생략합니다.`);
  }

  if (!USER.only_buy) {
    await monitorAndSell(market, body.price, volume, token);
  }
}

async function monitorAndSell(market, buyPrice, volume, token) {
  return new Promise(async (resolve, reject) => {
    let count = 0;
    buyPrice = parseFloat(buyPrice);
    const sellPrice = buyPrice * (1 + USER.margin / 100);
    // const stopLossPrice = buyPrice * (1 - USER.stopLoss / 100);
    const intervalId = setInterval(async () => {
      if (count >= USER.sellLoopMaxCount) {
        clearInterval(intervalId);
        await sellCoin(market, volume, token);
        console.log(`[${getTimestamp()}] ${market.korean_name} - 목표 매도가 도달 실패, 매도 실행`);
        resolve();
      } else {
        const snapShot = await UPBIT_SERVICE.getTicker(market.market, token);
        const currentPrice = snapShot.data[0].trade_price;
        const priceIncrease = ((currentPrice - buyPrice) / buyPrice) * 100;

   console.log(`[${getTimestamp()}] ${market.korean_name}`);
   console.log(`현재가: ${currentPrice.toLocaleString()} / 매수가: ${buyPrice.toLocaleString()}`);
   console.log(
     `목표 매도가: ${sellPrice.toLocaleString()} / 손절: ${USER.stopLoss}% / 수익률: ${priceIncrease >= 0 ? "+" : ""}${priceIncrease.toFixed(2)}%`
   );
   console.log(`-`.repeat(80));

        if (currentPrice >= sellPrice) {
          console.log(`[${getTimestamp()}] ${market.korean_name} - 목표 매도가 도달, 매도 실행`);
          clearInterval(intervalId);
          await sellCoin(market, volume, token);
          resolve();
        } else if (priceIncrease <= USER.stopLoss) {
          console.log(`[${getTimestamp()}] ${market.korean_name} - 손절가 도달, 매도 실행`);
          clearInterval(intervalId);
          await sellCoin(market, volume, token);
          resolve();
        }
      }
      count += 1;
    }, USER.sellLoopIntervalSec * 1000);
  });
}


async function sellCoin(market, volume, token) {
  const orderbook = await UPBIT_SERVICE.getOrderBook(market.market, token);
  const body = {
    market: market.market,
    side: "ask",
    volume: volume.toString(),
    price: orderbook.data[0].orderbook_units[0].bid_price.toString(),
    ord_type: "limit",
  };

  if (!USER.test_mode) {
    const userToken = await UPBIT_SERVICE.getUserToken(USER.access_key, USER.secret_key, body);
    const orderResult = await UPBIT_SERVICE.createOrder(body, userToken);
    console.log(`[${getTimestamp()}] ${market.korean_name} 매도 주문:`, orderResult);
  } else {
    console.log(`[${getTimestamp()}] 테스트 모드로 실제 매도 주문은 생략합니다.`);
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
