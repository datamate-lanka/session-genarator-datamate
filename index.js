const express = require('express');
const path = require('path');
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8000;

// Attempt to load pair.js safely
let code;
try {
    code = require('./pair');
} catch (err) {
    console.error("Error loading pair.js:", err);
    code = null;
}

// Set maximum event listeners
require('events').EventEmitter.defaultMaxListeners = 500;

// Use code routes if available
if (code) {
    app.use('/code', code);
}

// Serve pair.html file
app.use('/', async (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'));
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Export for Vercel (no app.listen)
module.exports = app;
