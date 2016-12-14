/**
 * Created by Mikael Lindahl on 2016-09-16.
 */

'use strict';

module.exports = ( server )=> {

    let options = {
        adapters: { // adapters declaration
            sqlite3: require('waterline-sqlite3' )
        },
        connections: {default: {
            adapter: 'sqlite3'
        }},
        models: { // common models parameters, not override exist declaration inside models
            connection: 'default',
            migrate: 'create',
            schema: true
        },
        decorateServer: true, // decorate server by method - getModel
        path: '../../models' // string or array of strings with paths to folders with models declarations
    };

    return server.register( {
        register: require( 'hapi-waterline' ),
        options: options,
    } )
};





