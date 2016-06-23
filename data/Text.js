/*global x, _ */
"use strict";

x.data.fields = x.data.fields || {};

/**
* To represent a basic unit of textual information, how it is captured, validated, stored in the database, and represented on screen
*/
x.data.fields.Text = x.base.Base.clone({
    id              : "Text",
    data_length     : 255,
    text_pattern    : "{val}"
});


x.data.fields.Text.register("setInitial");
x.data.fields.Text.register("setInitialTrans");
x.data.fields.Text.register("beforeChange");
x.data.fields.Text.register("beforeTransChange");
x.data.fields.Text.register("validate");
x.data.fields.Text.register("afterChange");
x.data.fields.Text.register("afterTransChange");


/**
* To initialise this field when cloned - sets query_column property based on table_alias, sql_function and id
*/
x.data.fields.Text.defbind("resetVal", "clone", function () {
    this.val          = "";
    this.orig_val     = "";
    this.prev_val     = "";
    this.text         = null;
    this.url          = null;
    this.validated    = false;                    // private - validated since last significant change?
    this.modified     = false;                    // private - modified since original value, or not?
});


/**
* Returns this field's val property - should always be used instead of accessing val directly
* @return Value of this field's val property - should be string
*/
x.data.fields.Text.define("get", function () {
    if (typeof this.getComputed === "function") {
        this.val = this.getComputed();
    }
    return this.val;
});




/**
* To get a numerical representation of this field's value
* @param Default value to use if this field's value is not a number
* @return Number value of field (if the value can be interpreted as numeric), or the default value argument (if numeric) or undefined
*/
x.data.fields.Text.define("getNumber", function (def_val) {
    var number_val = parseFloat(this.get());
    if (isNaN(number_val) && typeof def_val === "number" ) {
        number_val = def_val;
    }
    return number_val;
});


/**
* To indicate whether or not this field's value is blank
* @return True if this field's value is blank (i.e. empty string) otherwise false
*/
x.data.fields.Text.define("isBlank", function (val) {
    if (typeof val !== "string") {
        val = this.get();
    }
    return !val;
});


/**
* To set the initial value of this field - called by Entity.setInitial()
* @param Initial string value to set
*/
x.data.fields.Text.define("setInitial", function (new_val) {
    if (typeof new_val !== "string") {
        this.throwError("invalid argument");
    }
    this.resetVal();
    this.val       = new_val;
    this.orig_val  = new_val;
    this.prev_val  = new_val;

    this.happen("setInitial", new_val);
    if (this.owner && this.owner.trans) {
        this.happen("setInitialTrans", new_val);
    }
});


x.data.fields.Text.define("setDefaultVal", function () {
    if (this.default_val) {
        this.setInitial(this.default_val);
        this.modified = true;
        this.validate();           // this was commented-out, presumably because it broke something, but it is necessary
    }
});


x.data.fields.Text.define("set", function (new_val) {
    var old_val = this.get(),
        changed = this.setInternal(new_val);

    if (changed) {
        this.trace("setting " + this.getId() + " from '" + old_val + "' to '" + new_val + "'");
    }
    return changed;
});

/**
* To set this field's value to the string argument specified, returning false if no change, otherwise calling owner.beforeFieldChange() and this.beforeChange() before making the change, then owner.afterFieldChange() and this.afterChange() then returning true
* @param String new value to set this field to
* @return True if this field's value is changed, and false otherwise
*/
x.data.fields.Text.define("setInternal", function (new_val) {
    var old_val = this.get();
    this.prev_val = old_val;            // to support isChangedSincePreviousUpdate()
    if (typeof new_val !== "string") {
        this.throwError("argument not string: " + this.owner.id + "." + this.id);
    }
    if (this.fixed_key) {
        this.throwError("fixed key");
    }
    if (new_val === this.val) {
        return false;
    }
    if (this.owner && this.owner.beforeFieldChange) {
        this.owner.beforeFieldChange(this, new_val);            // May throw an error
    }
    this.happen("beforeChange", new_val);
    if (this.owner && this.owner.trans) {
        this.happen("beforeTransChange", new_val);
    }
    this.val       = new_val;
    this.text      = null;
    this.url       = null;
    this.modified  = true;
    this.validated = false;
    if (this.owner && this.owner.afterFieldChange) {
        this.owner.afterFieldChange(this, old_val);
    }
    this.happen("afterChange", old_val);
    if (this.owner && this.owner.trans) {
        this.happen("afterTransChange", old_val);
    }
    return true;
});


