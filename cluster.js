var xmpp = require('node-xmpp');
var sys = require("sys");
var redis = require("redis-node");
var redispub = redis.createClient();   
var redissub = redis.createClient();   
 
var port =  parseInt(process.argv[process.argv.length - 1]);
 
if(isNaN(port)) {
    console.log("You need to supply a port!")
    process.exit();
}
 
console.log("Starting node on " + port);
 
var c2s = new xmpp.C2S({
    port: port, // Start on the port given in param
    domain: 'mycluster.com',
});
 
c2s.on("authenticate", function(jid, password, client) {
    if(password == "password") {
        client.emit("auth-success", jid); 
    }
    else {
        client.emit("auth-fail", jid);
    }
});
 
 
xmpp.C2S.prototype.route = function(stanza) {
    var self = this;
    if(stanza.attrs && stanza.attrs.to) {
        var toJid = new xmpp.JID(stanza.attrs.to);
        redispub.publish(toJid.bare().toString(), stanza.toString());
    }
}
 
xmpp.C2S.prototype.registerRoute = function(jid, client) {
    redissub.subscribeTo(jid.bare().toString(), function(channel, stanza, pattern) {
        client.send(stanza);
    });
    return true;
}
