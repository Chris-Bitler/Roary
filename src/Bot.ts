// Fixes bug in sequelize that returns bigint as string
import * as pg from 'pg';
import * as dotenv from 'dotenv';
import {
    Client,
    GuildBan,
    GuildMember,
    Intents,
    MessageReaction,
    PartialUser,
    User,
} from 'discord.js';
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
import {QueueService} from "./service/QueueService";
import {ActionService} from "./service/ActionService";
import {ActionsCommand} from "./slashCommands/Actions";
import {registerCommands} from "./slashCommands/CommandManager";

pg.defaults.parseInt8 = true;

dotenv.config();

const client = new Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    intents: [
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_EMOJIS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ],
});

const commands = [
    new ActionsCommand(),
    new BanCommand(),
    new KickCommand(),
    new MuteCommand(),
    new SettingCommand(),
    new UnmuteCommand(),
    new WarnCommand()
]

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
    registerCommands(client, commands);
    setInterval(() => MuteService.getInstance().tickMutes(), 1000);
    setInterval(() => BanService.getInstance().tickBans(), 1000);
    setInterval(() => QueueService.getInstance().tickPunishmentUndoQueue(), 3000);
});

client.on('guildMemberAdd', (member: GuildMember) => MuteService.getInstance().handleUserRejoin(member));
client.on('guildBanRemove', async (ban: GuildBan) => {
    await BanService.getInstance().unbanUser(ban.user.id, ban.guild.id)
});
client.on('messageReactionAdd', async (reaction: MessageReaction, user: User | PartialUser) => {
    const userToUse = await user.fetch();
    if (reaction.me)
        return;
    const message = await reaction.message.fetch();
    if (message.embeds.length === 0)
        return;
    const success = await ActionService.getInstance().handleEmbedPage(message, reaction, message.embeds[0]);
    if (success)
        await reaction.users.remove(userToUse.id);
});

client.on('interactionCreate', (interaction) => {
   if (!interaction.isCommand()) return;
   const commandName = interaction.commandName;
   commands.forEach((command) => {
      if (command.COMMAND_DATA.name.toLowerCase() == commandName.toLowerCase()) {
          command.run(interaction);
      }
   });
});

process.on('uncaughtException', function (err) {
    console.log(err);
});

export { client };