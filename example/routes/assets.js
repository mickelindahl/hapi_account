'use strict';

const Boom = require( 'boom' );
const debug = require( 'debug' )( 'breakpad:crash_dump.js' )
const Sass = require( 'node-sass' );

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

    // Convert bootstrap sass to csc
    {
        method: 'GET',
        path: '/bootstrap/css/bootstrap.css',
        handler: ( request, reply )=> {

            Sass.render( {
                //file: './node_modules/bootstrap/scss/bootstrap.scss',
                file: './styles/app.scss',
            }, ( err, result )=> {

                if ( err ) {
                    return reply( Boom.badImplementation( err ) );
                }

                reply( result.css.toString() ).header("Content-type","text/css");

            } );

        }
    },
    {

        method: 'GET',
        path: '/login',
        handler: ( request, reply ) => {

            let head = Fs.readFileSync( Path.join( Path.resolve(), 'views/head.html' ) ).toString();
            head = Handlebars.compile( head, { title: 'Login', serverName: 'Test server' } );

            reply.view( 'login', {
                head: head,
                title: 'Login'
            } );
        }
    }
];

