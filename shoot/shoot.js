const UPBIT_SERVICE = require("../service/upbit");
const fs = require("fs");

let isRunning = false;
let USER = {};

const openConfig = async () => {
  return new Promise((resolve, reject) => {
    try {
      const data = fs.readFileSync("./config.json", "utf8");
      const jsonData = JSON.parse(data);
      resolve(jsonData);
    } catch (e) {
      console.error(e);
      resolve({});
      // console.log("설정파일을 읽을 수 없습니다.");
    }
  });
};

const openVal = async () => {
  return new Promise((resolve, reject) => {
    try {
      const data = fs.readFileSync("./val.json", "utf8");
      const jsonData = JSON.parse(data);
      resolve(jsonData);
    } catch (e) {
      console.error(e);
      resolve({});
      // console.log("설정파일을 읽을 수 없습니다.");
    }
  });
};

const question = (query) => new Promise((resolve) => readline.question(query, resolve));

const makeDocu = async (qry) => {
  // 파일 이름을 정의합니다.
  const fileName = "./log.txt";
  // qry 객체를 문자열로 변환합니다.
  const dataString = JSON.stringify(qry) + "\n"; // 각 qry를 새로운 줄에 추가합니다.

  // fs.appendFile 함수를 사용하여 파일에 데이터를 비동기적으로 추가합니다.
  // 파일이 없으면 새로 생성하고, 있으면 내용을 끝에 추가합니다.
  fs.appendFile(fileName, dataString, "utf8", (err) => {
    if (err) {
      console.error("파일 저장 중 오류 발생:", err);
    } else {
      console.log(`${fileName}에 데이터 추가됨.`);
    }
  });
};

const init = async () => {
  console.log(formatTimestamp() + " 같은 디렉토리에 config.json 파일을 읽습니다.");
  USER = await openConfig();
  console.log(formatTimestamp() + " 설정 파일을 다음과 같이 읽었습니다!");
  console.log(USER);
  let mode = "거래모드(실제로 거래가 이루어집니다)";

  if (USER.test_mode) {
    mode = "테스트모드(실제로 거래가 이루어지지 않습니다)";
  }

  const answer = await question("지금 현재 설정된 모드는 " + mode + "입니다, 계속 진행하시겠습니까? (yes/no) ");

  if (answer.toLowerCase() === "yes") {
    console.log("진행합니다.");
    // 후속 작업 진행...
  } else {
    console.log("작업을 중단합니다.");
    process.exit(0);
  }

  readline.close();
  console.log(formatTimestamp() + USER.program_interval + " 초 간격으로 프로그램이 실행됩니다!");
  console.log(formatTimestamp() + USER.program_interval + " 초 후 시작됩니다!");
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
    console.log(formatTimestamp() + " 같은 디렉토리에 val.json 파일을 읽습니다.");
    const VALUE = await openVal();
    console.log(formatTimestamp() + "  val.json 설정 파일을 읽었습니다!");
    console.log(VALUE);

    if (!VALUE) {
      console.log(formatTimestamp() + " 설정 파일 값이 잘못 되었습니다.");
      return;
    }

    console.log(formatTimestamp() + "읽어드린 설정파일의 키 값으로 토큰을 발급받습니다. 에러가 나면 키 값이 잘못되었을 수 있습니다.");

    const token = await UPBIT_SERVICE.getToken(USER.access_key, USER.secret_key);
    console.log(formatTimestamp() + "토큰을 받았습니다!.", token);

    const markets = (await UPBIT_SERVICE.getMarketAllFromUpBit(token)).data;

    console.log(formatTimestamp() + "지금 전체 업비트의 마켓 개수는 ? ", markets.length);

    const marketsKRW = markets.filter((market) => market.market.indexOf("KRW") > -1);
    const marketParams = marketsKRW.map((market) => market.market).join(",");
    console.log(formatTimestamp() + " 이 중에서 한화 마켓은 ?", marketsKRW.length);

    const snapShot = await UPBIT_SERVICE.getSnapSot(marketParams, token);

    if (snapShot.success) {
    } else {
      console.log("에러 : ", snapShot.message);
      return;
    }

    console.log(formatTimestamp() + " 마켓을 설정 값에 따라 필터링 합니다!");
    let selecteMarket = snapShot.data;

    if (VALUE.isTargetInclude24Price) {
      selecteMarket = selecteMarket.sort((a, b) => b.acc_trade_price_24h - a.acc_trade_price_24h);
    }
    if (VALUE.isTargetInclude24Volume) {
      selecteMarket = selecteMarket.sort((a, b) => b.acc_trade_volume_24h - a.acc_trade_volume_24h);
    }
    if (VALUE.isTargetIncludeChkClosingPrice) {
      selecteMarket = selecteMarket.filter((item) => item.trade_price > item.prev_closing_price);
    }

    console.log(formatTimestamp() + " 최대 마켓 사이즈 !" + VALUE.targetMarketMaxSize);

    selecteMarket = selecteMarket.slice(0, VALUE.targetMarketMaxSize);

    const selecteMarketCodes = selecteMarket.map((item) => item.market);
    const filteredMarketsKRW = marketsKRW.filter((market) => selecteMarketCodes.includes(market.market));

    console.log(formatTimestamp() + "지금 먹을 코인 대상은 몇개 ? >> ===============>", selecteMarket.length);
    console.log(formatTimestamp() + "조회대상 코인================>", filteredMarketsKRW.map((item) => item.korean_name).join(","));
    await makeDocu(formatTimestamp() + "조회대상 코인================>" + filteredMarketsKRW.map((item) => item.korean_name).join(","));

    for (const market of filteredMarketsKRW) {
      await delay(10);
      const candles = await UPBIT_SERVICE.getCandles(market.market, token);
      if (!candles.success) {
        console.log("candles errors ================>", candles.message);
        continue;
      }
      const targetMarkrt = await identifySurgingCoin(market, USER, candles.data, VALUE);
      if (targetMarkrt.success) {
        console.log(formatTimestamp() + "급등 코인을 찾았따 !!", targetMarkrt.message);
        await makeDocu(formatTimestamp() + "급등 코인을 찾았따 !!" + targetMarkrt.message);
      } else {
        console.log(formatTimestamp() + "급등코인이 아니넹 ㅠㅠ", targetMarkrt.message);
        continue;
      }

      const orderbook = await UPBIT_SERVICE.getOrderBook(market.market, token);

      if (!orderbook.success) {
        console.log("orderbook errors ================>", orderbook.message);
        continue;
      }
      const volume = VALUE.invest / orderbook.data[0].orderbook_units[0].ask_price;

      const body = {
        market: market.market + "",
        side: "bid",
        volume: volume + "",
        price: orderbook.data[0].orderbook_units[0].ask_price + "",
        ord_type: "limit",
      };

      if (USER.test_mode) {
        console.log(formatTimestamp() + "테스트 모드로 실제로 구매는 하지 않습니다.!");
      } else {
        console.log(formatTimestamp() + "급등코인 매수 가즈아!!");
      }
      await makeDocu(formatTimestamp() + "급등 코인을 매수닷 !!");
      await makeDocu(body);
      let orderResult = {};

      if (!USER.test_mode) {
        const userToken = await UPBIT_SERVICE.getUserTokens(USER.access_key, USER.secret_key, body);
        orderResult = await UPBIT_SERVICE.orderToUpbit(body, userToken);

        if (!orderResult.success) {
          console.log("orderResult errors ================>", orderResult.message);
          continue;
        }
        // console.log(orderResult);
      }

      var qry = {
        market: market.market,
        marketKr: market.korean_name,
        uuid: USER.test_mode ? "" : orderResult.data.uuid,
        buy: orderbook.data[0].orderbook_units[0].ask_price,
        volume: volume,
        invest: VALUE.invest,
        trDate: new Date(),
      };

      if (USER.test_mode) {
        console.log(formatTimestamp() + "테스트 모드로 실제로 구매는 하지 않습니다.!");
      } else {
        console.log(formatTimestamp() + "급등 코인 매수완료!! 이제 기다리자!! ");
      }

      await monitorAndSell(market, body.price, volume, qry, USER, token, VALUE);

      // const order = await UPBIT_SRVICE.buyCoin(market.market, USER, token);
    }

    await delay(10);
  } finally {
    isRunning = false; // 실행 완료 후 상태를 false로 재설정
  }
};

