const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require("body-parser");

__path = process.cwd();
const port = process.env.PORT || 8000;

let server = require('./qr');
let code = require('./pair');

require('events').EventEmitter.defaultMaxListeners = 500;

app.use(express.static(__path));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve Logo Image
app.get('/logo.png', (req, res) => {
    res.sendFile(path.join(__path, 'logo.png'));
});

// Routers for Backend Services
app.use('/qr', server);
app.use('/code', code);

// Frontend HTML Pages
app.use('/pair', async (req, res, next) => {
    res.sendFile(path.join(__path, 'pair.html'));
});

app.use('/', async (req, res, next) => {
    res.sendFile(path.join(__path, 'main.html'));
});

app.listen(port, () => {
    console.log(`📡 Connected on http://localhost:` + port);
});

module.exports = app;
