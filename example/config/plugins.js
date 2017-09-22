/**
 * Created by Mikael Lindahl on 2016-09-16.
 */
'use strict';

const Promise = require('bluebird');

module.exports=(server)=> {

    let plugins = [
        require('./hapi_waterline'),
        require('./hapi_account'),
        require('./hapi_swagger'),
        (s) => {
            return s.register(require('inert'))
        },
        require('./vision'),
    ];


    let promise = Promise.resolve(server);

    plugins.forEach((p)=>{

        promise=promise.then((server)=>{

            return p(server).then(()=>{
                    return server;
            });

        })
    });

    return promise

};