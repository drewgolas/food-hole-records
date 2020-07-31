require("dotenv").config();
const Discord = require('discord.js');
const logger = require('winston');
const AWS = require("aws-sdk");
// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';


AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: "us-east-1"
});
const TABLE_NAME = 'food-hole';
const FOOD_HOLE_COLOR = 'cc6756';
// Initialize Discord Bot
const bot = new Discord.Client();

const toProperNoun = (name) => {
    return name[0].toUpperCase() + name.slice(1).toLowerCase();
}

bot.on('message', msg => {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    const { content, channel, author } = msg
    if (content.substring(0, 1) == '!') {
        const docClient = new AWS.DynamoDB.DocumentClient();
        let args = content.substring(1).split(' ');
        const cmd = args[0];
        const user = author.username;
        args = args.splice(1);
        switch(cmd) {
            case 'addKill':
                msg.delete();
                if(user !== "drewgolas" && user !== "justismercer")
                    return channel.send("Only the Occultant can update the official logbook");
                const name = args[0];
                if(!name || name.length <= 1) {
                    channel.send("Please provide a character to attribute a kill to");
                    break;
                }
                const count = args[1];
                const finalCount = count ? parseInt(count) : 1;

                const dbParams = {
                    TableName: TABLE_NAME,
                    Key: {
                        'name': name.toLowerCase()
                    },
                    UpdateExpression: "set kills = kills + :val",
                    ExpressionAttributeValues:{
                        ":val": finalCount
                    },
                    ReturnValues: "UPDATED_NEW"
                };
                return docClient.update(dbParams, (err, data) => {
                    if (err) {
                        channel.send("Sorry, I lost my pen.")
                    } else {
                        // {"Attributes":{"kills":3}}
                        const properName = toProperNoun(name);
                        const killPlural = Math.abs(finalCount) > 1 ? "kills" : "kill";
                        const killMessage = finalCount > 0 ? `Occultant logs: ${properName} has gained ${finalCount} ${killPlural}` :
                            `Occultant logs: ${properName} has lost ${Math.abs(finalCount)} ${killPlural}`;
                        const killChange = new Discord.MessageEmbed()
                            .setColor(FOOD_HOLE_COLOR)
                            .setTitle(killMessage);
                        channel.send(killChange);
                    }
                })
            case 'killMetrics':
                msg.delete();
                if(user !== "drewgolas" && user !== "justismercer")
                    return channel.send("Ask your Official Occultant to inspect his logbook.");
                const params = {
                    TableName: TABLE_NAME
                };
            
                docClient.scan(params, function (err, data) {
            
                    if (err) {
                        channel.send("Sorry, there's a smudge on the ledger.")
                    } else {
                        const { Items } = data;
                        let killInfo = "";
                        Items.forEach((character) => {
                            killInfo += `${toProperNoun(character.name)}: ${character.kills}\n`;
                        })
                        const quotaMessage = new Discord.MessageEmbed()
                            .setColor(FOOD_HOLE_COLOR)
                            .setTitle("Food Hole - Occultant logbook")
                            .setDescription(killInfo);
                        channel.send(quotaMessage);
                    }
                });
                break;
         }
     }
});

bot.login(process.env.BOT_TOKEN);
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in.');
});