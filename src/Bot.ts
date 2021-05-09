// Fixes bug in sequelize that returns bigint as string
import * as pg from 'pg';
import * as dotenv from 'dotenv';
import {
    Client, Guild,
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
import { Sequelize } from "sequelize-typescript";
import {Ban} from "./models/Ban";
import {Kick} from "./models/Kick";
import {Mute} from "./models/Mute";
import {Warn} from "./models/Warn";
import {Setting} from "./models/Setting";
import {SettingCommand} from "./slashCommands/Setting";
import {KickCommand} from "./slashCommands/Kick";
import {BanCommand} from "./slashCommands/Ban";
import {MuteCommand} from "./slashCommands/Mute";
import {UnmuteCommand} from "./slashCommands/Unmute";
import {WarnCommand} from "./slashCommands/Warn";
import {MuteService} from "./service/MuteService";
import {BanService} from "./service/BanService";

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
            .registerCommand(new SettingCommand(client, creator))
            .registerCommand(new KickCommand(client, creator))
            .registerCommand(new BanCommand(client, creator))
            .registerCommand(new MuteCommand(client, creator))
            .registerCommand(new UnmuteCommand(client, creator))
            .registerCommand(new WarnCommand(client, creator))
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
    models: [Mute, Kick, Ban, Warn, Setting],
    ssl: true,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        }
    }
});
sequelize.sync();

client.login(process.env.BOT_TOKEN);

client.on('ready', () => {
    BanService.getInstance().loadBans();
    MuteService.getInstance().loadMutes();
});

client.on('guildMemberAdd', (member: GuildMember) => MuteService.getInstance().handleUserRejoin(member));
client.on('guildBanRemove', (guild: Guild, user: User) => BanService.getInstance().unbanUser(user.id, guild.id));

process.on('uncaughtException', function (err) {
});

export { client };