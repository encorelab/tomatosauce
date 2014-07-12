/*jshint node:true */

"use strict";

var SERIALPORT = null;
//var SERIALPORT = '/dev/tty.usbmodemfd131';
//var SERIALPORT = '/dev/tty.usbserial-A6006klc';

// FIXME: this is in bad need of a rewrite

var util = require('util');
var events = require('eventemitter2');
var color = require('cli-color');

var os = require('os');
var fs = require('fs');
// read config.json
var config = JSON.parse(fs.readFileSync('./config.json'));
var exec = require('child_process').exec;

// grab information from user
var argv = require('optimist')
  .usage('Usage:\n\t$0 username')
  .demand(0)
  .argv;

var username = argv._[0];

// var sp;
// var chat;

// var HOST = process.argv[4] || "badger.encorelab.org";
// var USER = process.argv[2];
// var NICK = USER;
// var PASSWORD = process.argv[3];

// if (!PASSWORD) {
//   console.error("\nUsage: node tomato.js USERNAME PASSWORD [HOSTNAME]\n");
//   process.exit(1);
// }

// setting up Drowsy and Wakeful
// var Drowsy = require('backbone.drowsy').Drowsy;
var Wakeful = require('backbone.drowsy/wakeful').Wakeful;
// pull in models
var PP = {};
PP.Model = require('./models/js/tangible.model.js').PP.Model;

var states = null;
var user_state;


function RPA () {
  events.EventEmitter2.call(this);

  this.arduinoSaidHello = false;

  this.winCount = 0;
  this.loseCount = 0;

  this.opponent = undefined;

  this.yourWeapon = undefined;
  this.theirWeapon = undefined;
}
util.inherits(RPA, events.EventEmitter2);

RPA.Arduino = require('./tomato.arduino').Arduino;
// RPA.Groupchat = require('./tomato.xmpp').Groupchat;


RPA.prototype.initModels = function () {
  // Wakeful connection via EvoRoom.Model that allows to receive change triggers
  PP.Model.init(config.drowsy.url, config.database).then(function () {
    PP.Model.initWakefulCollections(config.wakeful.url).then(function() {
      // grab awake contributions collection
      // var contributions = PP.Model.awake.contributions;
      // console.log('We have '+contributions.length+' contributions ...');

      // grab awake states collection
      states = PP.Model.awake.states;
      // // go over all user states and preset the doingStuffForUser object
      // // which is later used to lock user to avoid problems of double triggered events
      user_state = states.findWhere({'username': username});

      if (user_state) {
        user_state.set('presence', 'online');
        user_state.save();
      } else {
        user_state = new PP.Model.State({'username': username, 'presence': 'online'});
        user_state.wake(config.wakeful.url);
        user_state.save();
        states.push(user_state);
      }


      // // register change and add events to trigger function assigning tag bucket items
      states.on('change add', function (state){
        console.log('Change of state object');
        // console.log(state);
      });

      // // when starting up check all state object if any of them requires the agent to perfom an action
      // states.each(updateStateStuff);
    });
  });

};


RPA.prototype.connectToArduino = function () {
  this.arduino = new RPA.Arduino();

  var rpa = this;

  function log(msg, data) {
    if (data)
      console.log(color.yellowBright("[Arduino] "+msg), util.inspect(data, true, null, true));
    else
      console.log(color.yellowBright("[Arduino] "+msg));
  }

  this.arduino
    .on('online', function () {
      log("Arduino is online");
    })
    .on('tomato_present', function (data) {
      log("Your tomato is now present and ready for a session");

      user_state = rpa.retrieveUserStateForRfidId(data);

      user_state.set('presence', 'present');
      user_state.save();

      // if (!rpa.chat) {
      //   rpa.connectToGroupchat();
      //   rpa.chat.once('connected', function () {
      //     rpa.chat.enter();
      //   });
      // } else {
      //   rpa.chat.enter();
      // }

      // rpa.arduino.writeEvent('you_are_present');
    })
    .on('absent', function () {
      log("You are now absent");

      user_state.set('presence', 'absent');
      user_state.save();

      // if (rpa.chat) {
      //   rpa.chat.leave();
      //   rpa.arduino.writeEvent('you_are_absent');
      // }
    })
    .on('abort_tomato', function () {
      log("You are aborting the tomato session for everyone :/");
    });


  this.arduino.detectSerialport();
  this.arduino.openSerialport();
};

// RPA.prototype.connectToGroupchat = function () {
//   this.chat = new RPA.Groupchat(USER, PASSWORD, HOST, NICK);

//   var rpa = this;

//   function log(msg, data) {
//     if (data)
//       console.log(color.magentaBright("[XMPP] "+msg), util.inspect(data, true, null, true));
//     else
//       console.log(color.magentaBright("[XMPP] "+msg));
//   }

//   this.chat.log = log;

//   // this.chat.onAny(function (sev) {
//   //   //rpa.arduino.emit(this.event, data);
//   //   if (sev && sev.payload)
//   //     rpa.arduino.writeEvent(this.event, sev.payload);
//   //   else
//   //     rpa.arduino.writeEvent(this.event);
//   // });

//   this.chat
//     .on('opponent_joined_groupchat', function (jid) {
//       rpa.opponent = jid;
//       rpa.arduino.writeEvent('opponent_is_present', jid.resource);
//     })
//     .on('opponent_left_groupchat', function (jid) {
//       rpa.opponent = jid;
//       rpa.arduino.writeEvent('opponent_is_absent', jid.resource);
//     })
//     .on('sail_event', function (sev) {
//       var eventType = sev.eventType;
//       var payload = sev.payload;

//       if (eventType == 'choice') {
//         log("Opponent chose ", payload);
//         rpa.theirWeapon = payload;

//         rpa.arduino.writeEvent('opponent_chooses_weapon', payload[0]);
//         rpa.checkOutcome();
//       }
//     });

//   this.chat.connect();
// };

// RPA.prototype.checkOutcome = function () {
//   if (this.yourWeapon && this.theirWeapon) {
//     if (this.yourWeapon === this.theirWeapon) {
//       this.arduino.writeEvent('tie');
//     } else if (this.yourWeapon === "Rock" && this.theirWeapon === "Scissors" ||
//         this.yourWeapon === "Paper" && this.theirWeapon === "Rock" ||
//         this.yourWeapon === "Scissors" && this.theirWeapon === "Paper") {
//       this.arduino.writeEvent('you_win');
//       this.winCount++;
//     } else {
//       this.arduino.writeEvent('you_lose');
//       this.loseCount++;
//     }

//     this.yourWeapon = undefined;
//     this.theirWeapon = undefined;

//     // TODO: should we really do this?
//     rpa.arduino.writeEvent('you_are_present');
//     rpa.arduino.writeEvent('opponent_is_present');
//   }
// };

RPA.prototype.retrieveUserStateForRfidId = function (rfid_id) {
  user_state = states.findWhere({'rfid_id': rfid_id});

  if (user_state) {
    return user_state;
  } else {
    return new Error("Unable to find user state object for rfid ID "+rfid_id);
  }
};

var rpa = new RPA();
rpa.initModels();
rpa.connectToArduino();

// Via this website
// http://stackoverflow.com/questions/10594751/node-js-intercepting-process-exit
process.on('SIGINT', function() {
    console.log('Received Signal to exit program');

    user_state.set('presence', 'offline');
    user_state.save()
      .done(function(response) {
        console.log("Tried to update state to offline and received the following response: ");
        console.log(response);
        process.exit(1);
      });

    // setTimeout(function() {
    //     console.log('Exit');
    //     process.exit(1);
    // }, 10000);
});
