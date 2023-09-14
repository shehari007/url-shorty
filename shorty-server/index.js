const express = require("express");
const form = require("./api/product");
const invokeURL = require("./api/invokeURL");
var cors = require('cors');
const app = express();
const bodyParser = require('body-parser')
app.use(express.json());
app.use(bodyParser.json());
const corsOptions = {
  origin: ['https://syb-profile.vercel.app', 'http://localhost:3000'], // Replace with your allowed domain
  methods: 'POST, GET',
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use("/api/url-shorty", form);

app.use("/co/:params", (req, res, next) => {

  const paramsValue = req.params.params;
  req.paramsValue = paramsValue;

  paramsValue.length === 5 ? next() : res.status(403).send('INVALID LINK REQUEST');
});
app.use("/co/:params", invokeURL);
app.use("/api/url-shorty", form);
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running in port ${PORT}`));
