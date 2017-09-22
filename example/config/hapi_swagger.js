'use strict';

/**
 * Created by Mikael Lindahl on 2016-09-16.
 */

let _packege = require('../package');

module.exports=(server)=>{

    let options={
        info: {
            'title': 'Loriot API Documentation',
            'version': _packege.version
        },
        auth: {strategy:'simple'},
    };

    return server.register({
        register: require('hapi-swagger'), // Documentation
        options: options
    })
};