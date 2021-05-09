import { Column, Model, Table } from 'sequelize-typescript';

/**
 * Class containing setting key/values and the server they belong to
 */
@Table
export class Setting extends Model {
    @Column
    serverId!: string;

    @Column
    key!: string;

    @Column
    value!: string;

    static getSetting = async (property: string, serverId: string) => {
        return Setting.findOne({
            where: {
                key: property,
                serverId
            }
        });
    };
}
