'use strict';

var config = require('../config/config.json');
var Client = require('node-rest-client').Client;
var restClient = new Client();

exports.callSendAPI = function(messageData) {
    let aiText = response.result.fulfillment.speech;
    let args = {
        headers: { "Content-Type": "application/json" },
        parameters: { access_token: config.FB_PAGE_TOKEN },
        data: messageData
    };

    restClient.post('https://graph.facebook.com/v2.10/me/messages', args, function(data, response) {
        if (response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s",
                    messageId, recipientId);
            } else {
                console.log("Successfully called Send API for recipient %s",
                    recipientId);
            }
        } else {
            console.log('Error sending message: ', response.statusCode);
        }
    }).on('error', function(err) {
        console.log('Error sending message: ', err);
    });
};