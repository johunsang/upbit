const UPBIT_SERVICE = require("../service/upbit");
const AUTH_SERVICE = require("../service/auth");
const fs = require("fs");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

let isRunning = false;
let USER = {};
let chkMode = "상승";
let surgingCoins = [];

async function loadConfig() {
  try {
    USER = JSON.parse(fs.readFileSync("./config.json", "utf8"));

    if (validateConfig(USER)) {
      console.log(`[${getTimestamp()}] 설정 파일을 읽었습니다.`, USER);
    } else {
      console.log("설정 파일이 올바르지 않습니다.");
    }
  } catch (e) {
    console.error(e);
  }
}

async function init() {
  await loadConfig();
  // console.log(`[${getTimestamp()}] 설정 파일을 읽었습니다.`, USER);

  const login = await AUTH_SERVICE.login(USER.id, USER.password);
  if (!login.success) {
    console.log("로그인 실패");
    return;
  }

  console.log(`[${getTimestamp()}] 로그인 성공`);

  const mode = USER.test_mode ? "테스트 모드" : "실제 거래 모드";
  const buyMode = USER.only_buy ? "구매만 하는 모드" : "구매 및 판매 모드";
  const isTrendingUpward = USER.isTrendingUpward ? "상승 추세" : "하락 추세";

  chkMode = USER.isTrendingUpward ? "상승" : "하락";

  console.log(`[${getTimestamp()}] 현재 모드: ${mode}, ${buyMode}, ${isTrendingUpward}`);

  const answer = await question(`현재 모드는 ${mode}, ${buyMode}, ${isTrendingUpward} 입니다. 계속하시겠습니까? (Y/N) `);

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
    if (!markets) {
      console.log(`[${getTimestamp()}] 마켓 정보를 가져오지 못했습니다.`);
      throw new Error("마켓 정보를 가져오지 못했습니다.");
    }
    const marketsKRW = markets.filter((market) => market.market.indexOf("KRW") > -1);
    const marketParams = marketsKRW.map((market) => market.market).join(",");

    let myLovelyMarketsKRW = [];
    let targetMarketsKRW = [];

    if (USER.isLoveMyMarkets) {
      myLovelyMarketsKRW = USER.myLovelyMarkets.split(",");

      if (myLovelyMarketsKRW.length > 0) {
        for (let i = 0; i < myLovelyMarketsKRW.length; i++) {
          myLovelyMarketsKRW[i] = "KRW-" + myLovelyMarketsKRW[i];
        }
        targetMarketsKRW = markets.filter((market) => market.market.startsWith("KRW") && myLovelyMarketsKRW.includes(market.market));
        console.log(targetMarketsKRW);
        console.log(`[${getTimestamp()}] 내가 좋아하는 마켓 이름: ${targetMarketsKRW.map((item) => item.korean_name).join(", ")}`);
      }
    } else {
      const snapShot = await UPBIT_SERVICE.getTicker(marketParams, token);
      const targetMarkets = filterTargetMarkets(snapShot.data);
      const targetMarketCodes = targetMarkets.map((item) => item.market);
      targetMarketsKRW = markets.filter((market) => market.market.startsWith("KRW") && targetMarketCodes.includes(market.market));
      console.log(`[${getTimestamp()}] 필터링된 KRW 마켓 이름: ${targetMarketsKRW.map((item) => item.korean_name).join(", ")}`);
    }

    while (true) {
      const newSurgingCoins = await identifySurgingCoins(targetMarketsKRW, token);
      surgingCoins = [...surgingCoins, ...newSurgingCoins];
      surgingCoins = surgingCoins.slice(0, USER.surgingCoinsDepth);
      console.log(`[${getTimestamp()}] ${chkMode} 코인 확인 :`, surgingCoins.map((item) => item.korean_name).join(", "));

      await Promise.all(surgingCoins.map((market) => tradeCoin(market, token)));
      await delay(USER.sellLoopIntervalSec * 1000);
    }
  } catch (e) {
    console.error(`[${getTimestamp()}] 에러 발생: 프로그램 종료 필요!! `, e);
    return;
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
    console.log(`[${getTimestamp()}] ${market.korean_name}  ${chkMode} 코인 여부를 확인합니다.`);

    const candles = await UPBIT_SERVICE.getCandles(market.market, token, "minutes", 1, 200);

    if (candles.success === false || candles.data.length < 200) {
      console.log(
        `[${getTimestamp()}] ${
          market.korean_name
        }의 캔들 정보를 가져오지 못했습니다. 업비트에서 정보를 주지 않은 것입니다. 문의하지 마세요 스킵합니다`
      );
      continue;
    }

    await delay(300);
    const isSurging = await checkSurge(market, candles.data);

    if (isSurging) {
      surgingCoins.push(market);
      console.log(`[${getTimestamp()}] ${market.korean_name}은(는)  ${chkMode} 코인으로 선정되었습니다.`);
      if (surgingCoins.length >= USER.surgingCoinsDepth) break;
    }
    // console.log(`--------------------------------------------------------------------------------------------------------------------`);
  }

  return surgingCoins;
}

