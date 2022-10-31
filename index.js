const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 3001

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }))

app.listen(port, function () {
    console.log(`App running on port ${port}`);
})