//process.env.NTBA_FIX_319 = 1;

const TelegramBot = require('node-telegram-bot-api'); //ES5
const fs = require('fs');
const { time } = require('console');

// token of the 'Xover3bot', given by the botfather
const TOKEN = '???';

// creation of the bot
const bot = new TelegramBot(TOKEN, { polling: true });

const TIME_BETWEEN_KICKS = 60; // 60 seconds
const MAX_VALUE_BEFORE_KICK = 3;  // 3/3 
const TIME_BEFORE_KICK = 10 // 10 seconds

/* contains infos (       
        counter: 0,
        user_to_kick: null,
        user_who_begins_the_kick: null,
        voters: [],
        timer: 0,
        time_between_kicks: TIME_BETWEEN_KICKS,
        max_value_before_kick: MAX_VALUE_BEFORE_KICK)   
    in each chat
    */
var chats = {};


// If you type '/help' on Telegram, it will display the following message
bot.onText(/\/help/, (msg) => {

    let help_msg = "Thanks for choosing me ! In order to properly use me, here is how I work.\n\n" +

        "First, type '/start' in the chat.\n" +
        "Then, to kick someone, type '/kick @atOfTheUserYouWantToKick\n\n" +

        "This will begin a vote to effectively kick TheUserYouWantToKick. " +
        "2 buttons will appear to everyone in the chat. " +
        "Each user has a unique choice : either upvote or downvote TheUserYouWantToKick. " +
        "If you upvote someone, a counter is increased. " +
        "If you downvote someone, the counter will decreased. " +
        "Once it gets to a certain value (3), TheUserYouWantToKick will be kicked _(if he is not an admin)_. " +
        "\nBut be warned ! If the counter gets to a negative value (-3), you are kicked !\n\n" +

        "_Note: A single vote process occurs at a time, meaning you have to kick someone before " +
        "kicking someone else. If nobody is kicked after a certain time (60 secondes), the bot will reset_'\n"
    bot.sendMessage(msg.chat.id, help_msg, { parse_mode: 'Markdown' })
})


bot.on('message', (msg) => {
    let chatId = msg.chat.id
    // Within this function, each time someone send a message, we catch it and analyse it


    // If the message contains 'hi' in the beginning of the sentence, answer
    var hi = 'hi';
    if (msg.text.toString().toLowerCase().indexOf(hi) === 0) {
        bot.sendMessage(chatId, "Hello dear " + msg.from.first_name);
    }

    // If the message contains 'bye' anywhere in the sentence, answer
    var bye = "bye";
    if (msg.text.toString().toLowerCase().includes(bye)) {
        bot.sendMessage(chatId, "Have a nice day " + msg.from.first_name);
    }

    // If the message only contains '/kick', show a message of help
    if (msg.text.toString().toLowerCase() === "/kick") {
        bot.sendMessage(chatId, "Please enter an username after the '/kick' with the following format :\n" +
            "'/kick @the_username_of_the_person_you_want_to_kick'")
    }

    // If the message contains 'log' anywhere in the sentence, show the contents of the variable chats
    var log = "log";
    if (msg.text.toString().toLowerCase().includes(log)) {
        console.log(chats)
        //console.log(bot.getChatMembersCount(chatId).resolve())
    }

    var admin = "admin";
    if (msg.text.toString().toLowerCase().includes(admin)) {
        bot.getChatAdministrators(chatId)
            .then((result) => {
                for (var i = 0, res_len = result.length; i < res_len; i++) {
                    if (!result[i].user.is_bot) {
                        bot.sendMessage(chatId, "@" + result[i].user.username + " is an admin")
                    }
                }
            })
            .catch((error) => {
                console.log(error.code);  // => 'ETELEGRAM'
                console.log(error.response.body);
                if (error.response.body.description.includes('private')) {
                    bot.sendMessage(chatId, "you are an admin")
                }

            })
    }

    /*
    var link = "link"
    if (msg.text.toString().toLowerCase().includes(link)) {
        bot.exportChatInviteLink(chatId)
        .then((result)=> bot.sendMessage(chatId, result))
        .catch((error)=> bot.sendMessage(chatId, error.response.body.description))
    }
    */


    // Each time someone write something, get info on this one
    // Infos of one people are stored in a json file
    let data = require('./data.json') // get the json file in js format
    // Add a new user to database and convert it into json format

    data["@" + msg.from.username] = {
        "id": msg.from.id,
        "username": "@" + msg.from.username,
        "first_name": msg.from.first_name
    }
    data = JSON.stringify(data)

    // write in the file
    fs.writeFile('data.json', data, function (error) {
        if (error) {
            console.log(error)
            bot.sendMessage(chatId, "Error : 'data.json' does not exist !")
        }
    })
})


