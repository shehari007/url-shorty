const express = require('express');
const router = express.Router();
var cfg = require('../config').pool;


router.get("/", async (req, res) => {
    let constructURL = `http://localhost:8080/co/${req.paramsValue}`;

    try {
       cfg.getConnection((err, connection) => {
         if (err) {
           console.log(err)
           return res.status(500).send("Server error, Please try again Later");
         }
         else {
           let sql = `SELECT main_url, expired_status from shorty_URL WHERE short_url = ?`;
           connection.query(sql, [constructURL], function (err, result) {
             connection.release();
             if (err) {
   
               console.log(`FAILED: ${err}`)
               return res.status(500).send("Server error, Please try again Later");
             }
             else {
              if (result[0].expired_status === 1){
                res.status(410).send("LINK EXPIRED");
              }else {
                console.log('Shorty URL Found, Redirecting..');
                res.redirect (301, result[0].main_url);
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
