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

var pool = mysql.createPool({
  host: 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '2Zk8J2hSn8AHX9g.root',
  password: '5TipJShDTbbsTqH4',
  database: 'shorty-db',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
});

exports.pool = pool;
