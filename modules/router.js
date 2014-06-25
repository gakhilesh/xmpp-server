var xmpp = require('node-xmpp');
var ltx = require('ltx');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Blind = require('../lib/blind').Blind;
// var debug = require('debug')('router');
// server.router = new Router(server); // Using the right C2S Router.


/**
* C2S Router */
function Router(server) {
    this.sessions = {};
    this.server = server;
}
util.inherits(Router, EventEmitter);

/**
* Routes messages */
Router.prototype.route = function(stanza, from) {

    var self = this;
    stanza.attrs.xmlns = 'jabber:client';
    console.log('**********************',from.jid.local);
    Blind.find(from.jid.local, function(jid){
        console.log('~~~~~~~~~~~~~~~~~~~~~~~~',jid.jid);

        // if (stanza.attrs && stanza.attrs.to && stanza.attrs.to !== this.server.options.domain) {
        
        // var toJid = 'lakshay@localhost';// = new xmpp.JID(stanza.attrs.to);
        // console.log("stanza.attrs.to: ",stanza.attrs.to);
        // if(stanza.attrs.to){
        //     User.randomiser(console.log);
        //     console.log("Random Person found:",randomJid);
        //     toJid = new xmpp.JID(randomJid);
        //     stanza.attrs.to = randomJid;
        // }
            toJid = stanza.attrs.to = jid.jid;
            toJid = new xmpp.JID(toJid)
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>',toJid);
            from.send(stanza);
        // console.log("tojid:",stanza.attrs.to,toJid, User.randomiser());
        // console.log(toJid.domain,this.server.options.domain);
            // if(toJid.domain === this.server.options.domain) {
            //     // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>',self.sessions);
            //     if (self.sessions.hasOwnProperty(toJid.bare().toString())) {
            //         // Now loop over all the sesssions and only send to the right jid(s)
            //         var sent = false, resource;
            //         for (resource in self.sessions[toJid.bare().toString()]) {
            //             // console.log('resource:',resource);
            //                // console.log(toJid.toString(),toJid.bare().toString());
            //             if (toJid.bare().toString() === toJid.toString() || toJid.resource === resource) {
            //                 self.sessions[toJid.bare().toString()][resource].send(stanza); 
            //                 sent = true;
            //             }
            //         }
            //         // We couldn't find a connected jid that matches the destination. Let's send it to everyone
            //         // if (!sent) {
            //         //     for (resource in self.sessions[toJid.bare().toString()]) {
            //         //         self.sessions[toJid.bare().toString()][resource].send(stanza); 
            //         //         sent = true;
            //         //     }                
            //         // }
            //         // We couldn't actually send to anyone!
            //         if (!sent) {
            //             delete self.sessions[toJid.bare().toString()];
            //             self.emit("recipientOffline", stanza);
            //         }
            //     }
            //     else {
            //         self.emit("recipientOffline", stanza);
            //     }
            // }
            // else {
            //     self.emit("externalUser", stanza)
            // }
        // }
        // else {
        //     // Huh? Who is it for? and why did it end up here?
        //     // TODO: reply with error
        // }
    });
    // console.log("all done with this stanza");
};

/**
 * Registers a route (jid => specific client connection)
 */
Router.prototype.registerRoute = function(jid, client) {
    // What if we have a conflict! TOFIX
    if (!this.sessions.hasOwnProperty(jid.bare().toString()))
        this.sessions[jid.bare().toString()] = {}; 
        
    this.sessions[jid.bare().toString()][jid.resource] = client;
    return true;
};

/**
 * Returns the list of jids connected for a specific jid.
 */
Router.prototype.connectedClientsForJid = function(jid) {
    jid = new xmpp.JID(jid);
    if (!this.sessions.hasOwnProperty(jid.bare().toString())) {
        return [];
    }
    else {
        var jids = [];
        for(var resource in this.sessions[jid.bare().toString()]) {
            jids.push(new xmpp.JID(jid.bare().toString() + "/" + resource));
        }
        return jids;
    }
};

/**
 * Unregisters a route (jid => specific client connection)
 */
Router.prototype.unregisterRoute = function(jid, client) {
    if (!this.sessions.hasOwnProperty(jid.bare().toString())) {
        // Hum. What? That can't be.
    } else {
        delete this.sessions[jid.bare().toString()][jid.resource];
    }
    return true;
};


exports.configure = function(server, config) {
    var router = new Router(server); // Using the right C2S Router.
    server.on('connect', function(client) {
        // When the user is online, let's register the route. there could be other things involed here... like presence! 
        client.on('online', function() {
            router.registerRoute(client.jid, client);
        });
        
        // When the user is offline, we remove him from the router.
        client.on('end', function() {
            if(client.jid) {
                // We may not have a jid just yet if the client never connected before
                router.unregisterRoute(client.jid, client);
            }
        });

        // this callback is called when the client sends a stanza.
        client.on('stanza', function(stanza) {
               // client.send(new xmpp.Message({ type: 'chat' }).c('body').t('Hello there, little client.'))
                router.route(stanza, client);  // Let's send the stanza to the router and let the router decide what to do with it.
        });
    });
    server.router = router; // We attach the router to the server. (Maybe we want to use an event for this actually to indicate that a new router was attached to the server?)
    server.emit("c2sRoutersReady", router);
}