// Send a picture to the chat
bot.onText(/\/sendpic/, (msg) => {
    bot.sendPhoto(msg.chat.id, "https://core.telegram.org/file/811140327/" +
        "1/zlN4goPTupk/9ff2f2f01c4bd1b013", { caption: "This is my father !" });
});


// First to be display, when the bot is added in a group
bot.onText(/\/start/, (msg) => {
    let chatId = msg.chat.id
    let username = msg.from.username
    var admins = []

    bot.getChatAdministrators(chatId)
        .then((result) => {
            for (var i = 0, res_len = result.length; i < res_len; i++) {
                if (!result[i].user.is_bot) {
                    admins.push(result[i].user.username)
                }
            }
        })
        .catch((error) => {
            // console.log(error.code);  // => 'ETELEGRAM'
            console.log(error.response.body);
            if (error.response.body.description.includes("private"));
            {
                admins.push(username);
                //console.log(username)
            }
            // TODO : check for error
        }).finally(() => {
            console.log(admins)
            console.log(username)

            if (admins.includes(username)) {
                let start_msg = "And so it begins !\n" +
                    "Here is a list of commands which might help you :\n" +
                    "- /help : display a text to help you use this bot\n" +
                    "- /kick @someone : begin a vote in order to kick a user"
                bot.sendMessage(chatId, start_msg)


                chats[chatId] = {
                    counter: 0,
                    user_to_kick: null,
                    user_who_begins_the_kick: null,
                    voters: [],
                    timer: 0,
                    pointer_to_reset_after_time_between_kicks: null,
                    time_between_kicks: TIME_BETWEEN_KICKS,
                    max_value_before_kick: MAX_VALUE_BEFORE_KICK,
                    time_before_kick: TIME_BEFORE_KICK
                }
            }
            else {
                bot.sendMessage(chatId, "Only admins can do this, sorry :/")
            }
        })
});

function reset(chatId) {
    // reset the variables inside of each chat
    chats[chatId] = {
        counter: 0,
        user_to_kick: null,
        user_who_begins_the_kick: null,
        voters: [],
        timer: 0,
        pointer_to_reset_after_time_between_kicks: null,
        time_between_kicks: chats[chatId].time_between_kicks,
        max_value_before_kick: chats[chatId].max_value_before_kick,
        time_before_kick: chats[chatId].time_before_kick
    };
}

