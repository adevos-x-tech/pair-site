const express = require('express');
const app = express();
__path = process.cwd();
const bodyParser = require("body-parser");
const port = process.env.PORT || 8000;

const qrRouter = require('./qr');
const pairRouter = require('./pair');
const sessionRouter = require('./session');

require('events').EventEmitter.defaultMaxListeners = 500;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__path));

app.use('/qr', qrRouter);
app.use('/code', pairRouter);
app.use('/session', sessionRouter);

app.use('/pair', async (req, res) => {
    res.sendFile(__path + '/pair.html');
});

app.use('/', async (req, res) => {
    res.sendFile(__path + '/main.html');
});

app.listen(port, () => {
    console.log(`Connected on http://localhost:` + port);
});

module.exports = app;
