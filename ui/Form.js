/*global x, _ */
"use strict";

/**
* To represent a single record or other FieldSet
*/
x.ui.sections.Form = x.ui.sections.Section.clone({
    id                      : "Form",
    columns                 : 1,
    layout                  : "form-horizontal",        // for Create/Update/Display, or "basic", form-inline", "form-inline-labelless", or "table-cell"
    hide_section_if_empty   : true,
    hide_blank_uneditable_fields: true
});


x.ui.sections.Form.defbind("setupEntity", "clone", function () {
    if (typeof this.entity !== "object" && (typeof this.entity_id === "string" || typeof this.entity === "string")) {
        this.entity = x.data.Entity.getEntityThrowIfUnrecognized(this.entity_id || this.entity);
    }
    this.info("which entity? " + this.entity + ", " + this.entity_id);
});


/**
* Add the FieldSet argument to this object and call its addFieldsByControl() method to add its fields to the page-level field collection
* @param FieldSet object to apply to this section
*/
x.ui.sections.Form.define("setFieldSet", function (fieldset) {
    this.fieldset = fieldset;
    this.fieldset.id_prefix = this.id;
    // this.fieldset.addToPage(this.owner.page, this.field_group);
});


/**
* Return this section's FieldSet object
* @return This section's FieldSet object
*/
x.ui.sections.Form.define("getFieldSet", function () {
    return this.fieldset;
});


x.ui.sections.Form.define("getDocument", function () {
    this.document = this.document || this.owner.page.getMainDocument();
    return this.document;
});


x.ui.sections.Form.override("isValid", function () {
    return !this.fieldset || this.fieldset.isValid(null, this.field_group);
});


/**
* Generate HTML output for this section, given its current state; depending on 'layout' property, it calls renderFormHorizontal()
* @param XmlStream object for the parent div to add this section HTML to; render_opts
* @return XmlStream object for this section's div element
*/
x.ui.sections.Form.defbind("renderFormSection", "render", function () {
    var count = 0;
    this.form_elem = null;
    if (!this.fieldset) {
        this.throwError("formbase no fieldset");
    }
    this.getSectionElement();           // temp make section visible
    count += this.renderForm(this.fieldset, {});
//    count += this.renderSeparateTextareas(this.fieldset, render_opts);
    if (count === 0 && this.element) {        // this.sctn_elem will be set if hide_section_if_empty = false
        this.element.makeElement("div", "css_form_footer").text("no items");
    }
});


/**
* To return the form_elem XmlStream object (a div) during render, creating it if it doesn't already exist
* @param render_opts
* @return XmlStream object for this section's form div element
*/
x.ui.sections.Form.define("getFormElement", function () {
    if (!this.form_elem) {
        this.form_elem = this.getSectionElement().makeElement("div", "css_form_body " + this.layout);
    }
    return this.form_elem;
});


/**
* To determine whether the given field is visible in this Form context
* @return true if the field should be visible, otherwise false
*/
x.ui.sections.Form.define("isFieldVisible", function (field) {
    var visible = field.isVisible(this.field_group, this.hide_blank_uneditable_fields);
    return visible;
});


/**
* To render the FieldSet as a form with 1 column, calling renderFieldFunction on each field, except where (this.separate_textareas && field.separate_row_in_form)
* @param FieldSet object of fields to render
* @return Number of fields rendered
*/
x.ui.sections.Form.define("renderForm", function (fieldset) {
    var that = this,
        form_elem,
        count = 0;

    fieldset.each(function (field) {
        if (field.isVisible(that.field_group, that.hide_blank_uneditable_fields)) {
            if (!form_elem) {
                form_elem = that.getSectionElement().makeElement("form", fieldset.getTBFormType(that.layout));
            }
            field.renderFormGroup(form_elem, that.layout);
            count += 1;
        }
    });
    return count;
});
