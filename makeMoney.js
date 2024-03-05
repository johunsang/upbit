const request = require("request");
const uuidv4 = require("uuid/v4");
const sign = require("jsonwebtoken").sign;
const crypto = require("crypto");
const queryEncode = require("querystring").encode;

const mysql = require("mysql");

const access_key = "yV3O2iwYd33eahSO5TaxEh43f0QS3ngw6g6kNv17"; // 업비트에서 발급 받은 access_key
const secret_key = "QyN46CKTbRAQyNc8ZivQjbra1WgrJFcWYmQMjc1k"; // 업비트에서 발급 받은 secret_key
const server_url = "https://api.upbit.com";

const invest = 10000;
const maxCount = 30000; // 가격 판매 시도 건수 1초 * 6000 = 10분 30000=50분
const checkInterval = 10000; // 가격시도
const margin = 1.5; // 마진 %
const marketSize = 30; // 상위 10개 코인만 거래
const target1  = 0.05;
const target10 = 0.1;
const target30 = 1;
const target60 = 2;
const target200 = 3;

const getTokens = () => {
  let payload = {
    access_key: access_key,
    nonce: uuidv4(),
  };

  let token = sign(payload, secret_key);
  return token;
};

const connectionpool = mysql.createPool({
  host: "project3.c4jjujfq28aa.ap-northeast-2.rds.amazonaws.com",
  user: "johunsang",
  password: "zxcasdqwe1!",
  connectionLimit: 1,
  database: "upbit",
});

function getConnection(callback) {
  connectionpool.getConnection(callback);
}

const getMarketAllFromUpBit = () => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      url: server_url + "/v1/market/all",
      headers: { Authorization: `Bearer ${getTokens()}` },
    };

    request(options, (error, response, body) => {
      if (error) throw new Error(error);
      const data = JSON.parse(body);
      resolve(data);
    });
  });
};

const getCandles = (market) => {
  return new Promise((resolve, reject) => {
    const params = {
      market: market,
      count: 200,
    };

    url = server_url + "/v1/candles/minutes/" + 1 + "?" + new URLSearchParams(params);

    const options = {
      method: "GET",
      url: url,
      headers: { Authorization: `Bearer ${getTokens()}` },
    };

    request(options, (error, response, body) => {
      if (error) throw new Error(error);
      const data = JSON.parse(body);
      resolve(data);
    });
  });
};

const getSnapSot = (markets) => {
  return new Promise((resolve, reject) => {
    const params = {
      markets: markets,
    };

    const options = {
      method: "GET",
      url: server_url + "/v1/ticker" + "?" + new URLSearchParams(params),
      headers: { Authorization: `Bearer ${getTokens()}` },
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error("getSnapSot error:", error);
        resolve([]);
      }
      try {
        const data = JSON.parse(body);
        // console.log(data);
        resolve(data);
      } catch (e) {
        console.error("getSnapSot error:", e);
        resolve([]);
      }
      //   const data = JSON.parse(body);
      //   resolve(data);
    });
  });
};

const getOrderDetail = (uuid) => {
  return new Promise((resolve, reject) => {
    const params = {
      uuid: uuid,
    };
    const query = queryEncode(params);

    const hash = crypto.createHash("sha512");
    const queryHash = hash.update(query, "utf-8").digest("hex");

    const payload = {
      access_key: access_key,
      nonce: uuidv4(),
      query_hash: queryHash,
      query_hash_alg: "SHA512",
    };

    const token = sign(payload, secret_key);
    const authorizationToken = `Bearer ${token}`;

    const options = {
      method: "GET",
      url: server_url + "/v1/order" + "?" + new URLSearchParams(params),
      headers: { Authorization: authorizationToken },
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error("getSnapSot error:", error);
        resolve([]);
      }
      try {
        const data = JSON.parse(body);
        resolve(data);
      } catch (e) {
        console.error("getSnapSot error:", e);
        resolve([]);
      }
      //   const data = JSON.parse(body);
      //   resolve(data);
    });
  });
};

const getOrderBook = (market) => {
  return new Promise((resolve, reject) => {
    const params = {
      markets: market,
      level: 0,
    };

    const options = {
      method: "GET",
      url: server_url + "/v1/orderbook" + "?" + new URLSearchParams(params),
      headers: { Authorization: `Bearer ${getTokens()}` },
    };

    //   console.log(options);

    request(options, (error, response, body) => {
      if (error) throw new Error(error);
      const data = JSON.parse(body);
      resolve(data);
    });
  });
};

