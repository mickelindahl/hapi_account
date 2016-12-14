/**
 * Created by Mikael Lindahl on 2016-12-14.
 */

'use strict'

const Hapi = require( 'hapi' );

const server = new Hapi.Server( { port: 3000 } );

server.register( {
    register: require( 'hapi-account' ),
    options: {
        accountVerified:false,
        basePath: "account",
        events:[
            {type: 'onPostCreate', method:(request, next)=>{}},
            {type: 'onPostForgotPassword', method:(request, next)=>{}}
        ] ,
    }
});