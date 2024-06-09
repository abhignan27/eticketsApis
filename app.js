//require necessary modules
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const axios = require("axios");
const https = require('https');
const fs = require('fs');
const path = require('path');


//Instantiate the app
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
// app.use(express.static("public"));

const privateKey = fs.readFileSync(path.join(__dirname, 'public', 'private.key'));
const certificate = fs.readFileSync(path.join(__dirname, 'public', 'server.pem'));

// const filePath = path.join(__dirname, 'public', 'file.txt');

const options = {
    key: privateKey,
    cert: certificate
  };


//connect to apiDb mongoDb database
// mongoose.connect('mongodb://127.0.0.1:27017/apiDb', {useNewUrlParser: true});

mongoose.connect('mongodb://127.0.0.1:27017/apiDb', {useNewUrlParser: true});

//create user schema
const userSchema = {
    userId: String, //Unique field
    username: String,
    password: String,
    firstName: String,
    lastName: String,
    dateOfBirth: String,
    city: String,
    pinCode: String,
    country: String,
    purchasePrice: Number,
    cartList: Array,
    purchaseList: Array
}

//create event schema
const eventSchema = {
    eventId: String, //Unique field
    eventName: String,
    ticketPrice: String,
    eventPlace: String,
    eventDate: String,
    eventTime: String,
    status: String
}

//create user model
const User = mongoose.model("User", userSchema);
//create event model
const Event = mongoose.model("Event", eventSchema);

//Test function
app.get('/', function(req, res){
    res.send('Hello World!');
});

//get all users in the database
app.get('/users', function(req, res){
    User.find().then(function(err, users){
        if(!err){
            res.send(users);
        } else {
            res.send(err);
        }
    })
});

// get all events in the database
app.get('/events', function(req, res){
    Event.find().then(function(err, events){
        if(!err){
            res.send(events);
        } else {
            res.send(err);
        }
    })
});

// create a user in the database
app.post('/users', function(req, res){
    let userBody = req.body;
    console.log('Create user request body ->', userBody);

    const newUser = new User({
        userId: userBody.userId,
        username: userBody.username,
        password: userBody.password,
        firstName: userBody.firstName,
        lastName: userBody.lastName,
        dateOfBirth: userBody.dateOfBirth,
        city: userBody.city,
        pinCode: userBody.pinCode,
        country: userBody.country,
        purchasePrice: 0,
        cartList: [],
        purchaseList: []
    });

    newUser.save().then(function(){
        res.sendStatus(201);
    });
});

// create an event in the database
app.post('/events', function(req, res){
    let eventBody = req.body;
    console.log('Create event request body ->', eventBody);

    const newEvent = new Event({
        eventId: eventBody.eventId,
        eventName: eventBody.eventName,
        ticketPrice: eventBody.ticketPrice,
        eventPlace: eventBody.eventPlace,
        eventDate: eventBody.eventDate,
        eventTime: eventBody.eventTime,
        status: "CREATED"
    });

    newEvent.save().then(function(){
        res.sendStatus(201);
    });
});

// get user by userId
app.get("/users/:userId", function(req, res){
    User.findOne({userId: req.params.userId}).then(function(err, foundUser){
        if(!err){
            res.send(foundUser);
        } else {
            res.send(err);
        }
    })
});

// get user by userUserName
app.get("/users/username/:username", function(req, res){
    User.findOne({username: req.params.username}).then(function(err, foundUser){
        if(!err){
            res.send(foundUser);
        } else {
            res.send(err);
        }
    })
});

// get event by eventId
app.get("/events/:eventId", function(req, res){
    Event.findOne({eventId: req.params.eventId}).then(function(err, foundEvent){
        if(!err){
            res.send(foundEvent);
        } else {
            res.send(err);
        }
    })
});

