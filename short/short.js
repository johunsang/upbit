const UPBIT_SERVICE = require("../service/upbit");
const ti = require("technicalindicators");
const fs = require("fs");
const path = require('path');

let isRunning = false;
let USER = {};
let chkMode = "상승";
let purchaseLog = {};

async function loadConfig() {
  try {
    const args = process.argv.slice(2);
    let configPath = "./config.json";

    if (args[0]) {
      configPath = "./" + args[0];
    }

    USER = JSON.parse(fs.readFileSync(configPath, "utf8"));

    console.log(`[${getTimestamp()}] 설정 파일을 읽었습니다.`, USER);
  } catch (e) {
    console.error(e);
  }
}

async function init() {
  await loadConfig();
  initPurchaseLog(); // 구매 로그 초기화 추가
  const mode = USER.test_mode ? "테스트 모드" : "실제 거래 모드";
  const isLoveMyMarkets = USER.isLoveMyMarkets ? "응.. 내가 좋아하는 코인만" : "아니오.전체 코인";
  const isProfitAgoMarkets = USER.isProfitAgoMarkets ? "응.. 이전 수익 코인만" : "아니오. 전체 코인";
  const isTrendingUpward = USER.isTrendingUpward ? "상승 추세" : "하락 추세";

  chkMode = USER.isTrendingUpward ? "상승" : "하락";

  console.log(
    `[${getTimestamp()}] 현재 모드: ${mode}, 추세는? ${isTrendingUpward}, 특정코인만 ? ${isLoveMyMarkets}, 특정시점이점코인만? ${isProfitAgoMarkets}`
  );

  if (USER.isProfitAgoMarkets && USER.isLoveMyMarkets) {
    console.log("내가 좋아하는 코인만, 수익 코인만 둘 다 설정할 수 없습니다. 하나만 설정해주세요.");
    return;
  }
  if (USER.isProfitAgoMarkets && !USER.isTrendingUpward) {
    console.log("이전 수익 코인만 설정하면 추세는 상승으로 설정해야 합니다.");
    return;
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
    let surgingCoins = [];

    const token = await UPBIT_SERVICE.getToken(USER.access_key, USER.secret_key);

    let markets = (await UPBIT_SERVICE.getMarketAll(token)).data;
    if (!markets) {
      console.log(`[${getTimestamp()}] 마켓 정보를 가져오지 못했습니다.`);
      throw new Error("마켓 정보를 가져오지 못했습니다.");
    }
    // Parse the exclude_markets string into an array of full market codes
    const excludeMarkets = USER.exclude_markets
      ? USER.exclude_markets.split(",").map((m) => `KRW-${m.trim().toUpperCase()}`)
      : [];

    // Log the list of excluded markets
    console.log(`[${getTimestamp()}] 제외된 마켓 이름: ${excludeMarkets.join(", ")}`);

    // Filter out the excluded markets from the markets list
    if (excludeMarkets.length > 0) {
      markets = markets.filter((market) => !excludeMarkets.includes(market.market));
      // console.log(`[${getTimestamp()}] 제외 후 남은 마켓: ${markets.map(m => m.market).join(", ")}`);
    }

    const marketsKRW = markets.filter((market) => market.market.indexOf("KRW") > -1);
    const marketParams = marketsKRW.map((market) => market.market).join(",");

    if (USER.isTargetMarketsIsRising) {
      const tickerResult = await UPBIT_SERVICE.getTicker(marketParams, token);
      if (!tickerResult.success) {
        console.log(`[${getTimestamp()}] 티커 정보를 가져오지 못했습니다.`);
        throw new Error("티커 정보를 가져오지 못했습니다.");
      }

      const tickers = tickerResult.data;
      const aboveClosingPriceCount = tickers.filter((ticker) => ticker.trade_price > ticker.prev_closing_price).length;
      console.log(`[${getTimestamp()}] 전체 마켓 중 ${aboveClosingPriceCount}개가 상승했습니다.`);
      const aboveClosingPriceRatio = (aboveClosingPriceCount / tickers.length) * 100;
      console.log(`[${getTimestamp()}] 전체 마켓 중 ${aboveClosingPriceRatio.toFixed(2)}%가 상승했습니다.`);

      if (aboveClosingPriceRatio < USER.isTargetMarketsIsRisingRatio) {
        console.log(`[${getTimestamp()}] 전체 마켓 중 ${aboveClosingPriceRatio.toFixed(2)}%만 상승했습니다. 프로그램을 종료합니다.`);
        isRunning = false;
        return;
      } else {
        console.log(`[${getTimestamp()}] 전체 마켓 중 ${aboveClosingPriceRatio.toFixed(2)}%가 상승했습니다.`);
      }
    }

    if (USER.isTargetBitcoinIsRising) {
      const bitcoinMarket = "KRW-BTC";
      const bitcoinTicker = await UPBIT_SERVICE.getTicker(bitcoinMarket, token);

      if (bitcoinTicker.success && bitcoinTicker.data.length === 1) {
        const currentPrice = bitcoinTicker.data[0].trade_price;
        const prevPrice = bitcoinTicker.data[0].prev_closing_price;
        const priceChangeRate = bitcoinTicker.data[0].signed_change_rate;

        console.log(
          `[${getTimestamp()}] 비트코인 현재가: ${currentPrice.toLocaleString()}, 24시간 전 가격: ${prevPrice.toLocaleString()}, 변화율: ${(
            priceChangeRate * 100
          ).toFixed(2)}%`
        );

        if (priceChangeRate <= 0) {
          console.log(`[${getTimestamp()}] 비트코인이 24시간 전 대비 상승하지 않았으므로 프로그램을 종료합니다.`);
          isRunning = false;
          return;
        }
      } else {
        console.log(`[${getTimestamp()}] 비트코인 티커 정보를 가져오지 못했습니다. 프로그램을 종료합니다.`);
        isRunning = false;
        return;
      }
    }

    let myLovelyMarketsKRW = [];
    let targetMarketsKRW = [];

    if (USER.isLoveMyMarkets) {
      myLovelyMarketsKRW = USER.myLovelyMarkets.split(",");

      if (myLovelyMarketsKRW.length > 0) {
        for (let i = 0; i < myLovelyMarketsKRW.length; i++) {
          myLovelyMarketsKRW[i] = "KRW-" + myLovelyMarketsKRW[i];
        }
        targetMarketsKRW = markets.filter((market) => market.market.startsWith("KRW") && myLovelyMarketsKRW.includes(market.market));
        console.log(`[${getTimestamp()}] 내가 좋아하는 마켓 이름: ${targetMarketsKRW.map((item) => item.korean_name).join(", ")}`);
      }
    } else if (USER.isProfitAgoMarkets) {
      // 이전 수익 코인만 선택하는 로직 구현
      console.log(`[${getTimestamp()}] 이전 수익 코인만 선택하는 기능을 실행합니다.`);

      const profitAgoMarketsMin = USER.profitAgoMarketsMin || 60; // 기본값 60분 전
      const profitAgoMarketsLength = USER.profitAgoMarketsLength || 5; // 기본값 상위 5개 코인 선택

      const candlesPromises = marketsKRW.map((market) =>
        UPBIT_SERVICE.getCandles(market.market, token, "minutes", 60, profitAgoMarketsMin + 1)
      );
      const candlesResults = await Promise.all(candlesPromises);

      const profitableMarkets = candlesResults
        .map((result, index) => {
          if (result.success && result.data.length > profitAgoMarketsMin) {
            const currentPrice = result.data[0].trade_price;
            const prevPrice = result.data[profitAgoMarketsMin].trade_price;
            const increase = ((currentPrice - prevPrice) / prevPrice) * 100;
            return { market: marketsKRW[index], increase };
          }
          return null;
        })
        .filter((item) => item !== null);

      const topProfitableMarkets = profitableMarkets
        .sort((a, b) => b.increase - a.increase)
        .slice(0, profitAgoMarketsLength)
        .map((item) => item.market);

      await delay(1000);
      let ranking = 1;

      for (const market of topProfitableMarkets) {
        await delay(1000);
        const candleData = await UPBIT_SERVICE.getCandles(market.market, token, "minutes", 60, profitAgoMarketsMin + 1);

        if (candleData.success) {
          const currentPrice = candleData.data[0].trade_price;
          const prevPrice = candleData.data[profitAgoMarketsMin].trade_price;
          const increase = ((currentPrice - prevPrice) / prevPrice) * 100;
          console.log(
            `[${getTimestamp()}] ${ranking}위 ${market.korean_name} - ${profitAgoMarketsMin}분 전 가격: ${prevPrice.toLocaleString()}, 현재 가격: ${currentPrice.toLocaleString()}, 상승률: ${increase.toFixed(2)}%`
          );
          ranking += 1;
        }
      }

      targetMarketsKRW = topProfitableMarkets;
    } else {
      await delay(1000);
      const snapShot = await UPBIT_SERVICE.getTicker(marketParams, token);
      const targetMarkets = filterTargetMarkets(snapShot.data);
      const targetMarketCodes = targetMarkets.map((item) => item.market);
      targetMarketsKRW = markets.filter((market) => market.market.startsWith("KRW") && targetMarketCodes.includes(market.market));
      console.log(`[${getTimestamp()}] 필터링된 KRW 마켓 이름: ${targetMarketsKRW.map((item) => item.korean_name).join(", ")}`);
    }

    await identifySurgingCoins(targetMarketsKRW, token);
  } catch (e) {
    console.error(`[${getTimestamp()}] 에러 발생: 프로그램 종료 필요!! `, e);
    isRunning = false;
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
  for (const market of markets) {
    console.log(`--------------------------------------------------------------------------------------------------------------------`);
    console.log(`[${getTimestamp()}] ${market.korean_name} ${chkMode} 코인 여부를 확인합니다.`);

    // 캔들 데이터의 시간 단위 (분 단위)
    const candleTimeUnit = USER.candleUnit;

    // 최근 N분 동안의 캔들 개수 계산
    const trendCheckCandleCount = Math.ceil(USER.trendCheckMinutes / candleTimeUnit);

    // 필요한 캔들 수 계산
    const requiredCandleCount = Math.max(200, trendCheckCandleCount);

    const candles = await UPBIT_SERVICE.getCandles(market.market, token, "minutes", USER.candleUnit, requiredCandleCount);

    if (candles.success === false || candles.data.length < requiredCandleCount) {
      console.log(
        `[${getTimestamp()}] ${market.korean_name}의 캔들 정보를 가져오지 못했습니다. 업비트에서 정보를 주지 않은 것입니다. 스킵합니다.`
      );
      continue;
    }

    await delay(10);
    const isSurging = await checkSurge(market, candles.data);
    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++", isSurging);

    if (isSurging) {
      console.log(`[${getTimestamp()}] ${market.korean_name}은(는) ${chkMode} 코인으로 선정되었습니다.`);
      await tradeCoin(market, token);
    }
  }
}

async function loadPurchaseLog() {
  try {
    if (fs.existsSync(USER.purchaseLogFile)) {
      const logData = fs.readFileSync(USER.purchaseLogFile, 'utf8');
      return JSON.parse(logData);
    }
  } catch (error) {
    console.error(`[${getTimestamp()}] 구매 로그 파일을 읽는 중 오류가 발생했습니다:`, error);
  }
  return {};
}

function canPurchaseToday(purchaseLog) {
  if (!USER.enableDailyPurchaseLimit) return true;

  const today = new Date().toISOString().split('T')[0];
  const todayPurchases = purchaseLog[today] || 0;
  return todayPurchases < USER.dailyPurchaseLimit;
}

function getLogFilePath(date) {
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return path.join(logDir, `purchase_log_${date}.json`);
}

function readDailyLog(date) {
  const filePath = getLogFilePath(date);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.error(`[${getTimestamp()}] 로그 파일 읽기 오류 (${date}):`, error);
    }
  }
  return [];
}

