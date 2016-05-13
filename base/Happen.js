/*global x, _ */
"use strict";


x.base.Base.define("happens", {
    clone: [],                      // 'clone' Happen comes ready-registered
    cloneInstance: [],
    cloneType: []
});


x.base.Base.reassign("afterCloneInstance", function () {
    this.happens = {};                   // map of event ids (registered to this) to arrays of bound funct_prop_ids
    this.happen("clone");
    this.happen("cloneInstance");
});

x.base.Base.reassign("afterCloneType"    , function () {
    this.happens = {};                   // map of event ids (registered to this) to arrays of bound funct_prop_ids
    this.happen("clone");
    this.happen("cloneType");
});


// returns true iff happen_id is registered to this object or any ancestor Happening
x.base.Base.define("hasHappen", function (happen_id) {
    if (this.happens[happen_id]) {
        return true;
    }
    if (typeof this.parent === "object" && typeof this.parent.hasHappen === "function") {
        return this.parent.hasHappen(happen_id);
    }
    return false;
});


// declare event string on this, so that it can be fired and functions bound to it
// a happen_id can only be registered once in any prototype chain
// but functions can be bound to it at various levels in the chain
// - happen() calls them from the top down...
x.base.Base.define("register", function (happen_id) {
    if (this.hasHappen(happen_id)) {
        this.throwError("happen already registered: " + happen_id);
    }
    this.happens[happen_id] = [];
});


// bind function with property funct_prop_id on this to string event, if funct is not already
x.base.Base.define("bind", function (funct_prop_id, happen_id) {
    if (!this.hasHappen(happen_id)) {
        this.throwError("happen not registered: " + happen_id);
    }
    if (this.boundTo(funct_prop_id)) {
        this.throwError("function already bound: " + funct_prop_id);
    }
    if (!this.happens[happen_id]) {
        this.happens[happen_id] = [];
    }
    this.happens[happen_id].push(funct_prop_id);
});


// unbind funct_prop_id function from Happen; function remains in this
x.base.Base.define("unbind", function (funct_prop_id) {
    var out = false;
    _.each(this.happens, function (happens_array /*, happen_id*/) {
        var index = happens_array.indexOf(funct_prop_id);
        if (!out && index > -1) {
            happens_array.splice(index, 1);
            out = true;
        }
    });
    if (typeof this.parent === "object" && typeof this.parent.unbind === "function") {
        return this.parent.unbind(funct_prop_id);
    }
    return out;
});


x.base.Base.define("defbind", function (funct_prop_id, happen_id, funct) {
    this.define(funct_prop_id, funct);
    this.bind(funct_prop_id, happen_id);
});


// returns the happen_id to which the referenced function is bound, or null
x.base.Base.define("boundTo", function (funct_prop_id) {
    var out = null;
    _.each(this.happens, function (happens_array, happen_id) {
        if (!out && happens_array.indexOf(funct_prop_id) > -1) {
            out = happen_id;
        }
    });
    if (!out && typeof this.parent === "object" && typeof this.parent.boundTo === "function") {
        return this.parent.boundTo(funct_prop_id);
    }
    return out;
});


// call all functions bound to event_id, from top ancester Happen down, in order of binding
x.base.Base.define("happen", function (happen_id, spec, context) {
    var that = this,
        cont;

    context = context || this;
    if (!this.hasHappen(happen_id)) {
        this.throwError("happen not registered: " + happen_id);
    }
    if (typeof this.parent === "object" && typeof this.parent.happen === "function" && this.parent.hasHappen(happen_id)) {
        cont = this.parent.happen(happen_id, spec, context);
    }
    // must only execute happans bound to this object, NOT ancestors - those dealt with above
    _.each(this.happens[happen_id], function (funct_prop_id) {
        if (cont !== false) {
            that.trace("happen(" + happen_id + ", " + context + ") -> " + funct_prop_id + "()");
            if (typeof context[funct_prop_id] !== "function") {
                that.throwError(context + "." + funct_prop_id + " is not a function");
            }
            cont = context[funct_prop_id](spec);
        }
    });
    return cont;
});


x.base.Base.define("happenAsync", function (happen_id, promise, arg, context) {
    context = context || this;
    if (!this.hasHappen(happen_id)) {
        this.throwError("happen not registered: " + happen_id);
    }
    if (typeof promise !== "object" || typeof promise.then !== "function") {
        this.throwError("no promise passed in");
    }
    if (typeof this.parent === "object" && typeof this.parent.happenAsync === "function" && this.parent.hasHappen(happen_id)) {
        promise = this.parent.happenAsync(happen_id, promise, arg, context);
    }
    // must only execute happans bound to this object, NOT ancestors - those dealt with above
    function callAsync(funct_prop_id) {
        context.debug("Happen: " + happen_id + " chaining: " + funct_prop_id + " on: " + context);
        promise = promise.then(function () {
            var resp = context[funct_prop_id](arg);
            context.debug("Happen: " + happen_id + " called: " + funct_prop_id + " on: " + context + ", returned: " + (typeof resp));
            if (resp) {
                if (typeof resp.then !== "function") {
                    context.throwError("function called from happenAsync must return a promise: " + funct_prop_id);
                }
                return resp;
            }
            return true;
        });
        if (!promise) {
            context.fatal("no promise object returned");
        }
    }
    _.each(this.happens[happen_id], callAsync);
    return promise;
});
