const express =require('express')
const Sequelize = require("sequelize")
const api = require('./app')

const dbConfig=require("./config.json")

sequelize = new Sequelize(dbConfig.development);

//test DB connection 
sequelize
  .authenticate()
  .then(() => {
    console.log('Connection TO DB has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

const app=express()

app.use(express.static('public'))
app.use('/api/v1', api);

const port = 3001

app.listen(port, () => {
    console.log(`API APP listening at http://localhost:${port}`)
})