const request = require("request");

exports.login = (id, password) => {
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
      if (error) {
        resolve({
          success: false,
          message: error.message,
        });
      } else {
        if (!body.success) {
          resolve({
            success: false,
            message: body.message,
          });
          return;
        } else {
          const toDate = body.user.toDate;
          const role = body.user.role;

          if (error) {
            console.log("error", error);
            console.error(error);
            resolve({
              success: false,
              message: error.message,
            });
          } else {
            if (compareWithCurrentDate(toDate) && role >= 2) {
              resolve({
                success: true,
                message: "success",
              });
            } else {
              resolve({
                success: false,
                message: "success",
              });
            }
          }
        }
      }
    });
  });
};

function compareWithCurrentDate(dateString) {
  // dateString을 날짜 객체로 변환
  const year = parseInt(dateString.substring(0, 4), 10);
  const month = parseInt(dateString.substring(4, 6), 10) - 1; // JS에서 월은 0부터 시작
  const day = parseInt(dateString.substring(6, 8), 10);
  const date = new Date(year, month, day);

  // 현재 날짜를 가져옵니다 (시간을 0으로 설정하여 날짜만 비교)
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // 현재 날짜의 시간을 0으로 설정

  // 날짜 비교
  if (date > currentDate) {
    return true;
  } else if (date <= currentDate) {
    return false;
  }
}
