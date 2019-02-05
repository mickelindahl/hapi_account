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
 * - `options` Plugin options object with the following keys:
 *   - `accountVerified` If true then verified property in account is set to false.
 *   Then user can not be login until account been verified. An event chain
 *   have to be triggered such that verifyAccount route is called with valid
 *   token. This can be accomplished by providing a `onPostCreate` `event`
 *   that for example sends an email url that that triggers the verifyAccount
 *   route with valid token.
 *   - `basePath`  base path for route.
 *   - `cronTimes`
 *     - `expiredTokenCollector` The time to fire off your job. This can be in the
 *     - `extendExpirationDate` The time to fire off your job. This can be in the
 *   form of cron syntax or a JS Date object (see https://www.npmjs.com/package/cron).
 *   - `email` an object with email setup
 *     - `transporter` a [nodemailer](https://www.npmjs.com/package/nodemailer) transporter
 *     - `event` an array of objects with the following
 *       - `type` Post events uses the signature `function(request, next)`.
 *         -  `onPostCreate` used to send verification emails. If defined then
 *          `options.accountVerified` should be false. Thus the email have to provide ulr
 *         that the user can click on to trigger `validateAccountPassword` route in with
 *         valid token. The token is available in
 *         `request.server.plugins['hapi-account'].result.token.uuid`.
 *         -  `onPostForgotPassword` Have to provide url that the user can
 *         click to trigger `resetPassword` route in with a valid  token and
 *         a new password in order to reset a password.
 *       - `from` sender email
 *       - `subject` email subject
 *       - `text` {function(request) | string} to create text body with
 *       - `html` {function(request) | string} to create html body with
 *   - `events` an array of objects with the following keys:
 *     - `type` {string} the extension point event. Pre events uses the signature
 *        One of:
 *        - `onPreChangedPassword` Called before changePassword handler is triggered.
 *        - `onPreCreate` Called before `created` handler is triggered.
 *        - `onPreForgotPassword` Called before `forgetPassword` handler is triggered.
 *        - `onPreLogin` Called before `login` handler is triggered.
 *        - `onPreLogout` Called before `logout` handler is triggered.
 *        - `onPreResetPassword` Called before `resetPassword` handler is triggered.
 *        - `onPreVerifyAccount` Called before `verifyAccount` handler is triggered.
 *        - `onPreUpdateScope` Called before `updateScope` handler is triggered.
 *        - `onPostChangePassword` Called after `changePassword` handler was triggered.
 *        - `onPostCreate` Called after `created` handler was triggered.
 *        - `onPostForgotPassword` Called after `forgotPassword`hanlder was triggered.
 *        - `onPostLogin` Called after `login` handler was triggered.
 *        - `onPostLogout` Called after `logout`handler was triggered.
 *        - `onPostResetPassword` Called after `resetPassword` handler was triggered
 *        - `onPostVerifyAccount` Called after `verifyAccount` route has been
 *        - `onPostUpdateScope` Called before `updateScope` handler is triggered.
 *
 *     - `method` {async function(request, h) || async function(request)} `Request` is the sever request object
 *       and  `h` [hapi response toolkit](https://hapijs.com/api#response-toolkit). If object is returned with
 *       `return result` then result is assigned to request.pre with key defined in `assign`
 *       (See https://hapijs.com/api#route-handler). Data available from upstreams call
 *       are stored in two places, either in `request.pre` or in `request.server.plugins['hapi-account'].result`.
 *       triggered with `account` and `token` objects are available in
 *      'request.plugins['hapi-account'].result'.
 *     - `assign` {string} result returned from `method`is stored with this key
 *   - `expire` Object with durations from creation tokens are valid.
 *     - `create` Duration (in milliseconds) the  token created in `create` route is valid
 *     - `login` Duration (in milliseconds) the  token created in `login` route is valid
 *     - `forgotPassword` Duration (in miliseconds) the  token created in `forgotPassword` is valid
 *   e.g. `{isAccount:(request, reply)=>{..stuff}, encryptPassword:(request, reply)=>{...other stuff}}`.
 *   See below for method definitions
 *   - `facebook` {object} Credentials can be created at [facebook for developer](https://developers.facebook.com/)
 *     - `app_id` {string} Facebook app id
 *     - `app_secret` {string} Facebook app secret
 *   - `google` Credentials can be created ad [Google cloud console](https://console.cloud.google.com)
 *     - `client_id` {string} Google client id
 *   - `methods` an array of objects with the following keys:
 *     - `type` {string} the extension point event. Pre events uses the signature. Se pre.js for description
 *        One of:
 *       - destroyToken
 *       - getDatabaseAccount
 *       - getDatabaseToken
 *       - isAccount
 *       - verifyToken
 *       - verifyUser
 *       - verifyPassword
 *     - `method` Method to replace
 *   - `expire` Object with durations from creation tokens are valid.
 *     - `create` Duration (in milliseconds) the  token created in `create` route is valid
 *     - `login` Duration (in milliseconds) the  token created in `login` route is valid
 *     - `forgotPassword` Duration (in miliseconds) the  token created in `forgotPassword` is valid
 *   e.g. `{isAccount:(request, reply)=>{..stuff}, encryptPassword:(request, reply)=>{...other stuff}}`.
 *   See below for method definitions
 *   - `facebook` {object} Credentials can be created at [facebook for developer](https://developers.fa
 *   - `scopesAllowed` Array with names off the allowed scopes
 *   - `waterline` {object}
 *     - `config` {object} Waterline config
 *       - `adapters`:{..adapters},
 *       - `datastores`:{...datastores}
 *     - `models` {object} model colletions from initialized orm. Use this if you already
 *     have a waterline orm. Just make sure you include the models into your orm initialization
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
        Auth(server);

        debug( 'auth strategy has been set' );

        let pre = options.basePath == '' ? '' : '/';

        // Register routes
        server.route( Routes(config, pre, options));

        debug( 'Routes registered' );

        // Expose server to options, result variable and cron job. Added
        // to server.plugins['hapi-account']
        server.expose( 'options', options ); // ushc that post evetns e.g. are available
        server.expose( 'result', {} );
        server.expose( 'cronTimeExtendExpirationDate', Cron( server, options ) );

    } )
};

exports.plugin={
    register,
    pkg:Package
};

