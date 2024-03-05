const mysql = require("mysql");

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

exports.insertProduct = (qry) => {
  return new Promise((resolve, reject) => {
    try {
      db.getConnection(function (err, connection) {
        connection.query(" insert into Product set ? ", [qry], (err, results) => {
          connection.release();
          if (err) {
            console.error(err);
            resolve({
              success: false,
              message: err.message,
            });
          }
          resolve({
            success: true,
            message: "success",
          });
        });
      });
    } catch (err) {
      console.error(err);
      resolve({
        success: false,
        message: err.message,
      });
    }
  });
};

exports.saveTran = (order) => {
  return new Promise((resolve, reject) => {
    getConnection((err, connection) => {
      if (err) {
        console.error("DB 연결 실패:", err);
        resolve({
          success: false,
          message: err.message,
        });
      } else {
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
          order.sell,
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
            reject({
              success: false,
              message: error.message,
            });
          } else {
            resolve({
              success: true,
              message: "success",
              data: results,
            });
          }
        });
      }
    });
  });
};
