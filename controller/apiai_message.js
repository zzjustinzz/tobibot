'use strict';

var config = require('../config/config.json');
var apiAiService = require('apiai')(config.API_AI_CLIENT_ACCESS_TOKEN);
var fb_message = require('./fb_message');

var sendAction = function(recipientId, action) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: action
    };
    fb_message.callSendAPI(messageData);
};

var sendTextMessage = function(recipientId, text) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: text
        }
    }
    fb_message.callSendAPI(messageData);
};

var isDefined = function(obj) {
    if (typeof obj === 'undefined') {
        return false;
    }
    if (!obj) {
        return false;
    }
    return obj !== null;
};

var handleApiAiAction = function(sender, action, responseText, contexts, parameters) {
    switch (action) {
        default:
        //unhandled action, just send back the text
            sendTextMessage(sender, responseText);
    }
};

var handleApiAiResponse = function(sender, response) {
    let responseText = response.result.fulfillment.speech;
    let responseData = response.result.fulfillment.data;
    let messages = response.result.fulfillment.messages;
    let action = response.result.action;
    let contexts = response.result.contexts;
    let parameters = response.result.parameters;

    sendAction(sender, 'typing_off');

    if (isDefined(messages) && (messages.length === 1 && messages[0].type !== 0 || messages.length > 1)) {
        let timeoutInterval = 1100;
        let previousType;
        let cardTypes = [];
        let timeout = 0;
        for (var i = 0; i < messages.length; i++) {
            if (previousType === 1 && (messages[i].type !== 1 || i === messages.length - 1)) {
                timeout = (i - 1) * timeoutInterval;
                setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
                cardTypes = [];
                timeout = i * timeoutInterval;
                setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
            } else if (messages[i].type == 1 && i == messages.length - 1) {
                cardTypes.push(messages[i]);
                timeout = (i - 1) * timeoutInterval;
                setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
                cardTypes = [];
            } else if (messages[i].type == 1) {
                cardTypes.push(messages[i]);
            } else {
                timeout = i * timeoutInterval;
                setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
            }

            previousType = messages[i].type;

        }
    } else if (responseText === '' && !isDefined(action)) {
        //api ai could not evaluate input.
        console.log('Unknown query' + response.result.resolvedQuery);
        sendTextMessage(sender, "I'm not sure what you want. Can you be more specific?");
    } else if (isDefined(action)) {
        handleApiAiAction(sender, action, responseText, contexts, parameters);
    } else if (isDefined(responseData) && isDefined(responseData.facebook)) {
        try {
            console.log('Response as formatted message' + responseData.facebook);
            sendTextMessage(sender, responseData.facebook);
        } catch (err) {
            sendTextMessage(sender, err.message);
        }
    } else if (isDefined(responseText)) {

        sendTextMessage(sender, responseText);
    }
};

exports.sendToApiAi = function(sender, text) {
    sendAction(sender, 'typing_on');
    let apiaiRequest = apiAiService.textRequest(text, {
        sessionId: config.FB_VERIFY_TOKEN
    });

    apiaiRequest.on('response', (response) => {
        if (isDefined(response.result)) {
            handleApiAiResponse(sender, response);
        }
    });

    apiaiRequest.on('error', (error) => console.error(error));
    apiaiRequest.end();
};