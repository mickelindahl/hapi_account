'use strict';

const debug = require( 'debug' )( 'facebook:routes:assets.js' );
const browserify = require('browserify');
const fs = require('fs');
const handlebars=require('handlebars');

module.exports = [

    // This route is required for serving assets referenced from our html files
    {
        method: 'GET',
        path: '/{files*}',
        handler: {
            directory: {
                path: 'public'
            }
        }
    },
    {
        method: 'GET',
        path: '/bundle/public/login.js',
        handler: ( request, h ) => {

            let s=fs.readFileSync('./bundle/login.jsx').toString();

            //debug(s)

            s=handlebars.compile(s)({
                facebook_app_id:process.env.FACEBOOK_APP_ID,
                facebook_app_secret:process.env.FACEBOOK_APP_SECRET,
                google_client_id:process.env.GOOGLE_CLIENT_ID


            })

            fs.writeFileSync('./bundle/login_bundle.jsx', s);


            return new Promise((resolve, reject)=>{

                browserify( "./bundle/login_bundle.jsx" )
                    .transform( "babelify", { presets: ["es2015", "react"] } )
                    .bundle( ( err, js ) => {

                        if ( err ) {
                            console.error(err);

                            reject(err) ;
                        }

                        resolve(js.toString())
                    } )
            })

        },
    }

];