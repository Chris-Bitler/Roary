import {ExtendedSlashCommand} from './ExtendedSlashCommand';
import {Client, Guild} from 'discord.js';
import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create';
import {Setting} from "../models/Setting";

/**
 * Moderation slash command
 */
export class SettingCommand extends ExtendedSlashCommand {
    client: Client

    /**
     * Create a new instance of the setting slash command
     * @param client The discord.js client
     * @param creator  The slash creator instance
     */
    constructor(client: Client, creator: SlashCreator) {
        super(creator, {
            name: 'setting',
            description: 'Setting Command',
            requiredPermissions: ['ADMINISTRATOR'],
            options: [{
                type: CommandOptionType.SUB_COMMAND,
                name: 'set',
                description: 'Set a setting',
                options: [{
                    type: CommandOptionType.STRING,
                    name: 'key',
                    description: 'The key of the setting',
                    required: true
                }, {
                    type: CommandOptionType.STRING,
                    name: 'value',
                    description: 'The setting value',
                    required: true,
                }]
            }, {
                type: CommandOptionType.SUB_COMMAND,
                name: 'get',
                description: 'Get a setting',
                options: [{
                    type: CommandOptionType.STRING,
                    name: 'key',
                    description: 'The key of the setting',
                    required: true
                }]
            }]
        });
        this.client = client;
    }

    /**
     * Run the command
     * @param context The command context
     */
    async run(context: CommandContext) {
        const { guild, channel } = this.getGuildChannel(this.client, context);
        if (!guild || !channel) {
            context.send('This command must be used in a text channel in a discord server.', { ephemeral: true });
            return;
        }
        const hasPermission = this.hasPermission(context);
        if (hasPermission) {
            // context.subcommands is sometimes empty even if subcommand used
            // use first option instead
            const type = Object.keys(context?.options)?.[0] ?? null;
            switch (type) {
                case 'get':
                    await this.getSetting(guild, context);
                    break;
                case 'set':
                    await this.setSetting(guild, context);
                    break;
                default:
                    break;
            }
        }
    }

    /**
     * Get the value of a setting
     * @param {Guild} guild - The guild to get the setting for
     * @param {CommandContext} context - the command context
     */
    async getSetting(guild: Guild, context: CommandContext) {
        const getOptions = context.options.get;
        if (typeof getOptions !== 'object')
            return;
        const key = getOptions.key as string;
        const setting = await Setting.findOne({
            where: {
                serverId: guild.id,
                key
            }
        });
        if (setting) {
            context.send(`${key}'s value is ${setting.value}`, { ephemeral: true });
        } else {
            context.send(`${key} doesn't exist`, { ephemeral: true });
        }
    }

    /**
     * Set the value of a setting
     * @param {Guild} guild - The guild to get the setting for
     * @param {string} key - The key of the setting to get
     * @param {CommandContext} context - the command context
     */
    async setSetting(guild: Guild, context: CommandContext) {
        const setOptions = context.options.set;
        if (typeof setOptions !== 'object')
            return;
        const key = setOptions.key as string;
        const value = setOptions.value as string;
        const setting = await Setting.findOrCreate({
            where: {
                serverId: guild.id,
                key,
            }, defaults: {
                serverId: guild.id,
                key,
                value: value
            }
        });
        if (setting) {
            await Setting.update({
                value: value
            }, {
                where: {
                    key,
                    serverId: guild.id
                }
            });
            context.send(`${key} was updated with value ${value}`, { ephemeral: true });
        } else {
            context.send(`${key} created with value ${value}`, { ephemeral: true });
        }
    }
}