// getAllEventsInCartListByUserId gets all events in cartList of the userobject by userId
app.get("/users/eventsInCartList/:userId", async function(req, res){
    const userId = req.params.userId;
    let cartListEvents = [];
    const response = await axios.get('https://localhost:3030/users/'+userId);
    let user = response.data;

    for(let i = 0; i< user['cartList'].length; i++){
        cartListEvents.push(user['cartList'][i]);
    }

    res.send(cartListEvents);

});


// getAllEventsInPurchaseListByUserId gets all events in purchaseList of the userobject by userId
app.get("/users/eventsInPurchaseList/:userId", async function(req, res){
    const userId = req.params.userId;
    let purchaseListEvents = [];
    const response = await axios.get('http://localhost:3030/users/'+userId);
    let user = response.data;

    for(let i = 0; i< user['purchaseList'].length; i++){
        purchaseListEvents.push(user['purchaseList'][i]);
    }

    res.send(purchaseListEvents);

});


//Update cartlist of the user with tickets -> Add to cart functionality in the frontend
app.patch("/users/updateCartList/:userId/:eventId", async function(req, res){
    const userId = req.params.userId;
    const eventId = req.params.eventId;
    let flag = false;
    let event = await axios.get('http://localhost:3030/events/'+eventId);
    // console.log('Event data ->', event.data);  

    let user = await axios.get('http://localhost:3030/users/'+userId);
    // console.log('User Data ->', user.data);

    // Checks if event already exists, if exists sets flag as true
    for(let i = 0; i < user.data['cartList'].length; i++){
        if(user.data['cartList'][i]['eventId'] === event.data['eventId']){
            flag = true;
        }
    }

    if(flag){
        res.send('Event already exisits');
    } else {
        User.updateOne({userId: userId},{$push: {cartList: event.data}}).then(function(err){
            if(!err){
                res.write('Update Successful');
                res.sendStatus(200);
            } else {
                res.send(err);
            }
        }); 

    }
 });


 //Update purchaselist of the user with tickets -> Add to buying list functionality in the frontend
app.patch("/users/updatePurchaseList/:userId/:eventId", async function(req, res){
    let flag = false;
    let foundEvent = {}; //Stores the found Event after checking cartList
    const response = await axios.get('http://localhost:3030/users/'+req.params.userId);
    const user = response.data;


    // Checks if event already exists, if exists sets flag as true
    for(let i = 0; i < user['cartList'].length; i++){
        if(user['cartList'][i]['eventId'] === req.params.eventId){
            flag = true;
            foundEvent = user['cartList'][i];
            break;
        }
    }

    if(flag){
        User.updateOne({userId: req.params.userId},
            { $pull: { cartList: foundEvent }, $push: { purchaseList: foundEvent } } ).then(function(err){
                if(!err){
                    res.write('Buy list update successful');
                } else {
                    res.send(err);
                }
            }) 
    } else {
        res.send('Event does not exist');
    }

});

// //Update purchaselist of the user with tickets -> Add to buying functionality in the frontend
// app.patch("/users/updatePurchaseList/:userId/:eventId", async function(req, res){
//     const event = req.body;
//     const response = await axios.get('http://localhost:3030/users/'+req.params.userId);
//     const user = response.data;
//     console.log('request data ->', event);

//     if(user){
//         User.updateOne({userId: req.params.userId},
//             { $pull: { cartList: event }, $push: { purchaseList: event } } ).then(function(err){
//                 if(!err){
//                     res.write('Buy list update successful');
//                 } else {
//                     res.send(err);
//                 }
//             })
//     } else {
//         res.write('User does not exist');
//         res.sendStatus(404);
//     }

// });


// clearCartListByUserId clears the cartList in the user object
app.patch("/users/clearCartListArray/:userId", async function(req, res){
    const response = await axios.get('http://localhost:3030/users/'+req.params.userId);
    const user = response.data;
    // console.log('User data ->', user);

    if(user){
        User.updateOne({userId: req.params.userId}, 
            {$set: {cartList: []}} ).then(function(err){
            if(!err){
                res.send('Cart list is cleared');
            } else {
                res.send(err);
            }
        })
    } else {
        // res.write('User not found');
        res.sendStatus(404);
    }
});


