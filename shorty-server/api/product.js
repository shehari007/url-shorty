const express = require('express');
const router = express.Router();
var cfg = require('../config').pool;

router.post("/", async (req, res) => {

  const URLparam = req.body.urlValue;

  if (URLparam.indexOf("https://") === 0) {

    const { customAlphabet } = require('nanoid');
    const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 5)
    const shortURL = `http://localhost:8080/co/${nanoid()}`;
    var datetime = new Date().toLocaleString();
    try {

      cfg.getConnection((err, connection) => {
        if (err) {
          console.log(err)
          return res.status(500).send("Server error, Please try again Later");
        }
        else {
          let sql = `INSERT INTO shorty_URL SET id=(SELECT MAX(id) + 1 from shorty_url), main_url=?, short_url=?, expired_status=?, req_ip=?, req_agent=?, time_issued=?`;
          connection.query(sql, [URLparam, shortURL, 0, req.ip, req.headers['user-agent'], datetime], function (err, result) {
            connection.release();
            if (err) {

              console.log(`FAILED: ${err}`)
              return res.status(500).send("Server error, Please try again Later");
            }
            else {
              console.log('shorty URL issued successfully');
              res.json({
                status: 200,
                message: shortURL,
              });
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
    res.status(400).send("ONLY HTTPS LINKS ARE ALLOWED.. ");
  }

});

module.exports = router;
