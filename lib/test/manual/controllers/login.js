const debug = require( 'debug' )( 'facebook:controllers:login' )

module.exports = (request, reply)=>{


    //let params={
    //
    //    facebook_app_id:process.env.FACEBOOK_APP_ID,
    //    google_app_id:process.env.GOOGLE_APP_ID
    //
    //}
    //debug('p!!!!!',params)
    reply.view('login')

}




