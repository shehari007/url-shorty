// module.exports={

//     config: function async () {
//         try {  
//             var mysql = require('mysql');
//             const pool =  mysql.createPool({

//                 host            : 'localhost',
//                 user            : 'root',
//                 password        : '',
//                 database        : 'yerel_hak_sen',
//                 waitForConnections: true,
//                 connectionLimit: 2500,
//                 queueLimit: 0
//             })
//             return pool;
//         } catch (e) {
//             console.log(e)
//         }
//     }
// }
var mysql = require('mysql2');
require('dotenv').config();

var pool = mysql.createPool({
  host: process.env.DBHOST,
  port: process.env.DBPORT,
  user: process.env.DBUSERNAME,
  password: process.env.DBPASS,
  database: process.env.DBNAME,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
});

exports.pool = pool;
