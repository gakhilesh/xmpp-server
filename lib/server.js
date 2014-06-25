var xmpp        = require('node-xmpp');

// Loading all modules needed
var Logger      = require('../modules/logger');
var Router      = require('../modules/router');
var Offline     = require('../modules/offline');
var Version     = require('../modules/version'); 
var Presence    = require('../modules/presence');
var Roster      = require('../modules/roster');
var DiscoInfo   = require('../modules/disco_info');
var VCard       = require('../modules/vcard');
var Websocket   = require('../modules/websocket');
var S2S         = require('../modules/s2s');
var Ping        = require('../modules/ping');

// Loading non -xmpp libraries
var User = require('../lib/users.js').User;
var Blind = require('../lib/blind').Blind;
exports.run = function(config, ready) {
    // Creates the server.
    var server = new xmpp.C2SServer(config);
    
    // Configure the mods at the server level!
    Router.configure(server, config.router); 
    Logger.configure(server, config.logger);
    Offline.configure(server, config.offline);
    Version.configure(server, config.version);
    Presence.configure(server, config.presence);
    Roster.configure(server, config.roster);
    DiscoInfo.configure(server, config.disco);
    VCard.configure(server, config.vcard);
    Websocket.configure(server, config.websocket);
    S2S.configure(server, config);
    Ping.configure(server, config.ping);
    
    
    // On Connect event. When a client connects.
    server.on("connect", function(client) {
        // Allows the developer to authenticate users against anything they want.
        client.on("authenticate", function(opts, cb) {
            // cb(null,opts);
            User.find(opts.jid, function(user) {
                if (user && user.attrs.password === opts.password){
                    return assignRandomUser(opts, cb);
                }
                else{
                    User.register(opts.jid, opts.password, {
                        success: function() {
                            assignRandomUser(opts, cb);
                        },
                        error: function() {
                            var err = new Error("conflict");
                            err.code = 409;
                            err.type = "cancel";
                            return cb(err);
                        }
                    });
                }
                    //cb(new Error("Authentication failure"));
            });
        });

        // Allows the developer to register the jid against anything they want
        client.on("register", function(opts, cb) {
            console.log("Registeration request received for opts:" , opts)
            User.register(opts.jid, opts.password, {
                success: function() {
                    cb(true);
                },
                error: function() {
                    var err = new Error("conflict");
                    err.code = 409;
                    err.type = "cancel";
                    cb(err);
                }
            });
        });
    });
    server.on("stanza", function(){

    });
    
    // On Disconnect event. When a client disconnects
    server.on("disconnect", function(client) {
        console.log("Bad to see you go ", client);
    });

    function assignRandomUser(opts, cb){
        console.log('Randomising!!')
        User.randomiser(function(err, jid2){
            if(err)
                return cb(null);
            else{
                jid2 = new xmpp.JID(jid2);
                console.log('Random ID:',jid2);
                if(opts.jid.local != jid2.local){
                    console.log('sending this to blinder', jid2, opts.jid);
                    Blind.register(opts.jid, jid2, {
                        success: function() {
                            cb(null, opts);
                        },
                        error: function() {
                            var err = new Error("conflict");
                            err.code = 409;
                            err.type = "cancel";
                            cb(err);
                        }
                    });
                }
                else{
                    console.log('Cant find anyone, Mr. Lonely');
                    cb(null, opts);
                }
            }
                
        });
    }
    // This is a callback to trigger when the server is ready. That's very useful when running a server in some other code.
    // We may want to make sure this is the right place for it in the future as C2S and S2S may not be abll ready.
    ready();
}


