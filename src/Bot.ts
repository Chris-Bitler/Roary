// Fixes bug in sequelize that returns bigint as string
import * as pg from 'pg';
import * as dotenv from 'dotenv';
import {
    Client,
    GuildMember,
    Intents,
    Message,
    MessageReaction,
    PartialMessage,
    PartialUser,
    TextChannel,
    User,
    WSEventType
} from 'discord.js';
import {GatewayServer, SlashCreator} from "slash-create";
import {Sequelize} from "sequelize-typescript";
pg.defaults.parseInt8 = true;

dotenv.config();

const client = new Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    ws: {
        intents: Intents.ALL
    }
});

const creator = new SlashCreator({
    applicationID: process.env.BOT_APP_ID ?? '',
    publicKey: process.env.BOT_PUBLIC_KEY ?? '',
    token: process.env.BOT_TOKEN ?? ''
});

(async () => {
    try {
        await creator
            .syncCommands();
    } catch (e) {
        console.error(e);
    }
})();

creator.withServer(
    new GatewayServer((handler) =>
        client.ws.on(<WSEventType>'INTERACTION_CREATE', handler)
    )
);

const sequelize: Sequelize = new Sequelize(process.env.DATABASE_URL as string, {
    dialect: 'postgres',
    logging: false,
    models: [
        ConfigProperty,
        Emoji,
        EmojiToRole,
        Punishment,
        Alarm,
        MailConfig,
        CensorEntry,
        StarboardedMessage
    ],
    ssl: true,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        }
    }
});
sequelize.sync();