// setInterval(main, 1000); // 1분마다 main 함수 실행

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const identifySurgingCoin = async (market, USER, candles, VALUE) => {
  return new Promise(async (resolve, reject) => {
    const increases = {
      "1min": calculateIncrease(candles[1].trade_price, candles[0].trade_price),
      "3min": calculateIncrease(candles[2].trade_price, candles[0].trade_price),
      "10min": calculateIncrease(candles[9].trade_price, candles[0].trade_price),
      "15min": calculateIncrease(candles[14].trade_price, candles[0].trade_price),
      "30min": calculateIncrease(candles[29].trade_price, candles[0].trade_price),
      "60min": calculateIncrease(candles[59].trade_price, candles[0].trade_price),
    };

    let allIncreasesArePositive = true;

    if (VALUE.isAllTargetBiggerThanZero) {
      allIncreasesArePositive = Object.values(increases).every((value) => value >= 0);
    }

    // console.log(increases);

    const isIncreasing1 = increases["1min"] >= VALUE.target1;
    const isIncreasing3 = increases["3min"] >= VALUE.target3;
    const isIncreasing10 = increases["10min"] >= VALUE.target10;
    const isIncreasing15 = increases["15min"] >= VALUE.target15;
    const isIncreasing30 = increases["30min"] >= VALUE.target30;
    const isIncreasing60 = increases["60min"] >= VALUE.target60;

    let isAlllIncreasing = true;

    if (VALUE.isTargetIncludeChkClosingPrice) {
      isAlllIncreasing = isIncreasing1 && isIncreasing3 && isIncreasing10 && isIncreasing15 && isIncreasing30 && isIncreasing60;
    }

    let isTrend = true;

    if (VALUE.isChckSortTrend) {
      isTrend = increases["1min"] > increases["3min"] && increases["1min"] > increases["10min"];
    }
    if (VALUE.isChckLongTrend) {
      isTrend = increases["1min"] > increases["3min"] && increases["30min"] > increases["60min"];
    }

    if (allIncreasesArePositive && isAlllIncreasing && isTrend) {
      var message = `${market.korean_name}, 최근 1분 상승률: ${increases["1min"].toFixed(2)}%,  10분 상승률: ${increases["10min"].toFixed(
        2
      )}%, 15분 상승률: ${increases["15min"].toFixed(2)}%, 30분 상승률: ${increases["30min"].toFixed(2)}%, 60분 상승률: ${increases["60min"].toFixed(
        2
      )}%`;

      resolve({
        success: true,
        market: market,
        message: message,
        data: increases,
      });
      return;
    } else {
      resolve({
        success: false,
        market: market,
        data: increases,
        message: `${market.korean_name}, 최근 10분 상승률: ${increases["1min"].toFixed(2)}%, 10분 상승률: ${increases["10min"].toFixed(
          2
        )}%, 15분 상승률: ${increases["15min"].toFixed(2)}%, 30분 상승률: ${increases["30min"].toFixed(2)}%, 60분 상승률: ${increases[
          "60min"
        ].toFixed(2)}%`,
      });
    }
  });
};

