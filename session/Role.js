/*jslint node: true */
/*global java */
"use strict";
var Parent       = require("../base/Base")
  , Log          = require("../base/Log")
  , OrderedMap   = require("../base/OrderedMap")
  ;

/**
* To represent a functional area of the system
*/

module.exports = Parent.clone({
    id                      : "Role",
    title                   : null,                     // name of this role
    params                  : null,                     // role-specific parameter object
    priority                : 0,
    roles                   : OrderedMap.clone({ id: "roles" })          // singleton - not to be cloned!
});


module.exports.define("registerRole", function (role_spec_obj) {
    if (this.roles.get(role_spec_obj.id)) {
        this.throwError("area already registered: " + role_spec_obj.id);
    }
    this.roles.add(module.exports.clone(role_spec_obj));
});


module.exports.define("getRole", function (id) {
    if (!this.roles.get(id)) {
        this.throwError("role not registered: " + id);
    }
    return this.roles.get(id);
});
