const express = require('express');
const router = express.Router();
var cfg = require('../config').pool;
require('dotenv').config();

router.get("/", async (req, res) => {
  let constructURL = process.env.SHORTURLDEF+req.paramsValue

  try {
    cfg.getConnection((err, connection) => {
      if (err) {
        console.log(err)
        return res.status(500).send("Server error, Please try again Later");
      }
      else {
        let stats = `UPDATE shorty_url SET times_clicked = times_clicked + 1 WHERE short_url = ?`
        let sql = `SELECT main_url, expired_status, blacklisted from shorty_URL WHERE short_url = ?`;
        connection.query(stats, [constructURL]);
        connection.query(sql, [constructURL], function (err, result) {
          connection.release();
          if (err) {

            console.log(`FAILED: ${err}`)
            return res.status(500).send("Server error, Please try again Later");
          }
          else {
            if (result.length>0 && result[0].expired_status === 1) {
              console.log("EXPIRED LINK INVOKED")
              res.status(410).send("LINK EXPIRED");
            } else if (result.length>0 && result[0].blacklisted === 1) {
              console.log("BLACKLISTED LINK INVOKED, DECLINED")
              res.status(410).send("LINK BLACKLISTED");
            }
            else if (result.length>0 && result[0].expired_status === 0 && result[0].blacklisted === 0) {
              console.log('Shorty URL Found, Redirecting..');
              res.redirect(307, result[0].main_url);
            }
            else {
              res.status(404).send("INVALID LINK");
            }

          }
        });
      }
    })

  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server error");
  }
});

module.exports = router;
