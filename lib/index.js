/**
 * Created by Mikael Lindahl on 2016-11-29.
 */

'use strict';

/**@module plugin */

const Auth = require('./auth');
const Config=require('./config');
const Cron = require( './cron' );
const debug = require( 'debug' )( 'hapi-account:lib:index' );
const hapi_auth_bearer_token = require( 'hapi-auth-bearer-token' );
const Joi = require('joi');
const Package = require('../package.json');
const Routes=require('./routes');
const Schema = require('./schema');
const Waterline=require('./waterline');

function _formatBasePath( basePath ) {

    if ( basePath[0] == '/' ) {

        basePath = basePath.slice( 1, basePath.length )

    }

    if ( basePath[basePath.length - 1] == '/' ) {

        basePath = basePath.slice( 0, basePath.length - 1 )

    }

    return basePath
}

/**
 * - `options` see schema.js
 */
async function register( server, options ) {

    Joi.assert(options, Schema, 'Bad plugin options passed to hapi-account.');
    options = Joi.validate(options, Schema).value;

    options.basePath = _formatBasePath( options.basePath );

    let config = Config(options);


    // First register hapi auth bearer token plugin and its strategy
    return server.register( {

        plugin: hapi_auth_bearer_token,

    } ).then( () => {

        debug( 'server.auth.strategy' );

        // Db stuff
        return Waterline(server, options.waterline);

    } ).then( () => {

        debug( 'waterline initiated' );

        // Set auth stuff
        Auth(server, options.authStrategyName);

        debug( 'auth strategy has been set' );

        let pre = options.basePath == '' ? '' : '/';

        // Register routes
        server.route( Routes(config, pre, options));

        debug( 'Routes registered' );

        // Expose server to options, result variable and cron job. Added
        // to server.plugins['hapi-account']
        server.expose( 'options', options ); // ushc that post evetns e.g. are available
        server.expose( 'result', {} );
        Cron( server, options )
        // server.expose( 'cronTimeExtendExpirationDate', Cron( server, options ) );

    } )
};

exports.plugin={
    register,
    pkg:Package
};