function writeDailyLog(date, logs) {
  const filePath = getLogFilePath(date);
  try {
    fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), 'utf8');
    console.log(`[${getTimestamp()}] 로그 파일 업데이트 완료 (${date})`);
  } catch (error) {
    console.error(`[${getTimestamp()}] 로그 파일 쓰기 오류 (${date}):`, error);
  }
}

function updatePurchaseLog(market, orderDetails) {
  const today = new Date().toISOString().split('T')[0];
  const logs = readDailyLog(today);

  logs.push({
    timestamp: new Date().toISOString(),
    market: market,
    orderDetails: orderDetails
  });

  writeDailyLog(today, logs);

  console.log(`[${getTimestamp()}] ${market} 구매 기록 추가됨. 오늘의 총 거래 수: ${logs.length}`);
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
    return false;
  }

  // 캔들 데이터의 시간 단위 (분 단위)
  const candleTimeUnit = USER.candleUnit;

  // 최근 N분 동안의 캔들 개수 계산
  const trendCheckCandleCount = Math.ceil(USER.trendCheckMinutes / candleTimeUnit);

  // 최근 N분 동안의 캔들 데이터 추출
  const trendCheckCandles = candles.slice(0, trendCheckCandleCount);

  // 선형 회귀를 사용하여 추세의 기울기 계산
  const trendSlope = calculateTrendSlope(trendCheckCandles);

  // 기울기가 양수이면 상승 추세로 판단
  const isUpwardTrend = trendSlope > 0;

  if (isUpwardTrend) {
    console.log(`[${getTimestamp()}] ${market.korean_name}은(는) 최근 ${USER.trendCheckMinutes}분 동안 지속적으로 상승 중입니다.`);
  } else {
    console.log(`[${getTimestamp()}] ${market.korean_name}은(는) 최근 ${USER.trendCheckMinutes}분 동안 상승 추세가 아닙니다.`);
  }

  const { shortIncrease, midIncrease, longIncrease } = calculateIncreases(candles, currentPrice);

  const movingAverages = calculateMovingAverages(candles);

  let upperBand, lowerBand, middleBand, psar;
  let isBullishTrend = false;
  let isBearishTrend = false;
  let isPsarBullish = false;
  let isPsarBearish = false;
  let isBandWidthContracting = false;
  let isBandWidthExpanding = false;
  let isAboveMiddleBand = false;
  let isBelowMiddleBand = false;

  const closes = candles.map((candle) => candle.trade_price).reverse();

  // RSI 계산 추가
  let currentRSI = null;
  let isRSIBullish = false;
  let isRSIBearish = false;

  if (USER.useRSI) {
    const rsiInput = {
      values: closes,
      period: USER.rsiPeriod || 14, // 설정 파일에서 기간을 지정하거나 기본값 14 사용
    };
    const rsiValues = ti.RSI.calculate(rsiInput);
    currentRSI = rsiValues[rsiValues.length - 1];

    console.log(`- RSI 값: ${currentRSI.toFixed(2)}`);

    // RSI 신호 판단
    if (currentRSI < USER.rsiBuyThreshold) {
      isRSIBullish = true; // 과매도 상태로 매수 신호
    } else if (currentRSI > USER.rsiSellThreshold) {
      isRSIBearish = true; // 과매수 상태로 매도 신호
    }
  }

  if (USER.useBollinger) {
    const bollingerInput = {
      period: USER.bollingerPeriod,
      stdDev: USER.bollingerStdDev,
      values: closes,
    };

    const bbResult = ti.BollingerBands.calculate(bollingerInput);
    const currentBB = bbResult[bbResult.length - 1];
    const prevBB = bbResult[bbResult.length - 2];

    upperBand = currentBB.upper;
    lowerBand = currentBB.lower;
    middleBand = currentBB.middle;

    isAboveMiddleBand = currentPrice > middleBand;
    isBelowMiddleBand = currentPrice < middleBand;

    const currentBandWidth = upperBand - lowerBand;
    const prevBandWidth = prevBB.upper - prevBB.lower;
    isBandWidthExpanding = currentBandWidth > prevBandWidth;
    isBandWidthContracting = currentBandWidth < prevBandWidth;

    // 상승 추세 판단
    isBullishTrend = isAboveMiddleBand && isBandWidthExpanding;

    // 하락 추세 판단
    isBearishTrend = isBelowMiddleBand && isBandWidthExpanding;
  }

  if (USER.usePSAR) {
    const high = candles.map((candle) => candle.high_price).reverse();
    const low = candles.map((candle) => candle.low_price).reverse();
    const psarInput = {
      step: USER.psarStep,
      max: USER.psarMaxStep,
      high: high,
      low: low,
    };

    const psarResult = ti.PSAR.calculate(psarInput);
    psar = psarResult[psarResult.length - 1];
    isPsarBullish = psar < currentPrice;
    isPsarBearish = psar > currentPrice;
  }

  const isAboveMinimumIncreases =
    !USER.useMinimumIncreases ||
    (shortIncrease > USER.targetShortValue && midIncrease >= USER.targetMidValue && longIncrease >= USER.targetLongValue);
  const isBelowMinimumDecreases =
    !USER.useMinimumIncreases ||
    (shortIncrease < USER.targetShortValue && midIncrease <= USER.targetMidValue && longIncrease <= USER.targetLongValue);

  const isTrendingUpward =
    !USER.useTrendingMA || (movingAverages.shortMA > movingAverages.midMA && movingAverages.midMA > movingAverages.longMA);
  const isTrendingDownward =
    !USER.useTrendingMA || (movingAverages.shortMA < movingAverages.midMA && movingAverages.midMA < movingAverages.longMA);

  console.log(`[${getTimestamp()}] ${market.korean_name} 상승률과 이동평균선 정보:`);
  console.log(`- 상승률: 단기 ${shortIncrease.toFixed(2)}%, 중기 ${midIncrease.toFixed(2)}%, 장기 ${longIncrease.toFixed(2)}%`);
  console.log(
    `- 이동평균선: 단기 ${movingAverages.shortMA.toFixed(2)}, 중기 ${movingAverages.midMA.toFixed(2)}, 장기 ${movingAverages.longMA.toFixed(2)}`
  );

  console.log(`[${getTimestamp()}] ${market.korean_name} 볼린저밴드와 PSAR 정보:`);
  if (USER.useBollinger) {
    console.log(
      `- 현재가: ${currentPrice.toFixed(2)}, 볼린저밴드 상단: ${upperBand.toFixed(2)}, 하단: ${lowerBand.toFixed(2)}, 중간: ${middleBand.toFixed(2)}`
    );
    console.log(`- 볼린저밴드 상승(매수시그널): ${isBullishTrend}, 하락(매도시그널): ${isBearishTrend}`);
    console.log(`- 볼린저밴드 폭 확대: ${isBandWidthExpanding}, 축소: ${isBandWidthContracting}`);
  }
  if (USER.usePSAR) {
    console.log(`- 현재가: ${currentPrice.toFixed(2)}, PSAR: ${psar.toFixed(2)}`);
    console.log(`- PSAR 상향(매수시그널): ${isPsarBullish}, 하향(매도시그널): ${isPsarBearish}`);
  }

  if (USER.isTrendingUpward) {
    const conditions = [];
    if (USER.useMinimumIncreases && isAboveMinimumIncreases) conditions.push("최소 상승률 만족");
    if (USER.useTrendingMA && isTrendingUpward) conditions.push("이동평균선 상승 추세");
    if (USER.useBollinger && isBullishTrend) conditions.push("볼린저밴드 상승 추세");
    if (USER.usePSAR && isPsarBullish) conditions.push("PSAR 상향");
    if (USER.checkRecentUpwardTrend && isUpwardTrend) conditions.push("최근 가격 상승 추세");
    if (USER.useRSI && isRSIBullish) conditions.push("RSI 매수 신호");

    const usedConditions = [
      USER.useMinimumIncreases,
      USER.useTrendingMA,
      USER.useBollinger,
      USER.usePSAR,
      USER.checkRecentUpwardTrend,
      USER.useRSI,
    ];
    const satisfiedConditions = [
      isAboveMinimumIncreases,
      isTrendingUpward,
      isBullishTrend,
      isPsarBullish,
      isUpwardTrend,
      isRSIBullish,
    ];

    if (usedConditions.every((cond, idx) => !cond || satisfiedConditions[idx])) {
      console.log(`[${getTimestamp()}] ${market.korean_name}은(는) 상승 코인으로 판단됩니다.`);
      console.log(`- 이유: ${conditions.join(", ")}`);
      return true;
    } else {
      console.log(`[${getTimestamp()}] ${market.korean_name}은(는) 상승 코인이 아닙니다.`);
      const reasons = [];
      if (USER.useMinimumIncreases && !isAboveMinimumIncreases) reasons.push("최소 상승률 미만");
      if (USER.useTrendingMA && !isTrendingUpward) reasons.push("이동평균선 상승 추세가 아님");
      if (USER.useBollinger && !isBullishTrend) reasons.push("볼린저밴드 상승 추세가 아님");
      if (USER.usePSAR && !isPsarBullish) reasons.push("PSAR 상향이 아님");
      if (USER.checkRecentUpwardTrend && !isUpwardTrend) reasons.push("최근 가격 상승 추세가 아님");
      if (USER.useRSI && !isRSIBullish) reasons.push("RSI 매수 신호 아님");
      console.log(`- 이유: ${reasons.join(", ")}`);
      return false;
    }
  } else {
    const conditions = [];
    if (USER.useMinimumIncreases && isBelowMinimumDecreases) conditions.push("최소 하락률 만족");
    if (USER.useTrendingMA && isTrendingDownward) conditions.push("이동평균선 하락 추세");
    if (USER.useBollinger && isBearishTrend) conditions.push("볼린저밴드 하락 추세");
    if (USER.usePSAR && isPsarBearish) conditions.push("PSAR 하향");
    if (USER.checkRecentUpwardTrend && !isUpwardTrend) conditions.push("최근 가격 하락 추세");
    if (USER.useRSI && isRSIBearish) conditions.push("RSI 매도 신호");

    const usedConditions = [
      USER.useMinimumIncreases,
      USER.useTrendingMA,
      USER.useBollinger,
      USER.usePSAR,
      USER.checkRecentUpwardTrend,
      USER.useRSI,
    ];
    const satisfiedConditions = [
      isBelowMinimumDecreases,
      isTrendingDownward,
      isBearishTrend,
      isPsarBearish,
      !isUpwardTrend,
      isRSIBearish,
    ];

    if (usedConditions.every((cond, idx) => !cond || satisfiedConditions[idx])) {
      console.log(`[${getTimestamp()}] ${market.korean_name}은(는) 하락 코인으로 판단됩니다.`);
      console.log(`- 이유: ${conditions.join(", ")}`);
      return true;
    } else {
      console.log(`[${getTimestamp()}] ${market.korean_name}은(는) 하락 코인이 아닙니다.`);
      const reasons = [];
      if (USER.useMinimumIncreases && !isBelowMinimumDecreases) reasons.push("최소 하락률 미만");
      if (USER.useTrendingMA && !isTrendingDownward) reasons.push("이동평균선 하락 추세가 아님");
      if (USER.useBollinger && !isBearishTrend) reasons.push("볼린저밴드 하락 추세가 아님");
      if (USER.usePSAR && !isPsarBearish) reasons.push("PSAR 하향이 아님");
      if (USER.checkRecentUpwardTrend && isUpwardTrend) reasons.push("최근 가격 하락 추세가 아님");
      if (USER.useRSI && !isRSIBearish) reasons.push("RSI 매도 신호 아님");
      console.log(`- 이유: ${reasons.join(", ")}`);
      return false;
    }
  }
}

