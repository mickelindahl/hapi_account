/**
 * Created by Mikael Lindahl on 2016-12-19.
 */

'use strict';

const Hapi = require( 'hapi' );
const dotenv = require( 'dotenv' );
const routes = require( './routes/index' );
const register = require( './config/plugins' );
const debug = require( 'debug' )( 'dave:index' )

if ( process.env.NODE_ENV == 'test' ) {
    require( 'dotenv' ).config( { path: __dirname + '/testenv' } );
} else {
    require( 'dotenv' ).load(); // laddar .env
}

const server = new Hapi.Server();
server.connection( {
    host: process.env.HOST,
    port: process.env.PORT
} );

register( server ).then( () => {

    //Plugins loaded. Set up the rest and get kickin'

    // Add the routes
    routes( server );

    server.app.uri = server.info.uri;

    server.start( function () {

        console.log( 'Server running at: ' + server.info.uri );
        server.app.readyForTest = true;
    } );
} );

module.exports = server;