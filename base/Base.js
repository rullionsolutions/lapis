/*global x, _, print */
"use strict";

var x;
if (!x) {
    x = {};
}
x.base = x.base || {};

/**
* Top-level Archetype object, from which all others should be cloned
*/
x.base.Base = {
    id : "Base"
};

// sanity check method - ensures key doesn't already exist anywhere in prototype chain
x.base.Base.define = function (key, value) {
    if (this[key] !== undefined) {
        this.throwError("key already exists in prototype chain: " + key);
    }
    this[key] = value;
    return value;
};

// sanity check method - ensures key doesn't already exist in this object
x.base.Base.override = function (key, value) {
    if (this.hasOwnProperty(key)) {
        this.throwError("key already exists in object: " + key);
    }
    if (this[key] === undefined) {
        this.throwError("key does not exist in prototype chain: " + key);
    }
    if (typeof this[key] !== typeof value) {
        this.throwError("value's typeof is not the same as original value's: " + key);
    }
    this[key] = value;
    return value;
};

// sanity check method - reassign key if it already exist in this object
x.base.Base.reassign = function (key, value) {
    if (!this.hasOwnProperty(key)) {
        this.throwError("key does not exist in object: " + key);
    }
    if (typeof this[key] !== typeof value) {
        this.throwError("value's typeof is not the same as original value's: " + key);
    }
    this[key] = value;
    return value;
};


/**
* Create a new object inherited from this one
* @param spec: object map of properties to be set in the new object
* @return Newly cloned object
*/
x.base.Base.define("clone", function (spec) {
    var obj;
    if (typeof spec !== "object") {
        this.throwError("clone requires spec object");
    }
    if (typeof spec.id !== "string" || spec.id === "") {
        this.throwError("clone requires id");
    }
    if (this.instance) {
        this.throwError("cannot clone instance");
    }
    obj = Object.create(this);
    obj.parent = this;
    if (typeof obj.addProperties !== "function") {
        this.throwError("suspect new keyword used");
    }
    if (spec) {
        obj.addProperties(spec);
    }
    if (obj.instance) {
        obj.afterCloneInstance();
    } else {
        obj.afterCloneType();
    }
    return obj;
});


// hooks for Happen...
x.base.Base.define("afterCloneInstance", function () { return undefined; });
x.base.Base.define("afterCloneType"    , function () { return undefined; });


/**
* Remove this object from its owning OrderedMap (if there is one), as identified by the 'owner' property
*/
x.base.Base.define("remove", function () {
    if (!this.owner || typeof this.owner.remove !== "function") {
        this.throwError("no owner with a remove() function");
    }
    this.owner.remove(this.id);
});


/**
* Output a string representation of the object, including all its ancesters, delimited by '/'s
* @return String representation of the object
*/
x.base.Base.override("toString", function () {
    var out = "",
        level = this;

    while (level) {
        out = "/" + level.id + out;
        level = level.parent;
    }
    return out;
});


/**
* Add the given properties to this object
* @param spec: object map of properties to add
*/
x.base.Base.define("addProperties", function (spec) {
    _.extend(this, spec);
    // var that;
    // _.each(spec, function (value, key) {
    //     that[key] = value;
    // });
});


/**
* Return string argument with tokens (delimited by braces) replaced by property values
* @param str: string argument, possibly including tokens surrounded by braces
* @return String argument, with tokens replaced by property values
x.base.Base.define("detokenize", function (str, replaceToken) {
    var regex = /\{[a-zA-Z0-9_\.\/\| ]+?\}/g,         // replace(regex, callback) doesn't seem to support capturing groups
        that = this;

    if (typeof str !== "string") {
        this.throwError("invalid argument");
    }
    if (typeof replaceToken !== "function") {
        replaceToken = this.replaceToken;
    }
    return str.replace(regex, function (token) {
        return replaceToken.call(that, token);
    });
});
*/


x.base.Base.define("detokenize", function (str, replaceToken, replaceNonToken) {
    var out = "",
        buffer = "",
        inside_braces = false,
        i;

    if (typeof str !== "string") {
        this.throwError("invalid argument");
    }
    replaceToken    = replaceToken    || this.replaceToken;
    replaceNonToken = replaceNonToken || function (str) { return str; };

    for (i = 0; i < str.length; i += 1) {
        if (str[i] === "}" && inside_braces && buffer && i > 0 && str[i - 1] !== "\\") {
            out += replaceToken.call(this, buffer, out);
            buffer = "";
            inside_braces = false;
        } else if (str[i] === "{" && !inside_braces && (i === 0 || str[i - 1] !== "\\")) {
            out += replaceNonToken.call(this, buffer, out);
            buffer = "";
            inside_braces = true;
        } else {
            buffer += str[i];
        }
    }
    return out + replaceNonToken.call(this, buffer, out);
});



x.base.Base.define("replaceToken", function (token) {
    return (typeof this[token] === "string" ? this[token] : "{unknown: " + token + "}");
});


/**
* Return a string representation of this object's properties, by calling toString() on each
* @return String representation of this object's properties
*/
x.base.Base.define("view", function (format) {
    var str   = (format === "block" ? "" : "{"),
        delim = "";

    _.each(this, function (value, key) {
        if (typeof value !== "function") {
            str += delim + key + "=" + value;
            delim = (format === "block" ? "\n" : ", ");
        }
    });
    return str + (format === "block" ? "" : "}");
});



x.base.Base.define("output", function (str) {
    if (typeof console !== "undefined") {
        console.log(str);
    } else if (typeof print === "function") {
        print(str);
    }
});


// overcome issues with strack traces
x.base.Base.define("throwError", function (str_or_spec) {
    var new_exc;
    if (typeof console) {
        throw str_or_spec;
    }
    try {
        this.throwErrorFunctionDoesntExist();       // this function is expected to NOT EXIST
    } catch (e) {                           // so a TypeError is thrown here, which includes a stack trace
        new_exc = new Error();
        new_exc.stack = e.stack.split("\n");
        new_exc.stack.shift();
        new_exc.stack = new_exc.stack.join("\n");
        new_exc.object = this;
        // delete e.lineNumber;
        // delete e.fileName;
//        delete e.rhinoException;    // didn't work - uneditable?
        // e.rhinoException = null;

        if (typeof str_or_spec === "string") {
            new_exc.message = str_or_spec;
        } else {
            new_exc.message = str_or_spec.text;
            this.addProperties.call(new_exc, str_or_spec);
        }
        throw new_exc;
    }
});


// should be static
/**
* Return an object from the global memory structure using a fully-qualified string
* @param Fully-qualified string, beginning with 'x.'
* @return Object referenced by the string, throwing an x.Exception if not found
*/
x.base.Base.define("getObject", function (str) {
    var parts,
        obj,
        i;

    if (typeof str !== "string") {
        this.throwError("invalid argument");
    }
    parts = str.split(".");
    if (parts[0] !== "x") {
        this.throwError("invalid ref string");
    }
    obj = this;
    for (i = 1; i < parts.length; i += 1) {
        if (!obj[parts[i]]) {
            this.throwError("invalid ref string");
        }
        obj = obj[parts[i]];
    }
    return obj;
});


/**
* To check if an Object is a descendant of another, through its parent property
* @param Object
* @return Boolean true if descendant false otherwise
*/
x.base.Base.define("isDescendantOf", function (obj) {
    return !!this.parent && (this.parent === obj || this.parent.isDescendantOf(obj));
});


x.base.Base.define("getNullPromise", function (resolve_arg) {
    return new Promise(function (resolve /*, reject*/) {
        resolve(resolve_arg);
    });
});

