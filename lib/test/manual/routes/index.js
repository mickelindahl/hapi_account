
'use strict'

module.exports = function (server){

    var paths=[
        '../routes/assets',
        '../routes/login'
    ];

    for (var i in paths){

        server.route(require(paths[i]));

    }
}