'use strict'

import {Router} from 'express';
import User from '../model/user.js';
import bodyParser from 'body-parser';
import basicAuth from '../middleware/basic-auth.js';
import superagent from 'superagent';
let URL = process.env.CLIENT_URL;

export default new Router()

    .post('/signup', bodyParser.json() , (req, res, next) => {
        
        new User.createFromSignup(req.body)
            .then(user => user.tokenCreate())
            .then(token => {
                res.cookie('X-BBB-Token', token);
                res.send(token);
            })
            .catch(next);
    })
    
    .get('/usernames/:username', (req, res, next) => {
    
        User.findOne({username: req.params.username})
            .then(user => {
                if(!user) {
                    return res.sendStatus(200);
                }
                return res.sendStatus(409);
            })
            .catch(next);
    })
    
    .get('/login', basicAuth, (req, res, next) => {
        
        req.user.tokenCreate()
            .then((token) => {
                res.cookie('X-BBB-Token', token);
                res.send(token);
            })
            .catch(next);
    })

    .post('/oauth/google/code', (req, res, next)=>{
        let code = (req.query.code);
        console.log('in post to oauth::::::::::');

        let  myToken = superagent
        .post('https://googleapis.com/oauth2/v4/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .type('form')
        .send({
            code: code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: `http://localhost:3000/oauth/google/code`,
            grant_type:`authorization_code`
        });
        console.log("returned token:", myToken.body);
        // myToken.catch(console.error);
        myToken
        .then(res=>{
            console.log('starting step 2 ');
            let googleToken = res.body.access_token;
            console.log('step2, token', googleToken);
            return(googleToken)  
        })
        .then(token=>{
            return superagent
            .get('https://googleapis.com/plus/v1/people/me/openIdConnect')
            .set('Authoziration', `Bearer ${token}`)
            .then(res=>{
                let user = res.body;
                console.log('Step 4, google user: ', user)
                return user
            }) 
            .then(googleUser=>{
               return User.createFromOauth(googleUser)
            })
            .then(user=>{
                user.tokenCreate()
                .then(token=>{
                    console.log('user token: ', token);
                    res.cookie('new-chat-Token', token);
                    res.send(token);
                    // res.redirect.URL
                })
            })   
            .catch(err=>{
            console.error(err);
            res.redirect(URL)
        })
    })  
})
    