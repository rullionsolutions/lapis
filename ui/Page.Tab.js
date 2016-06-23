/*global x, _ */
"use strict";


x.ui.Page.Tab = x.base.Base.clone({
    id              : "Page.Tab",
    label           : null,                         // Text label of button
    visible         : true,                         // Whether or not this tab is shown (defaults to true)
    purpose         : "Collection of page sections shown at the same time"
});


x.ui.Page.Tab.define("render", function (parent_elmt) {
    var css_class = (this.owner.page.page_tab === this ? "active" : "");
    if (!this.element) {
        this.element = parent_elmt.makeElement("li");
    }
    this.element.empty();
    if (!this.visible) {
        css_class += " hidden";
    }
    this.element.attr("class", css_class);
    this.element.attr("role", "presentation");
    this.element.makeElement("a").text(this.label);
});


x.ui.Page.Tab.define("getJSON", function () {
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
x.ui.Page.tabs.override("add", function (spec) {
    var tab;
    if (!spec.label) {
        this.throwError("Tab label must be specified in spec");
    }
    tab = x.ui.Page.Tab.clone(spec);
    x.ui.Page.tabs.parent.add.call(this, tab);
    return tab;
});


//To show up in Chrome debugger...
//# sourceURL=page/Tab.js