const orderToUpbit = (market, side, volume, price) => {
  return new Promise((resolve, reject) => {
    const body = {
      market: market + "",
      side: side + "",
      volume: volume + "",
      price: price + "",
      ord_type: "limit",
      identifier: "JO" + new Date().getTime(),
    };

    // console.log(body);
    const query = queryEncode(body);

    const hash = crypto.createHash("sha512");
    const queryHash = hash.update(query, "utf-8").digest("hex");

    const payload = {
      access_key: access_key,
      nonce: uuidv4(),
      query_hash: queryHash,
      query_hash_alg: "SHA512",
    };

    const token = sign(payload, secret_key);

    const options = {
      method: "POST",
      url: server_url + "/v1/orders",
      headers: { Authorization: `Bearer ${token}` },
      json: body,
    };

    request(options, (error, response, body) => {
      if (error) {
        console.log("error", error);
        console.error(error);
        reject(error);
      } else {
        console.log(body);
        resolve(body);
      }
    });
  });
};

const saveOrder = (order) => {
  return new Promise((resolve, reject) => {
    getConnection((err, connection) => {
      if (err) {
        console.error("DB 연결 실패:", err);
        reject(err);
      } else {
        // INSERT ... ON DUPLICATE KEY UPDATE 구문을 사용하여 삽입 또는 업데이트
        const query = `
          INSERT INTO Trade (uuid, market, marketKr, buy, volume, invest, trDate)
          VALUES (?, ?, ?, ?, ?, ?,? )
          ON DUPLICATE KEY UPDATE
          sell = ?, price = ?, askDate = ?, uuidAsk = ?, tradesPrice = ?, tradesFunds = ?, paid_fee = ?, locked = ?, executed_volume = ?, net = ?;
        `;

        const values = [
          order.uuid,
          order.market,
          order.marketKr,
          order.buy,
          order.volume,
          order.invest,
          order.trDate,
          order.sell, // 업데이트하고자 하는 sell 항목의 값
          order.price,
          order.askDaate,
          order.uuidAsk,
          order.tradesPrice,
          order.tradesFund,
          order.paid_fee,
          order.locked,
          order.executed_volume,
          order.net,
        ];

        connection.query(query, values, (error, results, fields) => {
          connection.release();
          if (error) {
            console.error("DB 쿼리 실패:", error);
            reject(error);
          } else {
            resolve(results);
          }
        });
      }
    });
  });
};

const calculateIncrease = (startPrice, endPrice) => {
  return ((endPrice - startPrice) / startPrice) * 100;
};

const identifySurgingCoin = async (market) => {
  return new Promise(async (resolve, reject) => {
    const candles = await getCandles(market.market, 200);
    if (candles.length < 200) return;

    if (!candles[9]) return;
    if (!candles[29]) return;
    if (!candles[59]) return;
    if (!candles[199]) return;

    const increases = {
      "1min": calculateIncrease(candles[1].trade_price, candles[0].trade_price),
      "10min": calculateIncrease(candles[9].trade_price, candles[0].trade_price),
      "30min": calculateIncrease(candles[29].trade_price, candles[0].trade_price),
      "60min": calculateIncrease(candles[59].trade_price, candles[0].trade_price),
      "200min": calculateIncrease(candles[199].trade_price, candles[0].trade_price),
    };

    const recentIncrease = increases["1min"];
    const allIncreasesArePositive = Object.values(increases).every((value) => value >= 0);
    let order = "";
    // 최근
    if (
      allIncreasesArePositive &&
      recentIncrease >= target1 &&
      increases["10min"] >= target10 &&
      increases["30min"] >= target30 &&
      increases["60min"] >= target60 &&
      increases["200min"] >= target200
    ) {
      console.log(
        `급등 코인 발견: ${market.korean_name}, 최근 10분 상승률: ${recentIncrease.toFixed(2)}%, 30분 상승률: ${increases["30min"].toFixed(2)}%`,
        Object.keys(increases).reduce((acc, key) => {
          acc[key] = `${increases[key].toFixed(2)}%`;
          return acc;
        }, {})
      );

      console.log("선택된 코인: ", market.korean_name);

      const orderbook = await getOrderBook(market.market);
      console.log("매수 호가: ", orderbook[0].orderbook_units[0].ask_price + "원");

      //주문량 계산
      const volume = invest / orderbook[0].orderbook_units[0].ask_price;
      console.log("매수량: ", volume);

      let orderResult;
      try {
        orderResult = await orderToUpbit(market.market, "bid", volume, orderbook[0].orderbook_units[0].ask_price);
        console.log("주문결과: ", orderResult);
      } catch (e) {
        console.log(e);
        reject();
      }

      order = {
        market: market.market,
        marketKr: market.korean_name,
        uuid: orderResult.uuid,
        price: orderbook[0].orderbook_units[0].ask_price,
        volume: volume,
      };

      var qry = {
        market: order.market,
        marketKr: order.marketKr,
        uuid: order.uuid,
        buy: order.price,
        volume: order.volume,
        invest: invest,
        trDate: new Date(),
      };

      await saveOrder(qry);

      await monitorAndSell(market.market, order.price, volume, qry);

      resolve();
    } else {
      resolve();
    }
  });
};

