/**
 * Created by Mikael Lindahl on 2016-12-08.
 */

'use strict';

const bcrypt = require( 'bcryptjs' );
const debug = require('debug')('hapi-account:models:account');

module.exports = {

    primaryKey: 'id',
    identity: 'account',

    attributes: {
        id: { type: 'number', autoMigrations: { autoIncrement: true}},
        user: {
            type: 'string',
            required: true,
            autoMigrations: {unique: true}
        },
        password: {type: 'string'},
        verified: {type: 'boolean'},
        scope:{
            type:'json',
            defaultsTo:[]
        },
        created_at: { type: 'ref', autoCreatedAt: true, autoMigrations: {  columnType:'TIMESTAMP' } },
        updated_at: { type: 'ref', autoUpdatedAt: true, autoMigrations: {  columnType:'TIMESTAMP' } },
        created_by:{
            type: 'string',
            defaultsTo: 'hapi-account'
        }, // hapi-account | facebook | google
        response: {type:'json'}, // Response data connected with account from facebook or google
        meta: {type:'json'} // Meta data connected with account at creation e.g. name
    },

    beforeCreate:(value, cb )=>{

        debug( 'encryptPassword' );

        let salt = bcrypt.genSaltSync( 10 );
        let hash = bcrypt.hashSync( value.password, salt );
        value.password = hash;

        cb()

    },

    beforeUpdate:(value, cb )=>{

        if (value.password) {
            debug('encryptPassword');

            let salt = bcrypt.genSaltSync(10);
            let hash = bcrypt.hashSync(value.password, salt);
            value.password = hash;
        }

        cb()

    }

};