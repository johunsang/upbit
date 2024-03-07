const request = require("request");
const uuidv4 = require("uuid/v4");
const sign = require("jsonwebtoken").sign;
const crypto = require("crypto");
const queryEncode = require("querystring").encode;

exports.getToken = (access_key, secret_key) => {
  let payload = {
    access_key: access_key,
    nonce: uuidv4(),
  };

  let token = sign(payload, secret_key);
  return token;
};

exports.getUserTokens = (access_key, secret_key, params) => {
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
  return token;
};

exports.getMarketAllFromUpBit = (token) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      url: "https://api.upbit.com/v1/market/all",
      headers: { Authorization: `Bearer ${token}` },
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error(error);
        resolve({
          success: false,
          message: error.message,
        });
      }
      const data = JSON.parse(body);
      resolve({
        success: true,
        message: "success",
        data: data,
      });
    });
  });
};

exports.getCandles = (market, token) => {
  return new Promise((resolve, reject) => {
    const params = {
      market: market,
      count: 200,
    };

    let url = "https://api.upbit.com/v1/candles/minutes/" + 1 + "?" + new URLSearchParams(params);

    const options = {
      method: "GET",
      url: url,
      headers: { Authorization: `Bearer ${token}` },
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error(error);
        resolve({
          success: false,
          message: error.message,
        });
      }
      const data = JSON.parse(body);
      resolve({
        success: true,
        message: "success",
        data: data,
      });
    });
  });
};

exports.getCandlesMin = (market, token,   min) => {
  return new Promise((resolve, reject) => {
    const params = {
      market: market,
      count: 200,
    };

    let url = "https://api.upbit.com/v1/candles/minutes/" + min + "?" + new URLSearchParams(params);

    const options = {
      method: "GET",
      url: url,
      headers: { Authorization: `Bearer ${token}` },
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error(error);
        resolve({
          success: false,
          message: error.message,
        });
      }
      const data = JSON.parse(body);
      resolve({
        success: true,
        message: "success",
        data: data,
      });
    });
  });
};

exports.getCandlesDay = (market, token) => {
  return new Promise((resolve, reject) => {
    const params = {
      market: market,
      count: 200,
    };

    let url = "https://api.upbit.com/v1/candles/days?" + new URLSearchParams(params);

    const options = {
      method: "GET",
      url: url,
      headers: { Authorization: `Bearer ${token}` },
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error(error);
        resolve({
          success: false,
          message: error.message,
        });
      }
      const data = JSON.parse(body);
      resolve({
        success: true,
        message: "success",
        data: data,
      });
    });
  });
};

exports.getCandlesWeek = (market, token) => {
  return new Promise((resolve, reject) => {
    const params = {
      market: market,
      count: 200,
    };

    let url = "https://api.upbit.com/v1/candles/weeks?" + new URLSearchParams(params);

    const options = {
      method: "GET",
      url: url,
      headers: { Authorization: `Bearer ${token}` },
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error(error);
        resolve({
          success: false,
          message: error.message,
        });
      }
      const data = JSON.parse(body);
      resolve({
        success: true,
        message: "success",
        data: data,
      });
    });
  });
};


exports.getCandlesMonth = (market, token) => {
  return new Promise((resolve, reject) => {
    const params = {
      market: market,
      count: 200,
    };

    let url = "https://api.upbit.com/v1/candles/months?" + new URLSearchParams(params);

    const options = {
      method: "GET",
      url: url,
      headers: { Authorization: `Bearer ${token}` },
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error(error);
        resolve({
          success: false,
          message: error.message,
        });
      }
      const data = JSON.parse(body);
      resolve({
        success: true,
        message: "success",
        data: data,
      });
    });
  });
};



exports.getSnapSot = (markets, token) => {
  return new Promise((resolve, reject) => {
    const params = {
      markets: markets,
    };

    const options = {
      method: "GET",
      url: "https://api.upbit.com/v1/ticker" + "?" + new URLSearchParams(params),
      headers: { Authorization: `Bearer ${token}` },
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error("error:", error);
        resolve({
          success: false,
          message: error.message,
        });
      }
      try {
        const data = JSON.parse(body);
        // console.log(data);
        resolve({
          success: true,
          message: "success",
          data: data,
        });
      } catch (e) {
        console.error(error);
        resolve({
          success: false,
          message: error.message,
        });
      }
    });
  });
};

exports.getOrderBook = (market, token) => {
  return new Promise((resolve, reject) => {
    const params = {
      markets: market,
      level: 0,
    };

    const options = {
      method: "GET",
      url: "https://api.upbit.com/v1/orderbook" + "?" + new URLSearchParams(params),
      headers: { Authorization: `Bearer ${token}` },
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error(error);
        resolve({
          success: false,
          message: error.message,
        });
      }
      const data = JSON.parse(body);
      resolve({
        success: true,
        message: "success",
        data: data,
      });
    });
  });
};

exports.orderToUpbit = (body, userToken) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      url: "https://api.upbit.com/v1/orders",
      headers: { Authorization: `Bearer ${userToken}` },
      json: body,
    };

    request(options, (error, response, body) => {
      if (error) {
        console.log("error", error);
        console.error(error);
        resolve({
          success: false,
          message: error.message,
        });
      } else {
        console.log(body);
        resolve({
          success: true,
          message: "success",
          data: body,
        });
      }
    });
  });
};

exports.getOrderDetail = (params, userToken) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      url: "https://api.upbit.com/v1/order" + "?" + new URLSearchParams(params),
      headers: { Authorization: `Bearer ${userToken}` },
    };

    request(options, (error, response, body) => {
      if (error) {
        console.error(" error:", error);
        resolve({
          success: false,
          message: error.message,
        });
      }
      try {
        const data = JSON.parse(body);
        resolve(data);
      } catch (e) {
        console.error(" error:", e);
        resolve({
          success: false,
          message: e.message,
        });
      }
    });
  });
};

function formatTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}]`;
}
