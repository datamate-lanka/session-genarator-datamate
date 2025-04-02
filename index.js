const express = require('express');
const app = express();
const bodyParser = require("body-parser");

const code = require('./pair'); 
require('events').EventEmitter.defaultMaxListeners = 500;

app.use('/code', code);

app.use('/', async (req, res) => {
    res.sendFile(__dirname + '/pair.html');
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

module.exports = app;
