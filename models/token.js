/**
 * Created by Mikael Lindahl on 2016-12-08.
 */

'use strict';

module.exports = {

    identity: 'token',
    primaryKey: 'id',
    attributes: {
        id: { type: 'number', autoMigrations: { autoIncrement: true}},
        account_id:{ type: 'number' , autoMigrations: {} },
        device_id:{ type: 'number' , allowNull:true, autoMigrations: {} },
        uuid: {type:'string', required:true,autoMigrations: { unique: true}},
        status: {type : 'string'},
        expire_at: {type: 'ref',  autoMigrations: { columnType:'TIMESTAMP' }},
        created_at: { type: 'ref', autoCreatedAt: true, autoMigrations: {  columnType:'TIMESTAMP' } },
        updated_at: { type: 'ref', autoUpdatedAt: true, autoMigrations: {  columnType:'TIMESTAMP' } },
        last_usage_at: {type: 'ref', autoCreatedAt: true, autoMigrations: { columnType:'TIMESTAMP' } },
        scope:{ type:'json', defaultsTo:[]}
    },

};

