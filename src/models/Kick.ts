import { AllowNull, Column, Model, Table } from 'sequelize-typescript';

/**
 * Model representing a user punishment (kick)
 */
@Table
export class Kick extends Model {
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

    @Column
    serverId!: string;
}
