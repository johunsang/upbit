const request = require("request");
const uuidv4 = require("uuid/v4");
const sign = require("jsonwebtoken").sign;
const crypto = require("crypto");
// const { login } = require("./auth");
const queryEncode = require("querystring").encode;

login = async (id, password) => {
  return new Promise(async (resolve, reject) => {
    const body = {
      vendorId: id,
      password: password,
    };

    const options = {
      method: "POST",
      url: "https://admin.coudae.co.kr/chrome/login",
      json: true, // Automatically stringifies the body to JSON
      body: body,
    };

    request(options, (error, repsonse, body) => {
      console.log(body);
      if (error) {
        console.log("error", error);
        console.error(error);
        resolve({
          success: false,
          message: error.message,
        });
      } else {
        resolve({
          success: true,
          message: "success",
          data: body,
        });
      }
    });
  });

  
};

login("A00878694", "a1234567").then((result) => console.log(result.success));
