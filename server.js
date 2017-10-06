'use strict'

var express = require('express'),
    app = express(),
    port = process.env.PORT || 5000,
    bodyParser = require('body-parser');

var config = require('./config/config.json');
var message = require('./controller/message');

switch (process.env.NODE_ENV) {
    case 'staging':
        port = config.env.staging.port;
        break;
    case 'production':
        port = config.env.production.port;
        break;
    default:
        port = config.env.development.port;
        break;
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    next();
}).options('*', function(req, res, next) {
    res.end();
});

app.listen(port);

console.log('Tobicase bot server started on: ' + port);

// Index route
app.get('/', function(req, res) {
    res.send('Hello world, I am Tobi.')
})

/* For Facebook Validation */
// for Facebook verification
app.get('/webhook/', function(req, res) {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === config.FB_VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
    }
});

/* Handling all messenges */
app.post('/webhook', (req, res) => {
    if (req.body.object === 'page') {
        req.body.entry.forEach((entry) => {
            entry.messaging.forEach((event) => {
                if (event.message) {
                    message.sendMessage(event);
                } else {
                    //console.log("Webhook received unknown messagingEvent: ", event);
                }
            });
        });
        res.status(200).end();
    }
});