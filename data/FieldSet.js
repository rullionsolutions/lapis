/*global x, _ */
"use strict";

x.data = x.data || {};

/**
* An OrderedMap of fields, whose ids are unique within this object
*/
x.data.FieldSet = x.base.OrderedMap.clone({
    id                      : "FieldSet",
    modifiable              : false,
    modified                : false,                       // private - modified since original value, or not?
    deleting                : false                        // whether or not we are deleting this record
});


x.data.FieldSet.register("beforeFieldChange");
x.data.FieldSet.register( "afterFieldChange");


x.data.FieldSet.define("addFields", function (spec_array) {
    var i;
    for (i = 0; i < spec_array.length; i += 1) {
        this.addField(spec_array[i]);
    }
});


x.data.FieldSet.define("addField", function (field_spec) {
    var field;
    if (!field_spec.id || typeof field_spec.id !== "string") {
        this.throwError("id must be nonblank string");
    }
    if (!field_spec.type) {
        this.throwError("field type must be specified");
    }
    if (!field_spec.type || !x.data.fields[field_spec.type]) {
        this.throwError("field type does not exist: " + field_spec.type);
    }
    field_spec.instance = this.instance;
    field = x.data.fields[field_spec.type].clone(field_spec);
    this.add(field);
    if (this.page /*&& this.modifiable*/) {
        field.addToPage(this.page);
    }
    return field;
});


x.data.FieldSet.define("cloneField", function (field, spec) {
    var new_field;
    spec.instance = this.instance;
    new_field = field.clone(spec);
    this.add(new_field);
    if (this.page /*&& this.modifiable*/) {
        new_field.addToPage(this.page);
    }
    return new_field;
});


x.data.FieldSet.define("getField", function (id) {
    return this.get(id);
});


x.data.FieldSet.define("getFieldCount", function () {
    return this.length();
});


x.data.FieldSet.define("removeField", function (id) {
    var field = this.get(id);
    if (field && this.page) {
        delete this.page.fields[field.getControl()];
    }
    x.base.OrderedMap.remove.call(this, id);
});


x.data.FieldSet.define("beforeFieldChange", function (field, new_val) {
    if (!this.modifiable) {
        this.throwError("fieldset not modifiable");
    }
    this.happen("beforeFieldChange", { field: field, new_val: new_val });
});


x.data.FieldSet.define("afterFieldChange", function (field, old_val) {
    if (field.isModified()) {
        this.touch();
    }
    this.happen("afterFieldChange", { field: field, old_val: old_val });
});


x.data.FieldSet.define("touch", function () {
    this.modified = true;
    if (this.document) {
        this.document.touch();
    }
});


x.data.FieldSet.define("setDefaultVals", function () {
    this.each(function (field) {
        field.setDefaultVal();
    });
});


/**
* Add a property to the given spec object for each field in this FieldSet, with its string value
* @param spec: object to which the properties are added; options.text_values: set property value to field.getText() instead of field.get()
*/
x.data.FieldSet.define("addValuesToObject", function (spec, options) {
    this.each(function (field) {
        //CL - id comes out as "undefined" + field.id without this fix
        spec[((options && options.prefix) ? options.prefix : "") + field.id] = ((options && options.text_values) ? field.getText() : field.get());
    });
});


x.data.FieldSet.override("replaceToken", function (token) {
    var field;
    this.trace("replaceToken(): " + token);
    token = token.split("|");
    if (token[0] === "key" && typeof this.getKey === "function") {
        return this.getKey();
    }
    field = this.getField(token[0]);
    if (!field) {
        return "(ERROR: unrecognized field: " + token[0] + ")";
    }
    return field.getTokenValue(token);
});


x.data.FieldSet.define("setDelete", function (bool) {
    if (!this.isModifiable()) {
        this.throwError("fieldset not modifiable");
    }
    if (this.deleting !== bool) {
        this.trace("set modified");
        this.modified = true;
        if (this.trans) {
            this.trans.setModified();
        }
    }
    this.deleting = bool;
});


x.data.FieldSet.define("isModified", function () {
    return this.modified;
});


x.data.FieldSet.define("isModifiable", function () {
    return this.modifiable;
});


x.data.FieldSet.define("isValid", function (modified_only, field_group) {
    var valid = true;
    if (this.deleting) {
        return true;
    }
    this.each(function(field) {
        if (field_group && field_group !== field.field_group) {
            return;
        }
        valid = valid && field.isValid(modified_only);
    });
    return valid;
});


// copy values from fieldset's fields for each field whose id matches
x.data.FieldSet.override("copyFrom", function (fieldset) {
    this.each(function (field) {
        if (fieldset.getField(field.id)) {
            field.set(fieldset.getField(field.id).get());
        }
    });
});


x.data.FieldSet.define("update", function (params) {
    if (this.modifiable) {
        this.each(function (field) {
            field.update(params);
        });
    }
});


x.data.FieldSet.define("getTBFormType", function (our_form_type) {
    var tb_form_type = our_form_type;
           if (tb_form_type === "basic") {
        tb_form_type = "row";
    } else if (tb_form_type === "table-cell") {
        tb_form_type = "";
    } else if (tb_form_type === "form-inline-labelless") {
        tb_form_type = "form-inline";
    // } else if (tb_form_type === "form-horizontal-readonly") {
    //     tb_form_type = "form-horizontal";
    }
    return tb_form_type;
});


x.data.FieldSet.define("renderForm", function (parent_elem, render_opts, form_type, field_group, hide_blank_uneditable_fields) {
    var tb_form_type = this.getTBFormType(form_type),
        form_elem,
        count = 0;

    this.each(function (field) {
        if (field.isVisible(field_group, hide_blank_uneditable_fields)) {
            if (!form_elem) {
                form_elem = parent_elem.makeElement("form", tb_form_type);
            }
            field.renderFormGroup(form_elem, render_opts, form_type);
            count += 1;
        }
    });
    return count;
});


x.data.FieldSet.define("addToPage", function (page, field_group) {
    this.page = page;
//    if (this.modifiable) {
        this.each(function (field) {
            if (!field_group || field_group === field.field_group) {
                field.addToPage(page);
            }
        });
//    }
});


x.data.FieldSet.define("removeFromPage", function (field_group) {
    var page = this.page;
    if (this.modifiable) {
        this.each(function (field) {
            if (!field_group || field_group === field.field_group) {
                field.removeFromPage(page);
            }
        });
    }
});

