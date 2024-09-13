const UPBIT_SERVICE = require("../service/upbit");
const fs = require("fs");
const { type } = require("os");

let USER = "";

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

const makeDocu = async (qry, append = false, fileName) => {
  // 파일 이름을 정의합니다.
  // const fileName = "./candles_data.txt";
  // qry 객체를 문자열로 변환합니다.
  const dataString = JSON.stringify(qry) + "\n"; // 각 qry를 새로운 줄에 추가합니다.

  const fsMethod = append ? fs.appendFile : fs.writeFile;
  fsMethod(fileName, dataString, "utf8", (err) => {
    if (err) {
      console.error("파일 저장 중 오류 발생:", err);
    } else {
      console.log(`${fileName}에 데이터 추가됨.`);
    }
  });
};

const main = async () => {
  USER = await openConfig();
 
  const token = await UPBIT_SERVICE.getToken(USER.access_key, USER.secret_key);
  // console.log(token);
  await makeMinutes(token);
  await makeDays(token);
  await makeWeeks(token);
  await makeMonths(token);
};

const makeDays = async (token) => {
  return new Promise(async (resolve, reject) => {
    const marketParams = "KRW-" + USER.coinCode;
    const candles = await UPBIT_SERVICE.getCandlesDay(marketParams, token);

    await makeDocu("일별캔들 데이터입니다.", false, "일별캔들.txt");

    for (let j = 0; j < candles.data.length; j++) {
      const candle = candles.data[j];
      const qry = {
        마켓: USER.coinName,
        종류: "일별",
        현재가: candle.trade_price,
        시가: candle.opening_price,
        고가: candle.high_price,
        저가: candle.low_price,
        누적거래량: candle.candle_acc_trade_volume,
        누적거래대금: candle.candle_acc_trade_price,
        시간: candle.timestamp,
        캔들기간의가장첫날: candle.first_day_of_period,
        "캔들시각 UTC": candle.candle_date_time_utc,
        "캔들시각 KST": candle.candle_date_time_kst,
      };
      await makeDocu(qry, true, "일별캔들.txt");
      await delay(100);
    }
   resolve();
  });
};

const makeWeeks = async (token) => {
  return new Promise(async (resolve, reject) => {
    const marketParams = "KRW-" + USER.coinCode;
    const candles = await UPBIT_SERVICE.getCandlesWeek(marketParams, token);

    await makeDocu("주별캔들데이터입니다", false, "주별캔들.txt");

    for (let j = 0; j < candles.data.length; j++) {
      const candle = candles.data[j];
      const qry = {
        마켓: USER.coinName,
        종류: "주별 WEEK",
        현재가: candle.trade_price,
        시가: candle.opening_price,
        고가: candle.high_price,
        저가: candle.low_price,
        누적거래량: candle.candle_acc_trade_volume,
        누적거래대금: candle.candle_acc_trade_price,
        시간: candle.timestamp,
        캔들기간의가장첫날: candle.first_day_of_period,
        "캔들시각 UTC": candle.candle_date_time_utc,
        "캔들시각 KST": candle.candle_date_time_kst,
      };
      await makeDocu(qry, true, "주별캔들.txt");
      await delay(100);
    }

   resolve();

  });
};

const makeMonths = async (token) => {
  return new Promise(async (resolve, reject) => {
    const marketParams = "KRW-" + USER.coinCode;
    const candles = await UPBIT_SERVICE.getCandlesMonth(marketParams, token);

    await makeDocu("월별캔들데이터입니다", false, "월별캔들.txt");

    for (let j = 0; j < candles.data.length; j++) {
      const candle = candles.data[j];
      const qry = {
        마켓: USER.coinName,
        종류: "월별 MONTH",
        현재가: candle.trade_price,
        시가: candle.opening_price,
        고가: candle.high_price,
        저가: candle.low_price,
        누적거래량: candle.candle_acc_trade_volume,
        누적거래대금: candle.candle_acc_trade_price,
        시간: candle.timestamp,
        캔들기간의가장첫날: candle.first_day_of_period,
        "캔들시각 UTC": candle.candle_date_time_utc,
        "캔들시각 KST": candle.candle_date_time_kst,
      };
      await makeDocu(qry, true, "월별캔들.txt");
      await delay(100);
    }
   resolve();

  });
};

const makeMinutes = async (token) => {
  return new Promise(async (resolve, reject) => {
    const min = [1, 3, 5, 10, 15, 30, 60, 240];
    await makeDocu(
      "",
      false,
      "분별캔들.txt"
    );

    for (let i = 0; i < min.length; i++) {
      const marketParams = "KRW-" + USER.coinCode;
      const candles = (await UPBIT_SERVICE.getCandles(marketParams, token, "minutes", min[i])).data;

    //  console.log(candles);

      for (let j = 0; j < candles.length; j++) {
        const candle = candles[j];
        const qry = {
          마켓: USER.coinName,
          "분": min[i],
          현재가: candle.trade_price,
          시가: candle.opening_price,
          고가: candle.high_price,
          저가: candle.low_price,
          거래량: candle.candle_acc_trade_volume,
          거래대금: candle.candle_acc_trade_price,
          시간: candle.timestamp,
          "캔들시각 UTC": candle.candle_date_time_utc,
          "캔들시각 KST": candle.candle_date_time_kst,
        };
        await makeDocu(qry, true, "분별캔들.txt");
        await delay(100);
      }
    }
   resolve();

  });
};

main();
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
