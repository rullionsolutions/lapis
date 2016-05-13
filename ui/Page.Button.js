/*global x, _ */
"use strict";

var Parent = require("../base/Base")
  , Page   = require("./Page")
  , Log    = require("../base/Log")
//    , Under  = require("underscore")
  ;

x.ui.Button = x.base.Base.clone({
    id              : "Button",
    label           : null,                         // Text label of button
    visible         : true,                         // Whether or not this tab is shown (defaults to true)
    purpose         : "Button on this page"
});


/**
* Generate HTML output for this page button
* @param xmlstream div element object to contain the buttons; render_opts
*/
x.ui.Button.define("render", function (parent_elmt, render_opts) {
    var button_elmt,
        css_class = (this.css_class ? this.css_class + " " : "") + "btn css_cmd";

    if (this.main_button) {
        css_class += " btn_primary css_button_main";
    }
//    button_elmt = parent_elmt.makeElement("button", css_class, this.id);
//    button_elmt.data("bind_object", this);
    // if (this.target) {
    //     button_elmt.attr("target", this.target);
    // }
    // button_elmt.text(this.label);
    button_elmt = parent_elmt.addChild("button", this.id, css_class);
    if (this.target) {
        button_elmt.attribute("target", this.target);
    }
    if (this.confirm_text) {
        button_elmt.attribute("data-confirm-text", this.confirm_text);
    }
    button_elmt.addText(this.label);
    return button_elmt;
});


/*
x.ui.Button.define("click", function (event) {
    Log.debug("click() - save? " + this.save);
    if (this.save) {
        this.owner.page.save(this.id);
    }
});
*/

/**
* Create a new button object in the owning page, using the spec properties supplied
* @param Spec object whose properties will be given to the newly-created button
* @return Newly-created button object
*/
Page.buttons.override("add", function (spec) {
    var button;
    if (!spec.label) {
        this.throwError("Button label must be specified in spec: " + spec.id);
    }
    button = x.ui.Button.clone(spec);
    Page.buttons.parent.add.call(this, button);
    return button;
});


Page.define("renderButtons", function (page_elem, render_opts) {
    var elmt;
    this.buttons.each(function (button) {
        if (button.visible) {
            if (!elmt) {
                elmt = page_elem.makeElement("div", "css_hide", "css_payload_page_buttons");
            }
            button.render(elmt, render_opts);
        }
    });
//    return elmt;
});
//Page.bind("renderButtons", "renderStart");

//To show up in Chrome debugger...
//@ sourceURL=page/Button.js