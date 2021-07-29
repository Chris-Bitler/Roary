import {MuteService} from "./MuteService";
import {BanService} from "./BanService";
import {ActivePunishment} from "../types/Punishment";

/**
 * Service for queueing punishment undo-ing
 */
export class QueueService {
    punishmentUndoQueue: ActivePunishment[] = [];
    static instance: QueueService;

    /**
     * Get the instance of the service
     */
    public static getInstance() {
        if (!this.instance) {
            this.instance = new QueueService();
        }

        return this.instance;
    }

    /**
     * A punishment to the undo queue
     * @param punishment the punishment to remove
     */
    addToPunishmentUndoQueue(punishment: ActivePunishment) {
        this.punishmentUndoQueue.push(punishment);
    }

    /**
     * Tick the punishment undo queue
     */
    async tickPunishmentUndoQueue() {
        const punishmentToUndo = this.punishmentUndoQueue.pop();
        if (punishmentToUndo) {
            if (punishmentToUndo.type === 'mute') {
                await MuteService.getInstance().unmuteUser(punishmentToUndo.memberId, punishmentToUndo.guildId)
            } else if (punishmentToUndo.type === 'ban') {
                await BanService.getInstance().unbanUser(punishmentToUndo.memberId, punishmentToUndo.guildId);
            }
        }
    }
}