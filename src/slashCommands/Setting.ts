import { Collection, CommandInteraction, CommandInteractionOption, Guild, Permissions } from 'discord.js';
import {Setting} from "../models/Setting";
import {Command} from "../types/Command";
import {checkPermissions, getCommandInitData, getCommandOption, OPTION_TYPES} from "../util/CommandUtils";

/**
 * Moderation slash command
 */
export class SettingCommand implements Command {
    COMMAND_DATA = {
        name: 'rsetting',
        description: 'Setting Command',
        options: [{
            type: OPTION_TYPES.SUB_COMMAND,
            name: 'set',
            description: 'Set a setting',
            options: [{
                type: OPTION_TYPES.STRING,
                name: 'key',
                description: 'The key of the setting',
                required: true
            }, {
                type: OPTION_TYPES.STRING,
                name: 'value',
                description: 'The setting value',
                required: true,
            }]
        }, {
            type: OPTION_TYPES.SUB_COMMAND,
            name: 'get',
            description: 'Get a setting',
            options: [{
                type: OPTION_TYPES.STRING,
                name: 'key',
                description: 'The key of the setting',
                required: true
            }]
        }]
    }
    REQUIRED_PERMISSION = Permissions.FLAGS.ADMINISTRATOR

    /**
     * Run the command
     * @param interaction The command interaction
     */
    async run(interaction: CommandInteraction) {
        const initData = getCommandInitData(interaction);
        if (!initData) {
            await interaction.reply({ content: 'This command must be used in a text channel in a discord server.', ephemeral: true })
            return;
        }
        const { guild, user } = initData;
        const hasPermission = checkPermissions(guild, user, this.REQUIRED_PERMISSION);
        if (hasPermission) {
            // context.subcommands is sometimes empty even if subcommand used
            // use first option instead
            const isGet = interaction.options.get('get');
            const isSet = interaction.options.get('set');
            if (isGet) {
                await this.getSetting(guild, interaction);
            } else if (isSet) {
                await this.setSetting(guild, interaction);
            }
        }
    }

    /**
     * Get the value of a setting
     * @param guild - The guild to get the setting for
     * @param interaction - the command interaction
     */
    async getSetting(guild: Guild, interaction: CommandInteraction) {
        const getOptions = getCommandOption(interaction.options.get('get')) as Collection<string, CommandInteractionOption>;
        if (typeof getOptions !== 'object')
            return;
        const key = getOptions.get('key')?.value;
        if (key) {
            const setting = await Setting.findOne({
                where: {
                    serverId: guild.id,
                    key
                }
            });
            if (setting) {
                await interaction.reply({ content: `${key}'s value is ${setting.value}`, ephemeral: true });
            } else {
                await interaction.reply({ content: `${key} doesn't exist`, ephemeral: true });
            }
        } else {
            await interaction.reply({ content: 'Please supply a key', ephemeral: true });
        }
    }

    /**
     * Set the value of a setting
     * @param guild - The guild to get the setting for
     * @param interaction - the command interaction
     */
    async setSetting(guild: Guild, interaction: CommandInteraction) {
        const setOptions = getCommandOption(interaction.options.get('set')) as Collection<string, CommandInteractionOption>;
        if (typeof setOptions !== 'object')
            return;
        const key = setOptions.get('key')?.value;
        const value = setOptions.get('value')?.value;
        if (key && value) {
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
                await interaction.reply({ content: `${key} was updated with value ${value}`, ephemeral: true });
            } else {
                await interaction.reply({ content: `${key} created with value ${value}`, ephemeral: true });
            }
        } else {
            await interaction.reply({ content: 'Please supply a key and value', ephemeral: true });
        }
    }
}