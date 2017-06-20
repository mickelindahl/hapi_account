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
        handler: ( request, reply ) => {

            //let bundle_file = request.params.bundle;
            //let b = Browserify();

            let s=fs.readFileSync('./bundle/login.jsx').toString()

            //debug(s)

            s=handlebars.compile(s)({
                facebook_app_id:process.env.FACEBOOK_APP_ID,
                facebook_app_secret:process.env.FACEBOOK_APP_SECRET,
                google_client_id:process.env.GOOGLE_CLIENT_ID


            })

            fs.writeFileSync('./bundle/login_bundle.jsx', s);

            //debug(s)

            browserify( "./bundle/login_bundle.jsx" )
                .transform( "babelify", { presets: ["es2015", "react"] } )
                .bundle( ( err, js ) => {

                    if ( err ) {
                        console.error(err);

                        return reply( err );
                    }

                    reply( js.toString() )

                } )
        },

        //.pipe(fs.createWriteStream("bundle.js"));

        //b.add( path.join( path.resolve(), 'bundles', bundle_file ) );
        //b.bundle( ( err, js ) => {
        //
        //    if ( err ) {
        //        return reply( Boom.badImplementation( err ) );
        //    }
        //
        //    reply( js.toString() )
        //
    }

];