/**
 * Created by Mikael Lindahl on 2016-12-14.
 */

'use strict';

//const methods=require('grassy-hapi-account');

module.exports = ( server )=> {

    let options =  {
        keyId:'email',
        accountVerified:false,
        basePath: "account",
        facebook:{
            app_id: process.env.FACEBOOK_APP_ID,
            app_secret: process.env.FACEBOOK_APP_SECRET,
        },
        google:{
            client_id: process.env.GOOGLE_CLIENT_ID
        }
        //events:[
        //
        //    {type:'onPreLogin', method:methods.verifyAgainstAD, assign:'userData'},
        //    {type:'onPreLogin', method:methods.storePassword, assign:'accountEntry'},
        //    {type:'onPreLogin', method:methods.addUser}
        //],

        //method:{
        //
        //    'verifyUser' :methods.isAccount,
        //    'verifyPassword': methods.verifyPassword,
        //
        //},
    };

    return server.register( {
        register: require( '../../../index' ),
        options: options,
    } )
};
