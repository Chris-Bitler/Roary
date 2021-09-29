/**
 * Get chrono custom in EST
 */
import * as chrono from 'chrono-node';

export const parseDateTimeInput = (str: string) => {
    const chronoInstance = new chrono.Chrono();
    let parsedDate = chronoInstance.parseDate(str);
    if (!parsedDate) {
        parsedDate = chronoInstance.parseDate(`${str} from now`);
    }

    return parsedDate;
}