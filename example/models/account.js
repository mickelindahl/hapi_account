/**
 * Created by Mikael Lindahl on 2016-12-08.
 */

'use strict';

module.exports = {

    identity: 'account',

    attributes: {
        user: {
            type: 'string',
            unique: true
        },
        email: {
            type: 'string',
            unique: true
        },
        password: 'string',
        verified: 'boolean',
        scope:{
            type:'array',
            defaultsTo:[]
        },
        created_by:{
            type: 'string',
            defaultsTo: 'hapi-account'
        }, // hapi-account | facebook | google
        response: 'json' // Response data connected with account from facebook or google
    }

};