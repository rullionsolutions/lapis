/*global x, _ */
"use strict";


x.data.fields.Text.define("visible" , true);
x.data.fields.Text.define("editable", true);


/**
* To indicate whether or not this field is editable, i.e. its 'editable' property is true, its 'fixed_key'
* @return true if this field is editable, otherwise false
*/
x.data.fields.Text.define("isEditable", function () {
    return this.editable && !this.fixed_key && (this.owner.modifiable !== false);
});


/**
* To indicate whether or not this field is visible, i.e. its 'visible' property is true, its 'accessible'
* @return true if this field is visible, otherwise false
*/
x.data.fields.Text.define("isVisible", function (field_group, hide_blank_uneditable) {
    return this.visible && (this.accessible !== false) &&
            (!field_group || field_group === this.field_group) &&
            (!this.hide_if_no_link || this.getURL()) &&
            ((this.editable && this.owner && this.owner.modifiable) || !this.isBlank() || !hide_blank_uneditable);
});


/**
* To set the visible and editable attributes combined, and mandatory as a separate arg, set the field blank is not visible, and validate
* @param whether visible/editable, whether mandatory (only if visible/editable)
*/
x.data.fields.Text.define("setVisEdMand", function (visible, editable, mandatory) {
    if (visible && !this.visible && this.isBlank() && this.default_val) {
        this.set(this.default_val);
    }
    this.visible   = visible;
    this.editable  = editable;
    this.mandatory = visible && editable && mandatory;
    if (!visible) {
        this.set("");
    }
    this.validated = false;                            // property change might affect validation
});



/**
* To validate the value this field is currently set to; this function (or its descendents) can report errors
*/
x.data.fields.Text.define("validate", function () {
    if (this.messages) {
        this.messages.clear();
    } else {
        this.messages = x.ui.MessageManager.clone({ id: this.id, field: this, prefix: this.label, instance: true });
    }
//    this.text = this.getTextFromVal();
//    this.url  = this. getURLFromVal();
    if (this.mandatory && !this.val) {
        this.messages.add({ type: 'E', text: "mandatory", cli_side_revalidate: true });
    }
    if (this.val && this.val.length > this.getDataLength() && this.getDataLength() > -1) {
        this.messages.add({ type: 'E', text: "longer than " + this.getDataLength() + " characters", cli_side_revalidate: true });
    }
    if (this.val && this.regex_pattern && !(this.val.match(new RegExp(this.regex_pattern)))) {
        this.messages.add({ type: 'E', text: this.regex_label || "match pattern", cli_side_revalidate: true });
    }
    if (this.val && this.enforce_unique) {
        if (this.checkUnique(this.val)) {
            this.messages.add({ id: "non_unique_field", type: 'E', text: this.unique_error_msg });
        }
    }
    this.validated = true;
    this.happen("validate");
});


/**
* To report whether or not this field is valid, based on the last call to validate() (validate() is called again
* @return true if this field is valid, false otherwise
*/
x.data.fields.Text.define("isValid", function (modified_only) {
    if ((!modified_only || this.isModified()) && !this.validated) {
        this.validate();
    }
    if (!this.messages) {
        return true;
    }
    return !this.messages.error_recorded_since_clear;
});
