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

};

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