function calculateTrendSlope(candles) {
  const n = candles.length;
  const xValues = [];
  const yValues = [];

  for (let i = 0; i < n; i++) {
    xValues.push(i);
    yValues.push(candles[n - 1 - i].trade_price); // 시간 순서대로 정렬 (과거 -> 현재)
  }

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = n * sumX2 - sumX * sumX;

  if (denominator === 0) {
    console.log(`[${getTimestamp()}] 분모가 0이므로 기울기를 계산할 수 없습니다.`);
    return null;
  }

  const slope = numerator / denominator;

  return slope;
}

function calculateMovingAverages(candles) {
  const ma = {};

  const closes = candles.map((candle) => candle.trade_price).reverse();

  if (USER.maType === "SMA" || USER.maType === "CMA") {
    ma.shortMA = calculateSMA(closes, USER.targetShort);
    ma.midMA = calculateSMA(closes, USER.targetMid);
    ma.longMA = calculateSMA(closes, USER.targetLong);
  } else {
    ma.shortMA = calculateEMA(closes, USER.targetShort);
    ma.midMA = calculateEMA(closes, USER.targetMid);
    ma.longMA = calculateEMA(closes, USER.targetLong);
  }

  return ma;
}

function calculateSMA(data, period) {
  if (data.length < period) return null;

  const sum = data.slice(-period).reduce((acc, value) => acc + value, 0);
  return sum / period;
}

