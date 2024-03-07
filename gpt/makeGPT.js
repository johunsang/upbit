const UPBIT_SERVICE = require("../service/upbit");
const fs = require("fs");

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

const makeDocu = async (qry) => {
  // 파일 이름을 정의합니다.
  const fileName = "./candles_data.txt";
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

const main = async () => {
  const USER = await openConfig();
  const token = await UPBIT_SERVICE.getToken(USER.access_key, USER.secret_key);
  makeMinutes(token);
  makeDays(token);
  makeWeeks(token);
  makeMonths(token);
};

const makeDays = async (token) => {
  return new Promise(async (resolve, reject) => {
    const marketParams = USER.coinCode + "-KRW";
    const candles = await UPBIT_SERVICE.getCandlesDay(marketParams, token);

    await makeDocu("여기서 부터는 가장 최근 일별 봉 데이터입니다.");

    for (let j = 0; j < candles.data.length; j++) {
      const candle = candles.data[j];
      const qry = {
        마켓: USER.coinName,
        중류: "일별",
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
      await makeDocu(qry);
      console.log(qry);
      await delay(100);
    }
    reso
  });
};

const makeWeeks = async (token) => {
  return new Promise(async (resolve, reject) => {
    const marketParams = USER.coinCode + "-KRW";
    const candles = await UPBIT_SERVICE.getCandlesWeek(marketParams, token);

    await makeDocu("여기서 부터는 가장 최근 주별 봉 데이터입니다.");

    for (let j = 0; j < candles.data.length; j++) {
      const candle = candles.data[j];
      const qry = {
        마켓: USER.coinName,
        중류: "주별 WEEK",
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
      await makeDocu(qry);
      console.log(qry);
      await delay(100);
    }
  });
};

const makeMonths = async (token) => {
  return new Promise(async (resolve, reject) => {
    const marketParams = USER.coinCode + "-KRW";
    const candles = await UPBIT_SERVICE.getCandlesMonth(marketParams, token);

    await makeDocu("여기서 부터는 가장 최근 월별 봉 데이터입니다.");

    for (let j = 0; j < candles.data.length; j++) {
      const candle = candles.data[j];
      const qry = {
        마켓: USER.coinName,
        중류: "월별 MONTH",
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
      await makeDocu(qry);
      console.log(qry);
      await delay(100);
    }
  });
};

const makeMinutes = async (token) => {
  return new Promise(async (resolve, reject) => {
    const min = [1, 3, 5, 10, 15, 30, 60, 240];

    for (let i = 0; i < min.length; i++) {
      const marketParams = USER.coinCode + "-KRW";
      const candles = await UPBIT_SERVICE.getCandlesMin(marketParams, token, min[i]);

      await makeDocu("여기서 부터는 분봉 데이터입니다.");

      for (let j = 0; j < candles.data.length; j++) {
        const candle = candles.data[j];
        const qry = {
          마켓: USER.coinName,
          "분의 캔들": min[i],
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
        await makeDocu(qry);
        console.log(qry);
        await delay(100);
      }
    }
  });
};

main();
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
