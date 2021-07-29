import { AllowNull, Column, DataType, Model, Table } from 'sequelize-typescript';

/**
 * Model representing a user punishment (mute)
 */
@Table
export class Mute extends Model {
    @Column
    userId!: string;

    @Column
    userName!: string;

    @Column
    punisherId!: string;

    @Column
    punisherName!: string;

    @AllowNull
    @Column
    reason!: string;

    @AllowNull
    @Column(DataType.BIGINT)
    clearTime!: number;

    @Column
    active!: boolean;

    @Column
    serverId!: string;
}
