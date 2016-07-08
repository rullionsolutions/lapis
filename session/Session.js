/*global x, _ */
"use strict";

x.session = {};

/**
* To represent a user interacting with the system
*/
x.session.Session = x.base.Base.clone({
    id                      : "Session",
    active                  : false,
    home_page_url           : "?page_id=home",
    max_inactive_interval   : (60 * 30)             // in seconds, 30 mins
//    allow_multiple_concurrent: false          -- not implemented until we have cross-app-server comms
});


x.session.Session.register("start");
x.session.Session.register("close");


x.session.Session.defbind("setupInstance", "cloneInstance", function () {
    if (!this.user_id) {
        this.throwError("user_id property required");
    }
    // this.prepareSpec(spec);
    this.active = true;
    this.visits = 0;
    this.messages   = x.session.MessageManager.clone({ id: this.id, session: this });
    this.page_cache = [];
    this.roles      = [];
    this.list_section = {};
    this.last_non_trans_page_url = this.home_page_url;
    this.getUserData();
    // this.persistSessionStart();

// if (!this.allow_multiple_concurrent && !spec.chameleon) {
//     if (this.closeAll(session.id, session.user_id) > 0) {
//         this.messages.add({ type: 'W', text: "You had other open sessions which have been now been closed" });
//     }
// }
    this.happen("start");
});


x.session.Session.define("prepareSpec", function (spec) {
    if (!spec.id) {
        spec.id = x.base.Format.getRandomNumber(10000000000);
    }
});


x.session.Session.define("getUserData", function (/*spec*/) {
    return undefined;
});


x.session.Session.define("getSessionId", function () {
    return this.id;
});


x.session.Session.define("addRole", function (role_id) {
    this.roles.push(x.session.Role.getRole(role_id));             // throws Error if role_id not registered
});


x.session.Session.define("addRoleProperties", function () {
    var i;
    this.roles.sort(function(a, b) {                    // sort roles by priority, lowest first
        return a.priority - b.priority;
    });
    for (i = 0; i < this.roles.length; i += 1) {
        if (this.roles[i].params) {
            this.addProperties(this.roles[i].params);
        }
    }
});


x.session.Session.define("isUserInRole", function (role_id) {
    return (this.roles.filter(function (role) { return role.id === role_id; }).length > 0);
});



x.session.Session.define("isAdmin", function (module_id) {
    var area = module_id && require("../data/Area").getArea(module_id),
        allowed = {
            access: this.isUserInRole("sysmgr")
        };

    if (area && area.security) {
        this.checkSecurityLevel(area.security, allowed, "area");
    }
    return allowed.access;
});


x.session.Session.define("recordAtInterval", function () {
    return undefined;
});


/**
* To close this session object, reporting any remaining messages, closing any open pages (and their transactions)
*/
x.session.Session.define("close", function () {
    if (!this.active) {
        return;
    }
    this.happen("close");
    this.newVisit(null, "Final Messages");
    this.updateVisit();            // report leftover messages
    this.persistSessionEnd();
    this.active = false;
});


x.session.Session.define("persistSessionEnd", function () {
    return undefined;
});


/**
* To check a specific security rule
* @params security rule object, allowed object, level string
*/
x.session.Session.define("checkSecurityLevel", function (obj, allowed, level) {   // §vani.core.7.2.6.3
    _.each(obj, function (role_access, role_id) {
        if (this.isUserInRole(role_id) && typeof role_access === "boolean") {
            allowed.found  = true;
            allowed.access = allowed.access || role_access;                  // §vani.core.7.2.6.4
            allowed.role   = (allowed.role ? allowed.role + ", " : "") + role_id;
        }
    });
    if (!allowed.found && typeof obj.all === "boolean") {               // §vani.core.7.2.6.5
        allowed.found  = true;
        allowed.access = obj.all;
        allowed.role   = "all";
    }
    if (allowed.found) {
        allowed.reason = "basic security at level: " + level + " for role(s) " + allowed.role;
    }
});


x.session.Session.define("logoutDueToInactivity", function () {
    return (((new Date()).getTime() - this.datetime_of_last_post) > (this.max_inactive_interval * 1000) && !this.pageCurrentlyInUpdate());
});


/**
* To indicate whether or not an error was ever recorded in this session
* @return 1 if this session's error_recorded property is true (set by a call to msg() with type: 'E'), or 0 otherwise
*/
x.session.Session.define("getFinalStatus", function () {
    return (this.messages.error_recorded ? "1" : "0");
});



x.session.Session.define("newVisit", function (/*page_id, page_title, params, page_key*/) {
    this.visits += 1;
    return this.visits;
});


x.session.Session.define("updateVisit", function (/*trans, start_time*/) {
    this.messages.clear("record");
});
