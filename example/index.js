/**
 * Created by Mikael Lindahl on 2016-12-14.
 */

'use strict'

const Hapi = require( 'hapi' );
const hapi_waterline = require( 'hapi-waterline' );

const server = new Hapi.Server();
server.connection({ port: 3000 });

let options_hw = {
    adapters: { // adapters declaration
        'memory': require( 'sails-memory' )
    },
    connections: {default: {adapter: 'memory' }},
    models: { // common models parameters, not override exist declaration inside models
        connection: 'default',
        migrate: 'create',
        schema: true
    },
    decorateServer: true, // decorate server by method - getModel
    path: '../../../models' // string or array of strings with paths to folders with models declarations
};

server.register( [
    {
        register: hapi_waterline,
        options: options_hw,
    },
    {
    register: require( 'hapi-account' ),
    options: {
        accountVerified:false,
        basePath: "account",
        events:[
            {type: 'onPostCreate', method:(request, next)=>{}},
            {type: 'onPostForgotPassword', method:(request, next)=>{}}
        ] ,
    }}]
);

server.start((err) => {

    console.log(`Server running at: ${server.info.uri}`);

});