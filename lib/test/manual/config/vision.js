/**
 * Created by Mikael Lindahl (mikael) on 9/24/16.
 */

'use strict';

const handlebars = require( 'handlebars' );
const path = require( 'path' );

module.exports = ( server )=> {

    return server.register( {
        plugin: require( 'vision' )
    } ).then( ()=> {

        server.views( {
            engines: {
                html: handlebars
            },
            relativeTo: path.resolve(),
            path: './views'
        } );

    } )
};