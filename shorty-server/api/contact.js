const express = require('express');
const router = express.Router();
var cfg = require('../config').pool;
require('dotenv').config();

router.post("/", async (req, res) => {
    const { fullname, email, detail } = req.body;
    var datetime = new Date().toLocaleString();
    try {
       cfg.getConnection((err, connection) => {
         if (err) {
           console.log(err)
           return res.status(500).send("Server error, Please try again Later");
         }
         else {
           let sql = `INSERT INTO shorty_contact SET id=(SELECT MAX(id) + 1 FROM shorty_contact), fullname=?, email=?, message=?, user_ip=?, user_agent=?, time_sent=?`;
           connection.query(sql,[fullname, email, detail, req.ip, req.headers['user-agent'], datetime], function (err, result) {
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
