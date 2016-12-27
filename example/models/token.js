/**
 * Created by Mikael Lindahl on 2016-12-08.
 */

'use strict';

module.exports = {

    identity: 'token',

    autoCreatedAt: false,
    autoUpdatedAt: false,
    attributes: {
        account_id:'integer',
        uuid: {
            type:'string',
            unique:true
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
        }
    },

    beforeUpdate:(values, cb)=>{
        values.updatedAt=new Date();

        cb()
    }

};

