const express =require('express')
const bodyParser = require("body-parser");
const morgan = require("morgan");

//Express App
const app=express()

//Middlewares
app.use(morgan("combined"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({  extended: true }));

//The service service
const theServie= require('./services/theService')
//Validation middleware
const { signupValidationRules, validate } = require('./middleware/validator')

//The endpoint
app.post('/create',signupValidationRules(),validate, theServie.create)

module.exports=app