'use strict';

module.exports = ( server )=> {

    let options = {
        templates: [
            { id: 'head', param:'head', path:'./commons/head.html', compile:true},
            { id: 'nav', param:'nav', path:'./commons/nav.html', compile:true},
            { id: 'status_bar', param:'status_bar', path:'./commons/status_bar.html', compile:true},
            //{ id: 'icons_tt', param:'icons', path:'../node_modules/grassy-ui-components/lib/views/icons.html', compile:true},
            { id: 'icons', param:'icons', path:'./commons/icons.html', compile:true},
            { id: 'footer', param:'footer', path:'./commons/footer.html', compile:true},
            { id: 'scripts', param:'scripts', path:'./commons/scripts.html', compile:true},

            { id: 'main', param:'content', path:'./main.html', compile:true},
            //{ id: 'modal_about', param:'modals', path:'./modal_about.html', compile:true},
            //{ id: 'modal_login', param:'modals', path:'../node_modules/auth-ui-component/lib/templates/modal_login.html', compile:true}
        ],
        directors: [{id:'director', path:'./director'}],
        views: './views'
    }


// console.log()

    return server.register( {
        register: require( 'hapi-orchestra-view' ),
        options: options
    } )
};
