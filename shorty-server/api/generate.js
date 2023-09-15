const express = require('express');
const router = express.Router();
var cfg = require('../config').pool;
require('dotenv').config();
function isNotURL(str) {
  // Regular expression to match a basic URL pattern
  const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9_-]+\.)+[a-zA-Z]{2,9}(:[0-9]+)?(\/[^\s]*)?$/;

  // Test if the string does NOT match the URL pattern
  return !urlPattern.test(str);
}

router.post("/", async (req, res) => {
  const URLparam = req.body.urlValue;

  if (URLparam.indexOf("https://") === 0 && !isNotURL(URLparam)) {

    const { customAlphabet } = require('nanoid');
    const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', process.env.PARAMLEN)
    const shortURL = `${process.env.SHORTURLDEF}${nanoid(5)}`;
    var datetime = new Date().toLocaleString();
    try {

      cfg.getConnection((err, connection) => {
        if (err) {
          console.log(err)
          return res.status(500).send("Server error, Please try again Later");
        }
        else {
          let blackListAndExistCheck = `SELECT blacklisted, short_url from shorty_URL WHERE main_url = ?`;
          let sql = `INSERT INTO shorty_URL SET id=(SELECT MAX(id) + 1 from shorty_url), main_url=?, short_url=?, expired_status=?, req_ip=?, req_agent=?, time_issued=?, times_clicked = ?, blacklisted =?`;
          connection.query(blackListAndExistCheck, [URLparam], function (err, result1) {
            if (err) {
              console.log(`FAILED: ${err}`)
              return res.status(500).send("Server error, Please try again Later");
            }
            else if (result1.length > 0 && result1[0].blacklisted === 0) {
              connection.release();
              console.log('shorty URL already Exist, sent successfully');
              res.json({
                status: 200,
                message: result1[0].short_url
              })
            }
            else if (result1.length === 0) {
              connection.query(sql, [URLparam, shortURL, 0, req.ip, req.headers['user-agent'], datetime, 0, 0], function (err, result) {
                connection.release();
                if (err) {

                  console.log(`FAILED: ${err}`)
                  return res.status(500).send("Server error, Please try again Later");
                }
                else {
                  console.log('shorty URL issued successfully');
                  res.json({
                    status: 200,
                    message: shortURL
                  })
                }
              });
            }
            else {
              console.log("BLACKLISTED URL ENTERED, REQUEST DECLINED")
              res.status(403).send("URL BLACKLISTED");
            }
          });

        }
      })

    } catch (error) {
      console.error(error);
      return res.status(500).send("Internal Server error");
    }
  }
  else {
    console.log('INSECURE HTTP LINK OR STRING IS NOT A VALID URL DETECTED, REQUEST DECLINED')
    res.status(400).send("INSECURE HTTP LINK OR STRING IS NOT A VALID URL DETECTED, REQUEST DECLINED");
  }

});

module.exports = router;
