const express = require('express');
const bodyParser = require('body-parser');
const Joi = require('joi');
const MongoClient = require('mongodb').MongoClient;
const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//PORT
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening on ${port} ...`)
});

//Connect to MongoDB Cloud Database
const url = 'mongodb+srv://test0:316998@cluster0-l6z6n.gcp.mongodb.net/SELF?retryWrites=true&w=majority';
MongoClient.connect(url, { useUnifiedTopology: true })
    .then(client => {
        console.log('Connected to Database');
        const db = client.db('app-data');
        //reported traffic condition includes location, condition, time, ...
        const conditionsCollection = db.collection('traffic-conditions');
        //user's genaral info includes personal info, id, password, contact, awarded points...
        const userInfoCollection = db.collection('user-info');
        //user's GPS includes user's id, longitude & latitude
        const userGPSCollection = db.collection('user-GPS');

        //CRUD operations
        //add new editor
        app.post('/signup/BTV', async (req, res) => {
            const { id, password, name } = req.body
            userInfoCollection
                .insertOne({
                    id,
                    password,
                    name,
                    type: 'BTV'
                })
                .then(result => {
                    //console.log(rs.ops[0].id);
                    if (result && result.ops && result.ops.length) {
                        res.json(result.ops[0]);
                    }
                    return userGPSCollection.insertOne({
                        id: result.ops[0].id,
                        monngoid: result.ops[0]._id,
                        longitude: '',
                        latitude: ''
                    })
                })
                .then(result => {
                    console.log('Added new editor');
                })
                .catch(error => {
                    console.error(error);
                })
        });

        //register new user using phone number
        app.post('/signup/CTV', async (req, res) => {
            const { id, password, name } = req.body;
            db.collection('user-info').find({ 'id': id }).count((err, number) => {
                if (number != 0) {
                    res.json('This phone number has already been used.');
                    console.log('This phone number has already been used.');
                }
                else {
                    userInfoCollection
                        .insertOne({
                            id,
                            password,
                            name,
                            type: 'CTV',
                            point: 0
                        })
                        .then(result => {
                            //console.log(rs.ops[0].id);
                            if (result && result.ops && result.ops.length) {
                                res.json(result.ops[0]);
                            }
                            return userGPSCollection.insertOne({
                                id: result.ops[0].id,
                                monngoid: result.ops[0]._id,
                                latitude: '',
                                longitude: ''
                            })
                        })
                        .then(result => {
                            console.log('Added new user.');
                        })
                        .catch(error => {
                            console.error(error);
                        })
                }
            })

        });

        //log in
        app.post('/login', async (req, res) => {
            const { id, password } = req.body;
            const user = await userInfoCollection.findOne({ id, password });
            if (user) {
                res.json({ success: true });
            } else {
                res.json({ success: false });
            }
        });

        //get user info
        app.get('/userinfos/:id', async (req, res) => {
            const user = await db.collection('user-info').findOne({ id: req.params.id });
            if (user) {
                res.json({
                    id: user.id,
                    name: user.name,
                    type: user.type,
                    point: user.point
                });
            } else {
                res.send(`User with id: ${req.params.id} was not found.`);
            }
        });

        //get user location
        app.get('/userGPS/:id', async (req, res) => {
            const user = await userGPSCollection.findOne({ id: req.params.id });
            if (user) {
                res.json({
                    id: user.id,
                    longitude: user.longitude,
                    latitude: user.latitude
                });
            } else {
                res.send(`User with id: ${req.params.id} was not found.`);
            }
        });

        // update user location
        app.put('/userGPS', async (req, res) => {
            const updateid = req.body.id;
            const updatelat = req.body.latitude;
            const updatelong = req.body.longitude;
            let userGPS = await userGPSCollection.findOne({ id: updateid })
            if (userGPS) {
                await userGPSCollection.findOneAndUpdate(
                    { id: updateid },
                    {
                        $set: {
                            latitude: updatelat,
                            longitude: updatelong
                        }
                    }
                )
            } else {
                await userGPSCollection.insertOne({
                    id: updateid,
                    latitude: updatelat,
                    longitude: updatelong
                })
            }
            userGPS = await userGPSCollection.findOne({ id: updateid })
            res.json(userGPS) 
        });

        //report traffic condition
        app.post('/conditions', (req, res) => {
            const today = new Date();
            const date_Time = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ' ' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
            const long = req.body.longitude;
            const lat = req.body.latitude;
            const stt = req.body.status;
            conditionsCollection.insertOne({
                longitude: long,
                latitude: lat,
                status: stt,
                date_time: date_Time
            })
                .then(result => {
                    //res.send('Added new traffic condition info to database');
                    res.json(result.ops);
                })
                .catch(error => console.error(error))
        });

        //update traffic condition
        app.put('/conditions', (req, res) => {

        });

        //award points to user
        app.put('/userinfo', (req, res) => {
            const updateid = req.body.id;
            const bonus = parseInt(req.body.bonus);
            userInfoCollection.findOneAndUpdate(
                { id: updateid },
                {
                    $inc: {
                        point: bonus
                    }
                }
            )
                .then(result => {
                    res.send(result);
                })
                .catch(error => {
                    res.send(error);
                })
        });

        app.get('/', (req, res) => {
            console.log('Welcome!');
            res.send('Welcome!');
        });
    })
    .catch(error => {
        console.error(error);
        console.log('Unable to connect to MongoDB server.');
    });