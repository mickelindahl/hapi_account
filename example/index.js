/**
 * Created by Mikael Lindahl on 2016-12-14.
 */

'use strict'

const Hapi = require( 'hapi' );
const routes = require( './routes/index' );
const register = require( './config/plugins' );

const server = new Hapi.Server();
server.connection({ port: 3000 });

register( server ).then( ()=> {

    // Add the routes
    routes( server );

    server.start( function () {

        server.app.log.info( 'Server running at:', server.info.uri );
        server.app.readyForTest = true;

    } );

} ).catch( ( err )=> {

    server.app.readyForTest = true;
    console.error( 'Error when loading plugins',  err )

} );