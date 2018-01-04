/**
 * Created by Mikael Lindahl on 2016-12-19.
 */

'use strict';

const Hapi = require( 'hapi' );
const dotenv = require( 'dotenv' );
const routes = require( './routes/index' );
const register = require( './config/plugins' );
const fs = require('fs');

if (! fs.existsSync(__dirname+'/.env')){

    throw "Need to defined .env"

}


dotenv.load(); // laddar .env

const server = new Hapi.Server( {
    host: process.env.HOST,
    port: process.env.PORT
});

register( server ).then( () => {

    //Plugins loaded. Set up the rest and get kickin'

    // Add the routes
    routes( server );

    server.app.uri = server.info.uri;

    server.start().then( ()=> {

        console.log( 'Server running at: ' + server.info.uri );

    } );
} );

module.exports = server;