/**
 * Created by Mikael Lindahl on 2016-12-14.
 */

'use strict';

//const methods=require('grassy-hapi-account');

module.exports = ( server )=> {

    let options =  {
        accountVerified:false,
        basePath: "account",
        facebook:{
            app_id: process.env.FACEBOOK_APP_ID,
            app_secret: process.env.FACEBOOK_APP_SECRET,
        },
        google:{
            client_id: process.env.GOOGLE_CLIENT_ID
        }
    };

    return server.register( {
        plugin: require( '../../../index' ),
        options: options,
    } )
};
