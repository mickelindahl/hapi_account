import Debug from 'debug'
//import Dotenv from 'dotenv'
import React from 'react';
import ReactDOM from 'react-dom';
import FacebookLogin from 'react-facebook-login';
import $ from 'jquery';
import GoogleLogin from 'react-google-login';

//Dotenv.load();

localStorage.debug='*'

var debug = Debug('facebook:bundle:login.jsx')

//debug(process.env.FACEBOOK_APP_ID )
//console.log(process.env.FACEBOOK_APP_ID )

const responseFacebook = ( res1 ) => {

    $('.facebook-token').html('Token:'+res1.accessToken);


    console.log( res1 );

    $.ajax({
        type:'POST',
        data:{
            email:res1.email,
            token:res1.accessToken
        },
        url: '/account/loginFacebook'
    }).done(function(res){

        console.log(res)
        console.log('ok!')
        $('.facebook-ok').html('Ok');

    }).fail(function(err){

        console.error(err)


    })


    //https://graph.facebook.com/endpoint?key=value&amp;access_token=app_id|app_secret
    //$.ajax({
    //    type:'GET',
    //    url: ('https://graph.facebook.com/oauth/access_token'
    //            +'?client_id={{facebook_app_id}}'
    //        +'&client_secret={{facebook_app_secret}}'
    //        +'&grant_type=client_credentials')
    //    //url: 'https://graph.facebook.com/oauth/access_token?client_id=1100092430134479&client_secret=e6468a60d6179d9700f42de57efb59bc&grant_type=client_credentials'
    //}).done((res2)=>{
    //
    //    $.ajax({
    //        type:'GET',
    //        url:('https://graph.facebook.com/debug_token?'
    //             +'input_token='+res1.accessToken
    //             +'&access_token='+res2.access_token)
    //
    //        //    ('https://graph.facebook.com/oauth/access_token'
    //        //+'?client_id={{facebook_app_id}}'
    //        //+'&client_secret={{facebook_app_secret}}'
    //        //+'&grant_type=client_credentials')
    //    }).done((response)=>{
    //
    //
    //        debug(response)
    //
    //    })
    //
    //    //debug(response)
    //
    //})
    //graph.facebook.com/debug_token?
    //input_token={token-to-inspect}
    //&access_token={app-token-or-admin-token}

}

const responseGoogle = ( response ) => {
    console.log( response);

    $('.google-token').html('Token:'+response.tokenId);

    $.ajax({
        type:'POST',
        data:{
            //email:res1.email,
            token:response.tokenId
        },
        url: '/account/loginGoogle'
    }).done(function(res){

        console.log(res)
        console.log('ok!')
        $('.google-ok').html('Ok');

    }).fail(function(err){

        console.error(err)


    })

    //$.ajax({
    //    type:'GET',
    //    url: ('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token='+response.tokenId)
    //    //url: 'https://graph.facebook.com/oauth/access_token?client_id=1100092430134479&client_secret=e6468a60d6179d9700f42de57efb59bc&grant_type=client_credentials'
    //}).done((res2)=>{
    //
    //    debug(res2)
    //
    //})


    //var CLIENT_ID='531104774917-3htgiab524t8nejdbevvaf7f3ck9p8n2.apps.googleusercontent.com'
    //var GoogleAuth = require('google-auth-library');
    //var auth = new GoogleAuth;
    //var client = new auth.OAuth2(CLIENT_ID, '', '');
    //client.verifyIdToken(
    //    response.tokenId,
    //    CLIENT_ID,
    //    // Or, if multiple clients access the backend:
    //    //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3],
    //    function(e, login) {
    //        console.error(e)
    //        var payload = login.getPayload();
    //        var userid = payload['sub'];
    //        console.log( payload );
    //        // If request specified a G Suite domain:
    //        //var domain = payload['hd'];
    //    });

}



//class FacebookLoginWrap extends React.Component {
//    constructor( props ) {
//        super( props );
//        this.state = { app_id: process.env.FACEBOOK_APP_ID };
//    }
//
//    render() {
//
//        return (  <FacebookLogin
//            appId="{{facebook_app_id}}"
//            autoLoad={true}
//            fields="name,email,picture"
//            //onClick={componentClicked}
//            callback={responseFacebook}/>)
//
//    }
//
//}

ReactDOM.render(
    <FacebookLogin
        appId="{{facebook_app_id}}"
        autoLoad={true}
        fields="name,email,picture"
        //onClick={componentClicked}
        callback={responseFacebook}/>,
    document.getElementById( 'facebook-login' )
);

debug( document.getElementById('google-login'))

ReactDOM.render(
    <GoogleLogin
        clientId="{{google_client_id}}"
        buttonText="Login"
        onSuccess={responseGoogle}
        onFailure={responseGoogle}
    />,
    document.getElementById('google-login')
);