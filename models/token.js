/**
 * Created by Mikael Lindahl on 2016-12-08.
 */

'use strict';

module.exports = {

    identity: 'token',

    autoCreatedAt: false,
    autoUpdatedAt: false,
    autoPK:false,

    attributes: {
        accountId:'integer',
        uuid: {
            type:'string',
            unique:true,
            primaryKey: true
        },
        status: 'string',
        expireAt: 'datetime',
        createdAt: {
            type: 'datetime',
            defaultsTo: function() {return new Date();}
        },
        updatedAt: {
            type: 'datetime',
            defaultsTo: function() {return new Date();}
        },
        lastUsageAt: {
            type: 'datetime',
            defaultsTo: function() {return new Date();}
        },
        scope:'array'
    },

    beforeUpdate:(values, cb)=>{
        values.updated_at=new Date();

        cb()
    }

};

