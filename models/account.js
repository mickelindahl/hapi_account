/**
 * Created by Mikael Lindahl (S057WL) on 2016-12-08.
 */

'use strict';

module.exports = {

    identity: 'account',

    attributes: {
        user: {
            type: 'string',
            unique: true
        },
        password: 'string',
        email: 'string',
        verified: 'boolean'
    }

};