/**
 * Created by Mikael Lindahl on 2016-12-14.
 */

'use strict';

module.exports = ( server )=> {

    let options =  {
        accountVerified:false,
        basePath: "account",
        events:[
            {type: 'onPostCreate', method:(request, next)=>{}},
            {type: 'onPostForgotPassword', method:(request, next)=>{}}
        ],
    };

    return server.register( {
        register: require( 'hapi-account' ),
        options: options,
    } )
};