const calculateIncrease = (startPrice, endPrice) => {
  return ((endPrice - startPrice) / startPrice) * 100;
};

const monitorAndSell = async (market, buyPrice, volume, orderQry, USER, token, VALUE) => {
  return new Promise(async (resolve, reject) => {
    let count = 0;

    const intervalId = setInterval(async () => {
      if (count >= VALUE.sellLoopMaxCount) {
        clearInterval(intervalId);
        await sellCoin(market, volume, orderQry, token, USER, VALUE);
        await makeDocu(formatTimestamp() + `${market.korean_name} 시장가에 판매 합니다 ㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠ`);
        console.log(formatTimestamp() + `${market.korean_name} 시장가에 판매 합니다 ㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠ`);
        resolve();
      } else {
        const snapShot = await UPBIT_SERVICE.getSnapSot(market.market, token);
        if (!snapShot.success) {
          console.log("snapShot errors ================>", snapShot.message);
          return;
        }
        const currentPrice = snapShot.data[0].trade_price; // 현재 가격
        const priceIncrease = ((currentPrice - buyPrice) / buyPrice) * 100;
        console.log(
          formatTimestamp() +
            `${market.korean_name} 현재가: ${currentPrice}, 매수가: ${buyPrice}, 상승률: ${priceIncrease.toFixed(2)}%, 판매조건: ${VALUE.margin}%`
        );

        if (priceIncrease > VALUE.margin) {
          clearInterval(intervalId); // 조건 만족 시 중지
          await sellCoin(market, volume, orderQry, token, USER, VALUE); // 조건 만족 시 판매
          await makeDocu(formatTimestamp() + `${market.korean_name} ${priceIncrease.toFixed(2)}% 상승하여 판매 시도`);
          console.log(formatTimestamp() + `${market.korean_name} ${priceIncrease.toFixed(2)}% 상승하여 판매 시도`);
          resolve();
        } else {
          // console.log(`${market} ${priceIncrease.toFixed(2)}% 상승하여 판매 시도 하지 않음`);
        }
      }
      count += 1;
    }, VALUE.sellLoopIntervalSec * 1000);

    return;
  });
};

const sellCoin = async (market, volume, orderQry, token, USER, VALUE) => {
  return new Promise(async (resolve, reject) => {
    const orderbook = await UPBIT_SERVICE.getOrderBook(market.market, token);
    if (!orderbook.success) {
      console.log("orderbook errors ================>", orderbook.message);
      console.log(formatTimestamp() + "판매를 위한 현재가격을 가져오지 못하여 판매 실패.");
      resolve();
      return;
    }

    console.log(orderbook);
    console.log(formatTimestamp() + "코인 판매를 위한 현재가격: ", orderbook.data[0].orderbook_units[0].bid_price);

    const body = {
      market: market.market + "",
      side: "ask",
      volume: volume + "",
      price: orderbook.data[0].orderbook_units[0].bid_price + "",
      ord_type: "limit",
    };

    console.log(formatTimestamp() + "코인 판매를 위한 body: ", body);

    const userToken = await UPBIT_SERVICE.getUserTokens(USER.access_key, USER.secret_key, body);
    if (!USER.test_mode) {
      const orderResult = await UPBIT_SERVICE.orderToUpbit(body, userToken);

      if (!orderResult.success) {
        console.log("orderResult errors ================>", orderResult.message);
        resolve();
        return;
      } else {
        console.log(formatTimestamp() + "코인 판매완료: ", orderResult.message);
        resolve();
        return;
      }
    } else {
      console.log(formatTimestamp() + "코인 판매완료!! 테스트 모드로 실제로 판매는 하지 않습니다.!");
      resolve();
      return;
    }
  });
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

const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});