async function checkSurge(market, candles) {
  let currentPrice = 0;
  await delay(100);
  try {
    currentPrice = candles[0].trade_price;
  } catch (e) {
    console.error(e);
    console.log(`[${getTimestamp()}] ${market.korean_name}의 현재 가격을 가져오지 못했습니다.`);
    console.log(candles[0]);
    return;
  }

  const { shortIncrease, midIncrease, longIncrease } = calculateIncreases(candles, currentPrice);

  const movingAverages = calculateMovingAverages(candles);
  const isTrendingUpward = movingAverages.shortMA > movingAverages.midMA && movingAverages.midMA > movingAverages.longMA;
  const isTrendingDownward = movingAverages.shortMA < movingAverages.midMA && movingAverages.midMA < movingAverages.longMA;
  const isAboveMinimumIncreases = shortIncrease > USER.targetShortValue && midIncrease >= USER.targetMidValue && longIncrease >= USER.targetLongValue;
  const isBelowMinimumDecreases = shortIncrease < USER.targetShortValue && midIncrease <= USER.targetMidValue && longIncrease <= USER.targetLongValue;

  console.log(`[${getTimestamp()}] ${market.korean_name} 상승률과 이동평균선 정보:`);
  console.log(`- 상승률: 단기 ${shortIncrease.toFixed(2)}%, 중기 ${midIncrease.toFixed(2)}%, 장기 ${longIncrease.toFixed(2)}%`);
  console.log(
    `- 이동평균선: 단기 ${movingAverages.shortMA.toFixed(2)}, 중기 ${movingAverages.midMA.toFixed(2)}, 장기 ${movingAverages.longMA.toFixed(2)}`
  );

  console.log("상승 추세 체크 -", isTrendingUpward);
  console.log("하락 추세 체크 -", isTrendingDownward);
  console.log("상승률 체크 -", isAboveMinimumIncreases);
  console.log("하락률 체크 -", isBelowMinimumDecreases);

  if (USER.isTrendingUpward) {
    if (isTrendingUpward && isAboveMinimumIncreases) {
      console.log(`[${getTimestamp()}] ${market.korean_name}은(는) 상승 코인으로 판단됩니다.`);
      console.log(`- 이유: 상승 추세(단기 이동평균 > 중기 이동평균 > 장기 이동평균)이며, 최소 상승률을 모두 만족합니다.`);
      console.log(`  * 단기 상승률: ${shortIncrease.toFixed(2)}% (최소 ${USER.targetShortValue}% 이상)`);
      console.log(`  * 중기 상승률: ${midIncrease.toFixed(2)}% (최소 ${USER.targetMidValue}% 이상)`);
      console.log(`  * 장기 상승률: ${longIncrease.toFixed(2)}% (최소 ${USER.targetLongValue}% 이상)`);
      return true;
    } else {
      console.log(`[${getTimestamp()}] ${market.korean_name}은(는)  ${chkMode} 코인이 아닙니다.`);
      const reasons = [];
      if (!isTrendingUpward) {
        reasons.push("- 상승 추세가 아님");
      }
      if (!isAboveMinimumIncreases) {
        reasons.push(
          `- 상승률이 설정한 최저값 미만입니다. (단기: ${shortIncrease.toFixed(2)}%, 중기: ${midIncrease.toFixed(2)}%, 장기: ${longIncrease.toFixed(
            2
          )}%)`
        );
      }
      console.log(`- 이유:`);
      console.log(reasons.join("\n"));
      return false;
    }
  } else {
    if (isTrendingDownward && isBelowMinimumDecreases) {
      console.log(`[${getTimestamp()}] ${market.korean_name}은(는) 하락 코인으로 판단됩니다.`);
      console.log(`- 이유: 하락 추세(단기 이동평균 < 중기 이동평균 < 장기 이동평균)이며, 최소 하락률을 모두 만족합니다.`);
      console.log(`  * 단기 하락률: ${shortIncrease.toFixed(2)}% (최소 ${USER.targetShortValue}% 이하)`);
      console.log(`  * 중기 하락률: ${midIncrease.toFixed(2)}% (최소 ${USER.targetMidValue}% 이하)`);
      console.log(`  * 장기 하락률: ${longIncrease.toFixed(2)}% (최소 ${USER.targetLongValue}% 이하)`);
      return true;
    } else {
      console.log(`[${getTimestamp()}] ${market.korean_name}은(는) 하락 코인이 아닙니다.`);
      const reasons = [];
      if (!isTrendingDownward) {
        reasons.push("- 하락 추세가 아님");
      }
      if (!isBelowMinimumDecreases) {
        reasons.push(
          `- 하락률이 설정한 최저값 미만입니다. (단기: ${shortIncrease.toFixed(2)}%, 중기: ${midIncrease.toFixed(2)}%, 장기: ${longIncrease.toFixed(
            2
          )}%)`
        );
      }
      console.log(`- 이유:`);
      console.log(reasons.join("\n"));
      return false;
    }
  }
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

  // 거래 완료 후 surgingCoins 배열에서 제거
  surgingCoins = surgingCoins.filter((coin) => coin.market !== market.market);
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
          `목표 매도가: ${sellPrice.toLocaleString()} / 손절: ${USER.stopLoss}% / 수익률: ${priceIncrease >= 0 ? "+" : ""}${priceIncrease.toFixed(
            2
          )}%`
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

function validateConfig(config) {
  try {
    // 필수 속성 검사
    const requiredProperties = [
      "id",
      "password",
      "access_key",
      "secret_key",
      "test_mode",
      "only_buy",
      "invest",
      "margin",
      "stopLoss",
      "isTargetInclude24Price",
      "isTargetInclude24Volume",
      "isTargetIncludeChkClosingPrice",
      "targetMarketMaxSize",
      "targetShort",
      "targetShortValue",
      "targetMid",
      "targetMidValue",
      "targetLong",
      "targetLongValue",
      "maType",
      "sellLoopMaxCount",
      "sellLoopIntervalSec",
      "surgingCoinsDepth",
    ];

    for (const property of requiredProperties) {
      if (!config.hasOwnProperty(property)) {
        console.error(`Error: Missing required property '${property}'`);
        return false;
      }
    }

    // 속성 값 검사
    if (typeof config.id !== "string" || config.id.trim() === "") {
      console.error("Error: 'id' must be a non-empty string");
      return false;
    }

    if (typeof config.password !== "string" || config.password.trim() === "") {
      console.error("Error: 'password' must be a non-empty string");
      return false;
    }

    if (typeof config.access_key !== "string" || config.access_key.trim() === "") {
      console.error("Error: 'access_key' must be a non-empty string");
      return false;
    }

    if (typeof config.secret_key !== "string" || config.secret_key.trim() === "") {
      console.error("Error: 'secret_key' must be a non-empty string");
      return false;
    }

    if (typeof config.test_mode !== "boolean") {
      console.error("Error: 'test_mode' must be a boolean");
      return false;
    }

    if (typeof config.only_buy !== "boolean") {
      console.error("Error: 'only_buy' must be a boolean");
      return false;
    }

    if (typeof config.invest !== "number" || config.invest <= 0) {
      console.error("Error: 'invest' must be a positive number");
      return false;
    }

    if (typeof config.margin !== "number" || config.margin <= 0) {
      console.error("Error: 'margin' must be a positive number");
      return false;
    }

    if (typeof config.stopLoss !== "number") {
      console.error("Error: 'stopLoss' must be a number");
      return false;
    }

    if (typeof config.isTargetInclude24Price !== "boolean") {
      console.error("Error: 'isTargetInclude24Price' must be a boolean");
      return false;
    }

    if (typeof config.isTargetInclude24Volume !== "boolean") {
      console.error("Error: 'isTargetInclude24Volume' must be a boolean");
      return false;
    }

    if (typeof config.isTargetIncludeChkClosingPrice !== "boolean") {
      console.error("Error: 'isTargetIncludeChkClosingPrice' must be a boolean");
      return false;
    }

    if (typeof config.targetMarketMaxSize !== "number" || config.targetMarketMaxSize <= 0) {
      console.error("Error: 'targetMarketMaxSize' must be a positive number");
      return false;
    }

    if (typeof config.targetShort !== "number" || config.targetShort <= 0) {
      console.error("Error: 'targetShort' must be a positive number");
      return false;
    }

    if (typeof config.targetShortValue !== "number" || config.targetShortValue <= 0) {
      console.error("Error: 'targetShortValue' must be a positive number");
      return false;
    }

    if (typeof config.targetMid !== "number" || config.targetMid <= 0) {
      console.error("Error: 'targetMid' must be a positive number");
      return false;
    }

    if (typeof config.targetMidValue !== "number" || config.targetMidValue <= 0) {
      console.error("Error: 'targetMidValue' must be a positive number");
      return false;
    }

    if (typeof config.targetLong !== "number" || config.targetLong <= 0) {
      console.error("Error: 'targetLong' must be a positive number");
      return false;
    }

    if (typeof config.targetLongValue !== "number" || config.targetLongValue <= 0) {
      console.error("Error: 'targetLongValue' must be a positive number");
      return false;
    }

    if (typeof config.maType !== "string" || (config.maType !== "SMA" && config.maType !== "EWMA")) {
      console.error("Error: 'maType' must be either 'SMA' or 'EWMA'");
      return false;
    }

    if (typeof config.sellLoopMaxCount !== "number" || config.sellLoopMaxCount <= 0) {
      console.error("Error: 'sellLoopMaxCount' must be a positive number");
      return false;
    }

    if (typeof config.sellLoopIntervalSec !== "number" || config.sellLoopIntervalSec <= 0) {
      console.error("Error: 'sellLoopIntervalSec' must be a positive number");
      return false;
    }

    if (typeof config.surgingCoinsDepth !== "number" || config.surgingCoinsDepth <= 0) {
      console.error("Error: 'surgingCoinsDepth' must be a positive number");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error: Invalid JSON format");
    return false;
  }
}

init();
