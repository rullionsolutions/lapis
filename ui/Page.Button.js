/*global x, _ */
"use strict";


x.ui.Page.Button = x.base.Base.clone({
    id              : "Button",
    label           : null,                         // Text label of button
    visible         : true,                         // Whether or not this tab is shown (defaults to true)
    purpose         : "Button on this page"
});


x.ui.Page.Button.register("click");


/**
* Generate HTML output for this page button
* @param xmlstream div element object to contain the buttons; render_opts
*/
x.ui.Page.Button.define("render", function (parent_elmt) {
    var that = this,
        css_class = (this.css_class ? this.css_class + " " : "") + "btn css_cmd";

    if (!this.element) {
        this.element = parent_elmt.makeElement("button");
    }
    this.element.empty();
    if (!this.visible) {
        css_class += " hidden";
    }
    if (this.primary) {
        css_class += " btn_primary";
    }
    this.element.attr("class", css_class);
    if (this.target) {
        this.element.attr("target", this.target);
    }
    if (this.confirm_text) {
        this.element.attr("data-confirm-text", this.confirm_text);
    }
    this.element.text(this.label);
    this.element.jquery_elem.bind("click", function (event) {
        that.click(event);
    });
});


x.ui.Page.Button.define("click", function (event) {
    this.happen("click", event);
});


x.ui.Page.Button.defbind("saveOnClick", "click", function (/*event*/) {
    this.debug("click() - save? " + this.save);
    if (this.save) {
        this.owner.page.save(this.id);
    }
});


/**
* Create a new button object in the owning page, using the spec properties supplied
* @param Spec object whose properties will be given to the newly-created button
* @return Newly-created button object
*/
x.ui.Page.buttons.override("add", function (spec) {
    var button;
    if (!spec.label) {
        this.throwError("Button label must be specified in spec: " + spec.id);
    }
    button = x.ui.Page.Button.clone(spec);
    x.ui.Page.buttons.parent.add.call(this, button);
    return button;
});


//To show up in Chrome debugger...
//# sourceURL=page/Button.js