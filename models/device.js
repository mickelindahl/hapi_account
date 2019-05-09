/**
 * Created by Mikael Lindahl on 2016-12-08.
 */

'use strict';

module.exports = {

    identity: 'device',
    primaryKey: 'id',
    attributes: {
        id: { type: 'number', autoMigrations: { autoIncrement: true}},
        device_id:{type : 'string'},
        account_id:{type : 'number'},
        data: {type : 'json'},
        created_at: { type: 'ref', autoCreatedAt: true, autoMigrations: {  columnType:'TIMESTAMP' } },
        updated_at: { type: 'ref', autoUpdatedAt: true, autoMigrations: {  columnType:'TIMESTAMP' } }
    },

};

