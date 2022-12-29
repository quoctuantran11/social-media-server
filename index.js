const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require('cookie-parser');
const auth = require('./middleware/auth');
const corsOptions = require('./config/corsOptions')
const credentials = require('./middleware/credentials')

require('dotenv').config({override: true });
const app = express();
const port = process.env.PORT || 3001;

mongoose.connect(process.env.APP_MONGO_DATABASE_URL, 
    { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Mongo atlas connected"))
    .catch((e) => {
        console.log(`Error while connecting. ${e}`);
        process.exit(1);
    }) 

app.use(credentials);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }))

app.use("/", require("./routes/authRoute"));

app.use(auth)

// app.use(express.static(__dirname + 'client/public'));

app.listen(port, function () {
    console.log(`Server running on port ${port}`);
})