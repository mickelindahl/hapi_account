/**
 * Created by Mikael Lindahl (mikael) on 10/3/16.
 */

'use strict';

const Hapi = require( 'hapi' );
const Promise = require( 'bluebird' );
const debug = require( 'debug' )( 'hapi_account:test_server' )

let db_connection = {
    adapter: 'memory'
};

let options_hw = {
    adapters: { // adapters declaration
        'memory': require( 'sails-memory' )
    },
    connections: {
        'default': db_connection
    },
    models: { // common models parameters, not override exist declaration inside models
        connection: 'default',
        migrate: 'create',
        schema: true
    },
    decorateServer: true, // decorate server by method - getModel
    path: '../../../models' // string or array of strings with paths to folders with models declarations
};

function get_server( options ) {
    let server = new Hapi.Server();

    server.connection( { host: '0.0.0.0', port: 3000 } );

    return {
        promise:server.register( [
        // require( 'vision' ),
        {
            register: require( 'hapi-waterline' ),
            options: options_hw,
        },
        // {
        //     register: require( './index.js' ),
        //     options: options
        // }

    ] )
        .then( ()=> {

        server.app.readyForTest = true;

    } ),
    server:server
    }
}

function start_servet( options ) {
    let result = get_server( options );

    debug( options )

    let promise = new Promise( ( resolve, reject )=> {
        result.promise.then( ()=> {

            result.server.initialize( ( err )=> {

                resolve( result.server )

            } )
        } );
    } )

    return promise
}

module.exports = start_servet;


