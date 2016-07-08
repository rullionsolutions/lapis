/*global x, _ */
"use strict";


x.session = x.session || {};


x.session.MessageManager = x.base.Base.clone({
    id              : "MessageManager",
    prefix          : ""
});


/**
* Initializes the main properties of this object
*/
x.session.MessageManager.defbind("initialize", "cloneInstance", function () {
    this.messages = [];
    this.error_recorded = false;
});


/**
* To log a message to report to the user and/or visit history
* @param Message object containing at least 'text' property (a string), can also contain 'type' ('E', 'W' or 'I'), 'report', 'record', 'high_priority'
*/
x.session.MessageManager.define("add", function (spec) {
    if (!spec.text) {
        this.throwError("Message must include a text property");
    }
    this.messages.push(spec);
    if (!spec.type) {
        spec.type = "E";
    }
    if (spec.type === "E") {
        this.error_recorded = true;
    }
});


/**
* To log a message corresponding to an exception
* @param Exception object (usually resulting from a caught throw)
*/
x.session.MessageManager.override("report", function (exception) {
    var spec = { type: "E", text: exception.toString() };
// next line causes: Java class "[Lorg.mozilla.javascript.ScriptStackElement;" has no public instance field or method named "toJSON". (../R6_10/core/io/HttpServer.js#403)
//    Parent.addProperties.call(spec, exception);
    this.add(spec);
    return spec;
});


/**
* Returns the input prefix concatenated with the this.prefix string
* @param prefix string
* @return new prefix string
*/
x.session.MessageManager.define("updatePrefix", function (prefix) {
    if (typeof prefix === "string") {
        if (prefix && this.prefix) {
            prefix += ", ";
        }
        if (this.prefix) {
            prefix += this.prefix;
        }
    } else {
        prefix = "";
    }
    return prefix;
});


/**
* creates an object starting from the messages array adding on each message the prefix passed as input
* @param message object
* @return The same object passed as input or a new one if undefined
*/
x.session.MessageManager.define("getObj", function (prefix, obj) {
    var i,
        msg;

    obj    = obj || { msgs: [] };
    prefix = this.updatePrefix(prefix);

    for (i = 0; i < this.messages.length; i += 1) {
        msg = this.messages[i];
        if (prefix) {
            if (obj.hasOwnProperty(msg.text)) {
                obj[msg.text].push(prefix);
            } else {
                obj[msg.text] = [prefix];
            }
        } else {
            obj.msgs.push(msg.text);
        }
    }

    return obj;
});


/**
* To get a string of the messages in this MessageManager, added by calls to add()
* @param tag: string (to control message removal); separator: string to separate each message, defaults to newline
* @return message string
*/
x.session.MessageManager.define("getString", function (separator, prefix, type) {
    var i,
        msg,
        out = "",
        delim = "";

    if (!separator) {
        separator = "\n";
    }
    prefix = this.updatePrefix(prefix);
    for (i = 0; i < this.messages.length; i += 1) {
        msg = this.messages[i];
        if (!type || (type === msg.type)) {
            out += delim + (prefix ? prefix + ": " : "") + msg.text;
            delim = separator;
        }
    }
    return out;
});


/**
* Copies each message object (selected by tag and type) of the this.messages array in the container input array with the message.text prefixed
* @param container array, tag string, prefix string, message type string
*/
x.session.MessageManager.define("addJSON", function (container, prefix, type) {
    var i,
        msg,
        msg_out;

    prefix = this.updatePrefix(prefix);
    function addProp(val, prop) {
        msg_out[prop] = val;
    }

    for (i = 0; i < this.messages.length; i += 1) {
        msg = this.messages[i];
        if (!type || (type === msg.type)) {
            msg_out = {};
            _.each(msg, addProp);
//            msg_out.type = msg.type;
            msg_out.text = (prefix ? prefix + ": " : "") + msg.text;
            container.push(msg_out);
        }
    }
});


x.session.MessageManager.define("render", function (elmt, prefix, type) {
    var i,
        msg,
        text = "",
        delim = "";

    prefix = this.updatePrefix(prefix);
    for (i = 0; i < this.messages.length; i += 1) {
        msg = this.messages[i];
        if (!type || (type === msg.type)) {
            text += delim + msg.text;
            delim = "\n";
            // elmt.makeElement("div")
            //     .attr("data-msg-type", msg.type)
            //     .text((prefix ? prefix + ": " : "") + msg.text, true);      // allow full HTML markup
        }
    }
    if (text) {
        elmt.makeElement("span", "help-block css_client_messages").text(text);
    }
});


/**
* Removes each message tagged with same tag as passed as input
* @param tag: string (to control message removal)
*/
x.session.MessageManager.define("clear", function () {
    this.messages = [];
    this.error_recorded = false;
});


/**
* Checks if there are warning messagges with the warn flag to false. if yes it returns true
* @return boolean out
*/
x.session.MessageManager.define("firstWarnings", function () {
    var msg,
        i,
        out = false;

    for (i = 0; i < this.messages.length; i += 1) {
        msg = this.messages[i];
        if (msg.type === 'W' && msg.warned !== true) {
            msg.warned = true;
            out = true;
        }
    }
    this.chain(function (msg_mgr) {
        out = msg_mgr.firstWarnings() || out;
    });
    return out;
});