// clearPurchaseListByUserId clears the cartList in the user object
app.patch("/users/clearPurchaseListArray/:userId", async function(req, res){
    const response = await axios.get('http://localhost:3030/users/'+req.params.userId);
    const user = response.data;
    // console.log('User data ->', user);

    if(user){
        User.updateOne({userId: req.params.userId}, 
            {$set: {purchaseList: []}} ).then(function(err){
            if(!err){
                res.send('Purchase list is cleared');
            } else {
                res.send(err);
            }
        })
    } else {
        // res.write('User not found');
        res.sendStatus(404);
    }
});



// deleteUserByUserId - deletes the user object by userId
app.delete("/users/:userId", function(req, res){
    User.deleteOne({userId: req.params.userId}).then(function(err){
        if(!err){
            res.write('Delete user by userId successful');
            res.sendStatus(200);
        } else {
            res.send(err);
        }
    });
});


// deleteEventByEventId - deletes the event object by eventId
app.delete("/events/:eventId", function(req, res){
    Event.deleteOne({eventId: req.params.eventId}).then(function(err){
        if(!err){
            res.write('Delete event by eventId successful');
            res.sendStatus(200);
        } else {
            res.send(err);
        }
    });
});

// loginUser - Authenticates the user
// app.post("/users/login", function(req,res){
//     userLoginInfo = req.body // object format (json)- {"username": usernameValue, "password": passwordValue} 
//     console.log('Request body ->', userLoginInfo);
//     const message1 = 'Login Successful';
//     const message2 = 'Login Falied';

//     User.findOne({username: userLoginInfo.username, password: userLoginInfo.password}).then(function(err, response){
//         // console.log('Response ->', response);
//         if(err){
//             console.log('Login Successful');
//             res.send(`${message1}`);
//         } else {
//             console.log('Login Failed');
//             res.send(`${message2}`);
//         }
//     })
// });

app.get("/users/login/username/:username/password/:password", function(req,res){
    // userLoginInfo = req.body // object format (json)- {"username": usernameValue, "password": passwordValue} 
    console.log('Request body ->', req.params.username + " "+ req.params.password);
    const message1 = 'Login Successful';
    const message2 = 'Login Falied';

    User.findOne({username: req.params.username, password: req.params.password}).then(function(err, response){
        // console.log('Response ->', response);
        if(err){
            console.log('Login Successful');
            res.send(`${message1}`);
        } else {
            console.log('Login Failed');
            res.send(`${message2}`);
        }
    })
});


  
//updateTotalCostOfPurchase -> computes the total cost of purchase in the purchaseList of user object    
 app.patch('/users/totalCost/:userId', async function(req, res){
    let totalCost = 0;
    const response = await axios.get('http://localhost:3030/users/'+req.params.userId);
    const user = response.data;
    console.log('User data ->', user);

    for(let i = 0; i < user['purchaseList'].length; i++){
        totalCost+=Number(user['purchaseList'][i]['ticketPrice']);
    }


    User.updateOne({userId: req.params.userId}, 
        {$set: {purchasePrice: totalCost}} ).then(function(err){
        if(!err){
            res.send('Total Cost computed');
        } else {
            res.send(err);
        }
    })

    // res.sendStatus(200);
 });


//resetTotalCostOfPurchase -> resets purchasePrice field of user to 0    
app.patch('/users/resetTotalCost/:userId', async function(req, res){
    // let totalCost = 0;
    const response = await axios.get('http://localhost:3030/users/'+req.params.userId);
    const user = response.data;
    // console.log('User data ->', user);

    User.updateOne({userId: req.params.userId}, 
        {$set: {purchasePrice: 0}} ).then(function(err){
        if(!err){
            res.send('Purchase price is now reset');
        } else {
            res.send(err);
        }
    })

 });




https.createServer(options, app).listen(3030, () => {
    console.log(`Server started on port 3030`);
  });

//   Listener function
//   app.listen(3030, function(){
//       console.log('Server Started on port 3030');
//   });