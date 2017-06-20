/**
 * Created by Mikael Lindahl on 2016-09-16.
 */

'use strict';

module.exports = ( server ) => {



    let options = {
        adapters: { // adapters declaration
            'memory': require( 'sails-memory' )
        },
        connections: {default: {adapter: 'memory' }},
        models: { // common models parameters, not override exist declaration inside models
            connection: 'default',
            migrate: 'create',
            schema: true
        },
        decorateServer: true, // decorate server by method - getModel
        path: '../../../models' // string or array of strings with paths to folders with models declarations
    };

    let db_connection = {
        adapter: 'memory',
        //url: process.env.DATABASE_URL,
        pool: false,
        ssl: false
    }

    //let options = {
    //    adapters: { // adapters declaration
    //        postgresql: require( 'sails-memory' )
    //    },
    //    connections: { default: db_connection },
    //    models: { // common models parameters, not override exist declaration inside models
    //        connection: 'default',
    //        migrate: 'create',
    //        schema: true
    //    },
    //    decorateServer: true, // decorate server by method - getModel
    //    path: [ '../../../models' ] // string or array of strings with paths to folders with models declarations
    //};

    server.app.adapters = options.adapters

    return server.register( {
        register: require( 'hapi-waterline' ),
        options: options,
    } )
};