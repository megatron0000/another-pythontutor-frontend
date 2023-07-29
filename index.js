const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.static("frontend"));

const port = process.env.PORT || 8123;

app.listen(port, () => console.log(`listening on ${port}`));