/**
* Returns the value of this field's id property
* @return This field's id property as a string
*/
x.data.fields.Text.define("getId", function () {
    return this.id;
});


/**
* To set a given property, and unset the validated property, prompting another call to validate() when next required
* @param String property name, and property value
*/
x.data.fields.Text.define("setProperty", function (name, val) {
    if (name === "id") {
        this.throwError("can't change property 'id'");
    }
    if (name === "type") {
        this.throwError("can't change property 'type'");
    }
    this[name]     = val;
    this.text      = null;
    this.url       = null;
    this.validated = false;                            // property change might affect validation
});


/**
* To obtain the field's data length, in most cases the character length of the database field
* @return The data length of this field, as an integer number of characters
*/
x.data.fields.Text.define("getDataLength", function () {
    return (typeof this.data_length === "number") ? this.data_length : 255;
});


/**
* To obtain the number of pieces the value of this field represents as a key string
* @return The number 1
*/
x.data.fields.Text.define("getKeyPieces", function () {
    return 1;
});


/**
* To report whether or not this field is a key of the entity to which it belongs
* @return True if this field is a key, otherwise false
*/
x.data.fields.Text.define("isKey", function () {
    if (this.owner && this.owner.isKey) {
        return this.owner.isKey(this.getId());
    }
    return false;
});


/**
* To report whether or not this field has been modified (by a call to set()), since it was originally created and set
* @return true if this field has been modified, otherwise false
*/
x.data.fields.Text.define("isModified", function () {
    return this.modified;
});


/**
* To convert the properties of this field (especially this.val) into the display text string for this field
* @return display text string appropriate to this field and its properties
*/
x.data.fields.Text.define("getTextFromVal", function () {
    var val = this.get(),
        out = this.detokenize(this.text_pattern);
    if (this.config_item && !this.isBlank(val)) {
        try {
            out = "[" + val + "] " + this.getConfigItemText(this.config_item, val);
        } catch (e) {        // assume unrecognised config item
            out = e.toString();
            this.report(e);
        }
    }
    return out;
});


/**
* To obtain the display text string for this field, which is set by the last call to validate()
* @return the value of this field's 'text' property - always a string
*/
x.data.fields.Text.define("getText", function () {
    if (typeof this.text !== "string" || this.getComputed) {            // set() sets this.text to null; only other reason to
        this.text = this.getTextFromVal();                              // recompute is if using getComputed() function
//        this.validate();
    }
    return this.text;
});


/**
* To obtain the text title of the config item which the value of this field represents - if this field has a
* @return [config_item][this.get()].title as a string, otherwise '[unknown]'
*/
x.data.fields.Text.define("getConfigItemText", function (config_item, val) {
    var obj,
        label_prop = this.label_prop || "title";

    obj = require("lazuli/base/OrderedMap").getCollection(config_item);
    obj = obj.get(val);
    if (typeof obj !== "object") {
        this.throwError(val + " not found in " + config_item);
    }
    if (typeof obj[label_prop] !== "string") {
        this.throwError(config_item + "[" + val + "]." + label_prop + " is not a string");
    }
    return obj[label_prop];
});


/**
* To obtain the string representation of the value of this field for use in an update control (i.e. input box)
* @return the value of the 'val' property of this field
*/
x.data.fields.Text.define("getUpdateText", function () {
    return this.get();
});


/**
* To get a URL corresponding to the value of this field, if there is one; by default this
* @return url string if produced
*/
x.data.fields.Text.define("getURLFromVal", function () {
    var url,
        val = this.get();

    if (this.url_pattern) {
        url = val ? this.detokenize(this.url_pattern) : "";
    }
    if (url) {
        if (this.url_expected === "internal") {     // assumed to begin "index.html?page_id=" or similar
            try {
                if (!this.getSession().allowedURL(url)) {    // §vani.core.7.5.2.2
                    url = "";
                }
            } catch (e) {        // Assume is page_not_found exception
                this.report(e);
                url = "";
            }
        } else if (this.url_expected === "external" && url.indexOf("http") !== 0) {
            url = "http://" + url;
        }
    }
    return url;
});


/**
* To obtain the url string for this field, which is set by the last call to validate()
* @return the value of this field's 'url' property - always a string
*/
x.data.fields.Text.define("getURL", function () {
    if (typeof this.url !== "string") {
        this.url = this.getURLFromVal();
    }
    return this.url;
});
