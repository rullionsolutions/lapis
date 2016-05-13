/*global x, _ */
"use strict";

var Parent = require("../base/Base")
  , Page   = require("./Page")
  , Log    = require("../base/Log")
//  , Under  = require("underscore")
  ;

module.exports = Parent.clone({
    id              : "Page.Tab",
    label           : null,                         // Text label of button
    visible         : true,                         // Whether or not this tab is shown (defaults to true)
    purpose         : "Collection of page sections shown at the same time"
});


module.exports.define("render", function (parent_elmt, render_opts) {
    if (this.visible) {
        return parent_elmt.makeElement("li", (this.owner.page.page_tab === this ? "active" : null), this.id)
            .attr("role", "presentation")
            .makeElement("a").text(this.label);
    }
});


module.exports.define("getJSON", function () {
    var out = {};
    out.id = this.id;
    out.label = this.label;
    return out;
});


/**
* Create a new tab object in the owning page, using the spec properties supplied
* @param Spec object whose properties will be given to the newly-created tab
* @return Newly-created tab object
*/
Page.tabs.override("add", function (spec) {
    var tab;
    if (!spec.label) {
        this.throwError("Tab label must be specified in spec");
    }
    tab = module.exports.clone(spec);
    require("../base/OrderedMap").add.call(this, tab);
    return tab;
});



Page.define("renderTabs", function (parent_elmt, render_opts) {
    var elmt;
    this.tabs.each(function (tab) {
        Log.trace("render tab: " + tab.id + ", visible? " + tab.visible);
        if (tab.visible) {
            elmt = elmt || parent_elmt.makeElement("div", "css_hide", "css_payload_page_tabs");
            tab.render(elmt, render_opts);
        }
    });
});
//Page.bind("renderTabs", "renderStart");


//To show up in Chrome debugger...
//@ sourceURL=page/Tab.js