// begin to kick someone
bot.onText(/\/kick (.+)/, (msg, match) => {
    // If someone type '/kick something', use this method

    let chatId = msg.chat.id

    if (!Object.keys(chats).includes(chatId.toString())) {
        // We need to have the var 'chats' not empty to be able to use it
        bot.sendMessage(chatId, "Error : please use the '/start' command before")
    }
    else { // Here we have the var 'chats' full of crispy infos

        // If someone has already begun a kick before, is the elapsed time greater the the time between two kicks
        if ((Date.now() - chats[chatId].timer) / 1000 < chats[chatId].time_between_kicks) {
            let seconds_remaining = parseInt(chats[chatId].time_between_kicks - (Date.now() - chats[chatId].timer) / 1000)
            bot.sendMessage(chatId, "Please wait " + seconds_remaining + "s, before starting a new kick")
        }
        else {
            // reinitialize
            reset(chatId);
            chats[chatId].pointer_to_reset_after_time_between_kicks = setTimeout(() => {
                bot.sendMessage(chatId, "A new kick can be done !")
                reset(chatId)
            },
                chats[chatId].time_between_kicks * 1000
            )

            // change the timer, the one to be kicked, and the user who begins the kick
            chats[chatId].timer = Date.now()
            chats[chatId].user_to_kick = match[1];
            chats[chatId].user_who_begins_the_kick = "@" + msg.from.username;

            let data = require('./data.json')  // load the database

            // If the user to kick exist in the database, then proceed
            if (Object.keys(data).includes(chats[chatId].user_to_kick)) {

                // If the user is  in the database AND in the Chat, then proceed
                bot.getChatMember(chatId, data[chats[chatId].user_to_kick].id).then(() => {

                    // Display 2 buttons, one to increased the counter, the other to decreased the counter
                    // See bot.on('callback_query')
                    var options = {
                        reply_markup: JSON.stringify({
                            inline_keyboard: [
                                [{
                                    text: 'up',
                                    callback_data: +1
                                }],
                                [{
                                    text: 'down',
                                    callback_data: -1
                                }]
                            ],
                            remove_keyboard: true
                        }),
                    };

                    bot.sendMessage(chatId, "Ready to kick some asses !", options);

                }).catch((error) => { // can't kick a person which is not in the chat
                    console.log(error.code);  // => 'ETELEGRAM'
                    console.log(error.response.body);
                    bot.sendMessage(chatId, error.response.body.description);  // maybe this person is not is the chat (but still exist in the databease)
                });
            }
            else { // The user to kick is not in the database or do not exist
                bot.sendMessage(chatId, "Please enter a correct @ (case sensitive).\n" +
                    "_Note: it's also possible that this user is not in the database._",
                    { parse_mode: 'Markdown' });
            }
        }
    }
})


// what is the button that the user clicked on
bot.on('callback_query', (callbackQuery) => {
    let chatId = callbackQuery.message.chat.id;

    if (chats[chatId].user_to_kick != null) {
        const delta = callbackQuery.data;  // +1 or -1, according to what the user pressed
        const voter = callbackQuery.from.username;

        // If the voters has not already vote
        if (!chats[chatId].voters.includes(voter)) {
            chats[chatId].counter += parseInt(delta, 10);

            let ratio_and_vote = chats[chatId].counter + "/" + chats[chatId].max_value_before_kick + ", by " + voter
            bot.sendMessage(chatId, ratio_and_vote);

            // It the counter reaches his max value, the user_to_kick is kicked
            if (chats[chatId].counter === chats[chatId].max_value_before_kick) {
                let remaining_time_message = "I'm going to kick " + chats[chatId].user_to_kick + " in " + chats[chatId].time_before_kick + " secondes"
                bot.sendMessage(chatId, remaining_time_message);

                clearTimeout(chats[chatId].pointer_to_reset_after_time_between_kicks)
                setTimeout(() => kick(chatId, chats[chatId].user_to_kick), chats[chatId].time_before_kick * 1000);
            }

            // It the counter reaches his min value, the user_who_begins_the_kick is kicked
            if (chats[chatId].counter === -chats[chatId].max_value_before_kick) {
                bot.sendMessage(chatId, "I'm going to kick " + chats[chatId].user_who_begins_the_kick);
                kick(chatId, chats[chatId].user_who_begins_the_kick);
            }

            // add the voter to those who already vote
            chats[chatId].voters.push(voter);
        }
        else { // It means the voters has already vote
            bot.sendMessage(chatId, "Sorry @" + voter + ", but you have already voted");
        }
    }
})


