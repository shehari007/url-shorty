const express = require('express');
const router = express.Router();
var cfg = require('../config').pool;
require('dotenv').config();

router.post("/", async (req, res) => {

    const { email, shorty, detail } = req.body;
    var datetime = new Date().toLocaleString();
    try {
        cfg.getConnection((err, connection) => {
            if (err) {
                console.log(err)
                return res.status(500).send("Server error, Please try again Later");
            }
            else {
                let report = `INSERT INTO shorty_report SET id = (SELECT MAX(id) + 1 FROM shorty_report), user_email = ?, shorty_url = ?, report_details = ?, time_report = ?, user_ip = ?, user_agent = ?`;
                let sql = `SELECT id, main_url, short_url FROM shorty_URL WHERE short_url = ?`;
                connection.query(sql, [shorty], function (err, result) {


                    if (err) {
                        console.log(`FAILED: ${err}`)
                        res.status(500).send("Server error, Please try again Later");
                    }

                    else if (result.length === 1) {

                        connection.query(report, [email, shorty, detail, datetime, req.ip, req.headers['user-agent']], function (err, result2) {
                            if (err) {
                                connection.release();
                                console.log(`FAILED: ${err}`)
                                res.status(500).send("Server error, Please try again Later");
                            }
                            else {
                                console.log('REPORT SUBMITTED SUCCESSFULLY');
                                connection.release();
                                res.status(200).send("REPORT SUBMITTED SUCCESSFULLY")
                            }
                        });
                    }
                    else {
                        res.status(404).send("NO SHORTY LINK FOUND!");
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
