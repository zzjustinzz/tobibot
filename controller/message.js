'use strict';

var Client = require('node-rest-client').Client;
var restClient = new Client();
var config = require('../config/config.json');
var apiaiApp = require('apiai')(config.API_AI_CLIENT_ACCESS_TOKEN);

//https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-echo
function handleEcho(messageId, appId, metadata) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s", messageId, appId, metadata);
}

exports.sendMessage = function(event) {
    let senderID = event.sender.id;
    let recipientID = event.recipient.id;
    let messageTimestamp = event.timestamp;
    let message = event.message;

    let isEcho = message.is_echo;
    let messageId = message.mid;
    let appId = message.app_id;
    let metadata = message.metadata;

    // You may get a text or attachment but not both
    let messageText = message.text;
    let messageAttachments = message.attachments;
    let quickReply = message.quick_reply;

    if (isEcho) {
        handleEcho(messageId, appId, metadata);
        return;
    }

    if (messageText) {
        //send message to api.ai
        sendToApiAi(senderID, messageText);
    }

    let apiai = apiaiApp.textRequest(messageText, {
        sessionId: config.FB_VERIFY_TOKEN // use any arbitrary id
    });

    apiai.on('response', (response) => {
        // Got a response from api.ai. Let's POST to Facebook Messenger
        let aiText = response.result.fulfillment.speech;
        let args = {
            headers: { "Content-Type": "application/json" },
            parameters: { access_token: config.FB_PAGE_TOKEN },
            data: {
                recipient: { id: senderID },
                message: { text: aiText }
            }
        };


        restClient.post('https://graph.facebook.com/v2.10/me/messages', args, function(data, response) {

            //console.log(data);
            //console.log(response.status);
        }).on('error', function(err) {
            console.log('Error sending message: ', error);
        });
    });

    apiai.on('error', (error) => {
        console.log(error);
    });

    apiai.end();
};