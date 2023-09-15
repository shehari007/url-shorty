const express = require('express');
const router = express.Router();
var cfg = require('../config').pool;
require('dotenv').config();

router.get("/", async (req, res) => {

    try {
       cfg.getConnection((err, connection) => {
         if (err) {
           console.log(err)
           return res.status(500).send("Server error, Please try again Later");
         }
         else {
           let sql = `SELECT MAX(id) AS total_shorty, SUM(times_clicked) AS total_clicked FROM shorty_URL`;
           connection.query(sql, function (err, result) {
             connection.release();
             if (err) {
   
               console.log(`FAILED: ${err}`)
               return res.status(500).send("Server error, Please try again Later");
             }
             else {
                console.log("STATS SENT SUCESSFULLY")
                res.status(200).send(result)        
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