const monitorAndSell = async (market, buyPrice, volume, orderQry) => {
  let count = 0;
  // const maxCount = 6000; // 10분 동안
  // const checkInterval = 1000; // 1초마다

  const intervalId = setInterval(async () => {
    if (count >= maxCount) {
      clearInterval(intervalId); // 10분이 지나면 중지
      sellCoin(market, volume, orderQry); // 시장가로 판매
      console.log(`${market} 시장가에 판매 시도`);
    } else {
      // 현재 가격을 가져오는 API 호출 (여기서는 예시로 getSnapSot 함수 사용)
      const snapShot = await getSnapSot(market);
      if (snapShot.length === 0) return;
      if (!snapShot[0] || !snapShot[0].trade_price) return;
      const currentPrice = snapShot[0].trade_price; // 현재 가격

      // console.log("현재가: ", currentPrice);
      // console.log("매수가: ", buyPrice);
      const priceIncrease = ((currentPrice - buyPrice) / buyPrice) * 100;
      if (priceIncrease > margin) {
        clearInterval(intervalId); // 조건 만족 시 중지
        sellCoin(market, volume, orderQry); // 조건 만족 시 판매
        console.log(`${market} ${priceIncrease.toFixed(2)}% 상승하여 판매 시도`);
      } else {
        // console.log(`${market} ${priceIncrease.toFixed(2)}% 상승하여 판매 시도 하지 않음`);
      }
    }
    count += 1;
  }, checkInterval);
};

const sellCoin = async (market, volume, orderQry) => {
  const orderbook = await getOrderBook(market);
  const orderResult = await orderToUpbit(market, "ask", volume, orderbook[0].orderbook_units[0].bid_price);

  console.log("코인 판매완료: ", orderResult);

  orderQry.sell = orderbook[0].orderbook_units[0].bid_price;

  const orderDetail = await getOrderDetail(orderResult.uuid);

  console.log("주문 상세정보: ", orderDetail);

  let fund = 0;
  let price = 0;

  let trades_count = orderDetail.trades_count;

  for (let i = 0; i < trades_count; i++) {
    fund += parseFloat(orderDetail.trades[i].funds);
    price = parseFloat(orderDetail.trades[i].price);
  }

  orderQry.tradesFund = fund;

  orderQry.price = price;
  orderQry.askDaate = new Date();
  orderQry.uuidAsk = orderResult.uuid;
  orderQry.tradesPrice = price;
  orderQry.paid_fee = orderDetail.paid_fee;
  orderQry.locked = orderDetail.locked;
  orderQry.executed_volume = orderDetail.executed_volume;

  console.log("주문 상세정보: ", orderQry);

  orderQry.net = orderQry.tradesFund - invest - parseFloat(orderDetail.paid_fee);
  if (orderQry.tradesFund == 0) {
    orderQry.net = 0;
  }
  console.log("투자이익 ===============>  ", orderQry.net);
  await saveOrder(orderQry);
};

const main = async () => {
  return new Promise(async (resolve, reject) => {
    const markets = await getMarketAllFromUpBit(); // 모든 마켓 정보 조회
    const marketsKRW = markets.filter((market) => market.market.indexOf("KRW") > -1);
    const marketParams = marketsKRW.map((market) => market.market).join(",");
    const snapShot = await getSnapSot(marketParams);

    if (!snapShot || snapShot.length === 0) {
      resolve();
      return;
    }

    // 상위 10개 누적 거래량을 기준으로 필터링한 후 trade_price가 prev_closing_price보다 큰 항목만 필터링
    // const top10ByVolumeAndPrice = snapShot
    //   .sort((a, b) => b.acc_trade_volume_24h - a.acc_trade_volume_24h)
    //   .slice(0, 10)
    //   .filter((item) => item.trade_price > item.prev_closing_price);
    try {
      const top10ByVolumeAndPrice = snapShot
        .sort((a, b) => b.acc_trade_volume_24h - a.acc_trade_volume_24h)
        .slice(0, marketSize)
        .filter((item) => item.trade_price > item.prev_closing_price);

      const top10MarketCodes = top10ByVolumeAndPrice.map((item) => item.market);
      const filteredMarketsKRW = marketsKRW.filter((market) => top10MarketCodes.includes(market.market));

      for (const market of filteredMarketsKRW) {
        await identifySurgingCoin(market);
      }

      resolve();
    } catch (error) {
      console.log("error", error);
    }
  });
};

setInterval(async () => {
  console.log("메인함수호출 >> " + new Date());
  await main().catch(console.error);
}, 10 * 1000);