// This is how to kick someone, handling error
function kick(chatId, person) {

    let data = require('./data.json');

    if (Object.keys(data).includes(person)) {
        // This person is indeed in the database, but is she in the Chat ?

        bot.getChatMember(chatId, data[person].id).then(() => {

            bot.kickChatMember(chatId, data[person].id).then(() => {
                bot.sendMessage(chatId, "Already done !");
                setTimeout(() => {
                    bot.unbanChatMember(chatId, data[person].id);

                    bot.exportChatInviteLink(chatId)
                        .then((result) => bot.sendMessage(data[person].id, "Hi ! Here is a link to join us" + result))
                        .catch((error) => bot.sendMessage(chatId, error.response.body.description))
                        .then(() => bot.sendMessage(chatId, person + "is now unban !"))
                }
                    , 10000);



            }).catch((error) => { // can't kick an admin or chat owner
                console.log(error.code);  // => 'ETELEGRAM'
                console.log(error.response.body);
                bot.sendMessage(chatId, error.response.body.description)
                bot.sendMessage(chatId, "Sorry, I have no right to do this on an admin :(" +
                    "\nChat owner must do the job himself !") // TODO : get the chat owner to ping him
            });

        }).catch((error) => { // can't kick a person which is not in the chat
            console.log(error.code);  // => 'ETELEGRAM'
            console.log(error.response.body);
            bot.sendMessage(chatId, error.response.body.description);  // maybe this person is not is the chat (but still exist in the databease)
        });

    }
    else {
        bot.sendMessage(chatId, "Please enter a correct @ (case sensitive).\n" +
            "_Note: it's also possible that this user is not in the database._",
            { parse_mode: 'Markdown' });
    }

    clearTimeout(chats[chatId].pointer_to_reset_after_time_between_kicks)
    reset(chatId)
}


bot.onText(/\/set_time_between_kicks (.+)/, (msg, match) => {
    numberIsOk(match[1], msg.chat.id, msg.from.username, 15, 300, 'time_between_kicks')
})


bot.onText(/\/set_max_value_before_kick (.+)/, (msg, match) => {
    numberIsOk(match[1], msg.chat.id, msg.from.username, 1, 200000, 'max_value_before_kick')
})


bot.onText(/\/set_time_before_kick (.+)/, (msg, match) => {
    numberIsOk(match[1], msg.chat.id, msg.from.username, 1, 30, 'time_before_kick')
})


function numberIsOk(number, chatId, username, borneMin, borneMax, var_name) {
    // set : acces only granted to admin
    var admins = []

    bot.getChatAdministrators(chatId)
        .then((result) => {
            for (var i = 0, res_len = result.length; i < res_len; i++) {
                if (!result[i].user.is_bot) {
                    admins.push(result[i].user.username)
                }
            }
        })
        .catch((error) => {
            console.log(error.response.body);
            if (error.response.body.description.includes("private"));
            {
                admins.push(username);
            }
            // TODO : check for error
        }).finally(() => {
            // console.log(admins)
            if (admins.includes(username)) {
                if (!Object.keys(chats).includes(chatId.toString())) {
                    bot.sendMessage(chatId, "Error : please use the '/start' command before")
                }
                else {
                    if (isNaN(number)) {
                        bot.sendMessage(chatId, "Please enter a number")
                    }
                    else {
                        number = parseInt(number)
                        if (number < borneMin || number > borneMax) {
                            bot.sendMessage(chatId, "Please enter an integer > " + borneMin + " and < " + borneMax)
                        }
                        else {
                            chats[chatId][var_name] = number
                            bot.sendMessage(chatId, "Succesfully change " + var_name)
                        }
                    }
                }
            }
            else {
                bot.sendMessage(chatId, "You do not have the right to do so !")
            }
        })

}


bot.on("new_chat_members", function (msg) {
    bot.sendMessage(msg.chat.id, "Hi new comers !")
})


bot.on('polling_error', (error) => {
    console.log(error.code);  // => 'EFATAL'
    for (var chatId in Object.keys(chats)) {
        bot.sendMessage(chatId, "Fatal Error ! Bot will shut down ");
    }

    console.log("Fatal Error ! Bot will shut down")
    //bot.stopPolling()
});


bot.on('webhook_error', (error) => {
    console.log(error.code);  // => 'EFATAL'
    for (var chatId in Object.keys(chats)) {
        bot.sendMessage(chatId, "Fatal Error ! Bot will shut down ");
    }

    console.log("Fatal Error ! Bot will shut down")
    //bot.stopPolling()
});


bot.onText(/\/thanks_to/, (msg) => {

    let thanks_msg = "Thanks for using the Xover3Bot !\n" +
        "It has been designed by @perefou, and tested by :\n" +
        "- @Thorgalsson\n" +
        "- @Gwendur\n" +
        "- @Lolabl\n" +
        "- @Papa_L\n" +
        "- @Houlenn\n" +
        "- @Champignac"
    bot.sendMessage(msg.chat.id, thanks_msg)
})

// END