function calculateEMA(data, period, smoothingFactor = 2) {
  if (data.length < period) return null;

  let ema = calculateSMA(data.slice(0, period), period);

  const multiplier = smoothingFactor / (period + 1);

  for (let i = period; i < data.length; i++) {
    ema = data[i] * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

function calculateIncreases(candles, currentPrice) {
  if (candles.length < USER.targetLong) {
    console.log(`[${getTimestamp()}] 캔들 정보가 부족합니다. 충분한 캔들을 가져오지 못했습니다.`);
    return {
      shortIncrease: 0,
      midIncrease: 0,
      longIncrease: 0,
    };
  }
  return {
    shortIncrease: calculateIncrease(candles[USER.targetShort].trade_price, currentPrice),
    midIncrease: calculateIncrease(candles[USER.targetMid].trade_price, currentPrice),
    longIncrease: calculateIncrease(candles[USER.targetLong].trade_price, currentPrice),
  };
}

function calculateIncrease(fromPrice, toPrice) {
  return ((toPrice - fromPrice) / fromPrice) * 100;
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



function initPurchaseLog() {
  const logFilePath = path.resolve(__dirname, USER.purchaseLogFile);
  console.log(`[${getTimestamp()}] 로그 파일 경로: ${logFilePath}`);

  try {
    // 디렉토리가 존재하지 않으면 생성
    const dir = path.dirname(logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[${getTimestamp()}] 디렉토리를 생성했습니다: ${dir}`);
    }

    if (fs.existsSync(logFilePath)) {
      const data = fs.readFileSync(logFilePath, 'utf8');
      purchaseLog = JSON.parse(data);
      console.log(`[${getTimestamp()}] 기존 구매 로그를 불러왔습니다.`);
    } else {
      purchaseLog = {};
      console.log(`[${getTimestamp()}] 새로운 구매 로그를 시작합니다.`);
    }
  } catch (error) {
    console.error(`[${getTimestamp()}] 구매 로그 초기화 중 오류 발생:`, error);
    purchaseLog = {};
  }
}


async function tradeCoin(market, token) {
  console.log(`[${getTimestamp()}] ${market.korean_name} 거래를 시작합니다.`);


  const today = new Date().toISOString().split('T')[0];
  const logs = readDailyLog(today);

  if (USER.enableDailyPurchaseLimit && logs.length >= USER.dailyPurchaseLimit) {
    console.log(`[${getTimestamp()}] 일일 구매 한도에 도달했습니다. 거래를 중단합니다.`);
    return;
  }


  const orderbook = await UPBIT_SERVICE.getOrderBook(market.market, token);
  const volume = USER.invest / orderbook.data[0].orderbook_units[0].ask_price;
  // console.log( orderbook.data[0].orderbook_units);
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
    if (orderResult.success) {
      updatePurchaseLog(market.market);
    }
  } else {
    console.log(`[${getTimestamp()}] 테스트 모드로 실제 매수 주문은 생략합니다.`);
    updatePurchaseLog(market.market);

  }
}

init();
