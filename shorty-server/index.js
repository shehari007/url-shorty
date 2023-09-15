const express = require("express");
const generate = require("./api/generate");
const stats = require("./api/shortyStats");
const invokeURL = require("./api/invokeURL");
const contact = require("./api/contact");
const report = require("./api/report");
require('dotenv').config();
var cors = require('cors');
const app = express();
const bodyParser = require('body-parser')
app.use(express.json());
app.use(bodyParser.json());

const corsOptions = {
  origin: ['http://localhost:3000'], 
  methods: 'GET, POST',
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use("/api/shorty-url/generate", generate);

app.use("/api/shorty-url/stats", stats);
app.use("/api/shorty-url/contact", contact);
app.use("/api/shorty-url/report", report);
app.use("/co/:params", (req, res, next) => {

  const paramsValue = req.params.params;
  req.paramsValue = paramsValue;
  paramsValue.length === 5 ? next() : res.status(403).send('INVALID LINK REQUEST');
});
app.use("/co/:params", invokeURL);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running in port ${PORT}`));
