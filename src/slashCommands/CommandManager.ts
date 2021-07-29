import {Command} from "../types/Command";
import {ApplicationCommandData, Client} from 'discord.js'

export const registerCommands = async (client: Client, commands: Command[]) => {
        const applicationCommands: ApplicationCommandData[] = [];
        commands.forEach((command) => applicationCommands.push(command.COMMAND_DATA));
        await client.application?.commands.set(applicationCommands);
        console.log("Registered commands");
}