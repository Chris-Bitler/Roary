/**
 * Get chrono custom in EST
 */
import * as chrono from 'chrono-node';
import { ParsingResult } from 'chrono-node/dist/results';

export const getChronoCustom = () => {
    const custom = new chrono.Chrono();
    custom.refiners.push({
        refine: (context, results): ParsingResult[] => {
            results.forEach((result) => {
                result.start.imply('timezoneOffset', -300);
                result.end && result.end.imply('timezoneOffset', -300);
            });
            return results;
        }
    });

    return custom;
};