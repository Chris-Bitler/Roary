import {ApplicationCommandData, Channel, CommandInteraction, Guild, User} from "discord.js";
import {ApplicationCommandOptionType} from "discord-api-types";

type runFn = (interaction: CommandInteraction) => Promise<void>;
export interface Command {
    COMMAND_DATA: ApplicationCommandData
    REQUIRED_PERMISSION: bigint
    run: runFn
}

export interface CommandInitDataValid {
    user: User,
    guild: Guild,
    channel: Channel
}

export type CommandInitData = CommandInitDataValid