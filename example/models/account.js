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
        verified: 'boolean'
    }

};