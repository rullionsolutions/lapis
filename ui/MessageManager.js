/*global x, _ */
"use strict";

x.ui.MessageManager = x.base.Base.clone({
    id              : "MessageManager",
    prefix          : ""
});


/**
* Initializes the main properties of this object
*/
x.ui.MessageManager.defbind("initialize", "cloneInstance", function () {
    this.messages = [];
    this.number = 0;
    this.error_recorded = false;
    this.error_recorded_since_clear = false;
});


/**
* To log a message to report to the user and/or visit history
* @param Message object containing at least 'text' property (a string), can also contain 'type' ('E', 'W' or 'I'), 'report', 'record', 'high_priority'
*/
x.ui.MessageManager.define("add", function (spec) {
    if (!spec.text) {
        this.throwError("Message must include a text property");
    }
    this.messages.push(spec);
    this.number += 1;
    if (!spec.type) {
        spec.type = "E";
    }
    if (spec.type === "E") {
        this.error_recorded = true;
        this.error_recorded_since_clear = true;
    }
    // if (this.prevent_reporting && !spec.high_priority) {
    //     spec.report = false;
    // }
});


/**
* To log a message corresponding to an exception
* @param Exception object (usually resulting from a caught throw)
*/
x.ui.MessageManager.define("report", function (exception) {
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
x.ui.MessageManager.define("updatePrefix", function (prefix) {
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
x.ui.MessageManager.define("getObj", function (prefix, obj) {
    var i,
        msg;

    obj    = obj || { msgs: [] };
    prefix = this.updatePrefix(prefix);

    this.chain(function (msg_mgr) {
        msg_mgr.getObj(prefix, obj);
    });

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
x.ui.MessageManager.define("getString", function (tag, separator, prefix, type) {
    var i,
        msg,
        out = "",
        delim = "";

    if (!separator) {
        separator = "\n";
    }
    prefix = this.updatePrefix(prefix);
    this.chain(function (msg_mgr) {
        var new_msgs = msg_mgr.getString(tag, separator, prefix, type);
        if (new_msgs) {
            out += delim + new_msgs;
            delim = separator;
        }
    });
    for (i = 0; i < this.messages.length; i += 1) {
        msg = this.messages[i];
        if ((!tag || msg[tag] !== false) && (!type || type === msg.type)) {
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
x.ui.MessageManager.define("addJSON", function (container, tag, prefix, type) {
    var i,
        msg,
        msg_out;

    prefix = this.updatePrefix(prefix);
    this.chain(function (msg_mgr) {
        msg_mgr.addJSON(container, tag, prefix, type);
    });
    function addProp(val, prop) {
        msg_out[prop] = val;
    }

    for (i = 0; i < this.messages.length; i += 1) {
        msg = this.messages[i];
        if ((!tag || msg[tag] !== false) && (!type || type === msg.type)) {
            msg_out = {};
            _.each(msg, addProp);
//            msg_out.type = msg.type;
            msg_out.text = (prefix ? prefix + ": " : "") + msg.text;
            container.push(msg_out);
        }
    }
});



x.ui.MessageManager.define("render", function (elmt, tag, prefix, type) {
    var i,
        msg,
        text = "",
        delim = "";

    prefix = this.updatePrefix(prefix);
    this.chain(function (msg_mgr) {
        msg_mgr.render(elmt, tag, prefix, type);
    });

    for (i = 0; i < this.messages.length; i += 1) {
        msg = this.messages[i];
        if ((!tag || msg[tag] !== false) && (!type || type === msg.type)) {
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
x.ui.MessageManager.define("clear", function (tag) {
    var n = 0,
        msg;

    this.error_recorded_since_clear = false;
    while (n < this.messages.length) {
        msg = this.messages[n];
        if (!msg.fixed) {
            if (tag) {
                msg[tag] = false;
            } else {
                msg.report = false;
                msg.record = false;
            }
        }
        if (msg.report === false && msg.record === false) {
            this.messages.splice(n, 1);
            this.number -= 1;
        } else {
            // TODO msg.fixed condition to be removed from the below, but currently it breaks the automated test
            if (msg.fixed && msg.type === "E") {
                this.error_recorded_since_clear = true;
            }
            n += 1;
        }
    }
});


/**
* Checks if there are warning messagges with the warn flag to false. if yes it returns true
* @return boolean out
*/
x.ui.MessageManager.define("firstWarnings", function () {
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


/**
* Empty property used to store a chain function
*/
x.ui.MessageManager.define("chain", function (funct) {
    return undefined;
});
