/**
 * Created by Mikael Lindahl on 2016-12-08.
 */

'use strict';

module.exports = {

    identity: 'token',

    primaryKey: 'id',
    // autoCreatedAt: false,
    // autoUpdatedAt: false,
    // autoPK:false,

    attributes: {
        id: { type: 'number', autoMigrations: { autoIncrement: true}},
        account_id:{ type: 'number' },
        uuid: {type:'string', required:true,autoMigrations: { unique: true}},
        status: {type : 'string'},
        expire_at: {type: 'string'},
        created_at: { type: 'string', autoMigrations: { autoCreatedAt: true, columnType:'DATETIME' } },
        update_at: { type: 'string', autoMigrations: { autoUpdateAt: true, columnType:'DATETIME' }  },
        last_usage_at: {type: 'string',  autoMigrations: { columnType:'DATETIME' } },
        scope:{ type:'json', defaultsTo:[]}
    },

};

