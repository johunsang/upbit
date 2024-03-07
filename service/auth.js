const request = require("request");
const uuidv4 = require("uuid/v4");
const sign = require("jsonwebtoken").sign;
const crypto = require("crypto");
const queryEncode = require("querystring").encode;

exports.login = (id, password) => {
    return new Promise((resolve, reject) => {
      
    const body = {
      id: id,
      password: password,
    };

    const options = {
      method: "POST",
      url: "https://admin.coudae.kr/chrome/login",
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
