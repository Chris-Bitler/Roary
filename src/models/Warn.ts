import { AllowNull, Column, Model, Table } from 'sequelize-typescript';

/**
 * Model representing a user punishment (warn)
 */
@Table
export class Warn extends Model {
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
