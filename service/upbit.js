const request = require("request");
const uuidv4 = require("uuid/v4");
const sign = require("jsonwebtoken").sign;
const crypto = require("crypto");
const queryEncode = require("querystring").encode;

function createRequestPromise(options) {
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) {
        reject({ success: false, message: error.message });
      } else {
        let json = {};
        try {
          json = JSON.parse(body);
        } catch (e) {
          console.error(e);
          reject({ success: false, message: e.message });
        }
        if (json.error) {
          console.log("업비트 API 요청 중 에러 발생 ");
          console.error("업비트 에러 --> ",json.error);
          resolve({ success: false, message: json.error.message });
        }
        resolve({ success: true, message: "success", data: json });
      }
    });
  });
}

function handleError(error) {
  console.error(error);
  console.log("업비트 API 요청 중 에러 발생 ");
  return { success: false, message: error.message };
}

exports.getToken = (accessKey, secretKey) => {
  const payload = {
    access_key: accessKey,
    nonce: uuidv4(),
  };

  return sign(payload, secretKey);
};

exports.getUserToken = (accessKey, secretKey, params) => {
  const query = queryEncode(params);
  const hash = crypto.createHash("sha512");
  const queryHash = hash.update(query, "utf-8").digest("hex");

  const payload = {
    access_key: accessKey,
    nonce: uuidv4(),
    query_hash: queryHash,
    query_hash_alg: "SHA512",
  };

  return sign(payload, secretKey);
};

exports.getMarketAll = async (token) => {
  const options = {
    method: "GET",
    url: "https://api.upbit.com/v1/market/all",
    headers: { Authorization: `Bearer ${token}` },
  };

  try {
    const response = await createRequestPromise(options);
    return response;
  } catch (error) {
    return handleError(error);
  }
};

exports.getCandles = async (market, token, type = "minutes", unit, count = 200) => {
  const options = {
    method: "GET",
    url: `https://api.upbit.com/v1/candles/${type}/${unit}?market=${market}&count=${count}`,
    headers: { Authorization: `Bearer ${token}` },
  };

  try {
    const response = await createRequestPromise(options);
    return response;
  } catch (error) {
    return handleError(error);
  }
};

exports.getCandlesDay = async (market, token) => {
  const options = {
    method: "GET",
    url: `https://api.upbit.com/v1/candles/days?market=${market}&count=200`,
    headers: { Authorization: `Bearer ${token}` },
  };

  try {
    const response = await createRequestPromise(options);
    return response;
  } catch (error) {
    return handleError(error);
  }
};

exports.getTicker = async (markets, token) => {
  const options = {
    method: "GET",
    url: `https://api.upbit.com/v1/ticker?markets=${markets}`,
    headers: { Authorization: `Bearer ${token}` },
  };

  try {
    const response = await createRequestPromise(options);
    return response;
  } catch (error) {
    return handleError(error);
  }
};

exports.getOrderBook = async (market, token) => {
  const options = {
    method: "GET",
    url: `https://api.upbit.com/v1/orderbook?markets=${market}&level=0`,
    headers: { Authorization: `Bearer ${token}` },
  };

  try {
    const response = await createRequestPromise(options);
    return response;
  } catch (error) {
    return handleError(error);
  }
};

exports.createOrder = async (body, userToken) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      url: "https://api.upbit.com/v1/orders",
      headers: { Authorization: `Bearer ${userToken}` },
      json: body,
    };

    try {
      request(options, (error, response, body2) => {
        if (error) {
          console.error(error);
          reject({ success: false, message: error.message });
        } else {
          resolve({ success: true, message: "success", body2 });
        }
      });
    } catch (error) {
      console.error(error);
      return handleError(error);
    }
  });
};

exports.getOrder = async (params, userToken) => {
  const options = {
    method: "GET",
    url: `https://api.upbit.com/v1/order?${queryEncode(params)}`,
    headers: { Authorization: `Bearer ${userToken}` },
  };

  try {
    const response = await createRequestPromise(options);
    return response;
  } catch (error) {
    return handleError(error);
  }
};
