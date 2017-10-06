'use strict';

var config = require('../config/config.json');
var Client = require('node-rest-client').Client;
var restClient = new Client();

exports.callSendAPI = function(messageData) {
    return new Promise((resolve, reject) => {
        console.log(messageData);
        let args = {
            headers: { "Content-Type": "application/json" },
            parameters: { access_token: config.FB_PAGE_TOKEN },
            data: messageData
        };

        restClient.post('https://graph.facebook.com/v2.10/me/messages', args, function(data, response) {
            if (response.statusCode == 200) {
                var recipientId = data.recipient_id;
                var messageId = data.message_id;

                if (messageId) {
                    resolve("Successfully sent message with id %s to recipient %s", messageId, recipientId);
                } else {
                    resolve("Successfully called Send API for recipient %s", recipientId);
                }
            } else {
                reject('Error sending message: ', response.statusCode);
            }
        }).on('error', function(err) {
            reject('Error sending message: ', err);
        });
    });
};