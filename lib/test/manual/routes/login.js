'use strict';

const debug = require( 'debug' )( 'dave:routes:login.js' );
const login = require('../controllers/login');
module.exports = [

    // This route is required for serving assets referenced from our html files
    {
        method: 'GET',
        path: '/',
        handler:login
    }

];