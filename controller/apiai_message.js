'use strict';

var config = require('../config/config.json');
var apiAiService = require('apiai')(config.API_AI_CLIENT_ACCESS_TOKEN);
var fb_message = require('./fb_message');

var isDefined = function(obj) {
    if (typeof obj === 'undefined') {
        return false;
    }
    if (!obj) {
        return false;
    }
    return obj !== null;
};

var sendAction = function(recipientId, action) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: action
    };
    return fb_message.callSendAPI(messageData);
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
    return fb_message.callSendAPI(messageData);
};

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendQuickReply(recipientId, text, replies, metadata) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: text,
            metadata: isDefined(metadata) ? metadata : '',
            quick_replies: replies
        }
    };

    return fb_message.callSendAPI(messageData);
}

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId, imageUrl) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "image",
                payload: {
                    url: imageUrl
                }
            }
        }
    };

    return fb_message.callSendAPI(messageData);
}

var handleApiAiAction = function(sender, action, responseText, contexts, parameters) {
    switch (action) {
        default:
        //unhandled action, just send back the text
            sendTextMessage(sender, responseText);
    }
};

var formatMessage = function(messages) {
    var messages = messages.map(function(message) {
        if (message.type === 1) {
            var buttons = message.buttons.map(function(button) {
                let isLink = (button.postback.substring(0, 4) === 'http');
                if (isLink) {
                    return {
                        "type": "web_url",
                        "title": button.text,
                        "url": button.postback
                    }
                } else {
                    return {
                        "type": "postback",
                        "title": button.text,
                        "payload": button.postback
                    }
                }
            });
            message = {
                type: message.type,
                platform: message.platform,
                payload: {
                    facebook: {
                        attachment: {
                            type: 'template',
                            payload: {
                                template_type: 'generic',
                                elements: [{
                                    "title": message.title,
                                    "image_url": message.imageUrl,
                                    "subtitle": message.subtitle,
                                    "buttons": buttons
                                }]
                            }
                        }
                    }
                }
            };
        }
        if (message.type === 2) {
            var replies = message.replies.map(function(reply) {
                return {
                    content_type: 'text',
                    title: reply,
                    payload: reply
                }
            });
            message = {
                type: message.type,
                platform: message.platform,
                text: message.title,
                quick_replies: replies
            }
        }
        return message;
    });
    return messages;
};

var groupMessages = function(messages) {
    var groupMessages = [];
    for (var i = 0; i < messages.length; i++) {
        if (i !== 0) {
            if ((messages[i]['type'] === messages[i - 1]['type']) && (messages[i]['type'] === 1 || messages[i]['type'] === 4)) {
                groupMessages[i - 1].payload.facebook.attachment.payload.elements.push(messages[i].payload.facebook);
            } else {
                groupMessages.push(messages[i]);
            }
        } else {
            groupMessages.push(messages[i]);
        }
    }
    return groupMessages;
};

var handleMessage = function(message, sender) {

    switch (message.type) {
        case 0: //text
            return sendTextMessage(sender, message.speech);
            break;
        case 1:
        case 4:
            // custom payload
            var messageData = {
                recipient: {
                    id: sender
                },
                message: message.payload.facebook
            };

            return fb_message.callSendAPI(messageData);
            break;
        case 2: //quick replies
            return sendQuickReply(sender, message.text, message.quick_replies);
            break;
        case 3: //image
            return sendImageMessage(sender, message.imageUrl);
            break;
    }
}

var handleApiAiResponse = function(sender, response) {
    let responseText = response.result.fulfillment.speech;
    let responseData = response.result.fulfillment.data;
    let messages = response.result.fulfillment.messages;
    let action = response.result.action;
    let contexts = response.result.contexts;
    let parameters = response.result.parameters;

    sendAction(sender, 'typing_off');

    if (isDefined(messages) && (messages.length === 1 && messages[0].type !== 0 || messages.length > 1)) {
        /* let timeoutInterval = 1100;
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

        } */
        var formatMessages = formatMessage(messages);
        var groupedMessages = groupMessages(formatMessages);
        groupedMessages.reduce((promise, item) => {
            const waitForHandleMsg = new Promise(resolve => {
                promise
                    .then((result) => {
                        // Đợi nó handle message done
                        handleMessage(item, sender)
                            .then(resolve)
                    })
                    .catch(console.error);
            })
            return waitForHandleMsg;
        }, Promise.resolve());
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