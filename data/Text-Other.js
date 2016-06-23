/*global x, _ */


    search_oper_list: "sy.search_oper_list_text",
    auto_search_oper: "CO",
    search_filter   : "Filter",


// ONLY called from FieldSet.addToPage() - IF field is intended to appear on a page
/**
* To add this field to the page object, for UI and response parameter purposes, sets control property, which must be unique to the page, and calls page.addField()
* @param Page object
*/
module.exports.define("addToPage", function (page) {
    if (!this.control) {
        this.control = "";
        if (this.owner && this.owner.id_prefix) {
            this.control = this.owner.id_prefix + "_";
        }
        this.control += this.id;
    }
    page.addField(this);
});


/**
* To remove this field from the page object by calling page.removeField()
* @param Page object
*/
module.exports.define("removeFromPage", function (page) {
    page.removeField(this);
});


/**
* To return this field's control property, or calls getId() is control not defined (should never happen)
* @return Value of this field's control property - should be string
*/
module.exports.define("getControl", function () {
    return this.control || this.getId();
});


module.exports.define("getLoV", function () {
    if (!this.lov) {
        this.lov = this.getLoVInternal({  });
    }
    return this.lov;
});


module.exports.define("getOwnLoV", function (spec) {
    spec = spec || {};
    spec.skip_cache = true;
    this.lov = this.getLoVInternal(spec);
    return this.lov;
});


module.exports.define("getLoVInternal", function (spec) {
    var entity;
    spec.      list_id = this.list_id || this.list;
    spec.    entity_id = this.ref_entity;
    spec.collection_id = this.collection_id || this.config_item;
    spec. label_prop   = this. label_prop;
    spec.active_prop   = this.active_prop;
    spec.connection    = this.owner.connection;        // include this.owner.connection - to use Transaction's connection if within a transaction
    if (spec.entity_id) {
        entity = Entity.getEntity(this.ref_entity);
        spec.condition = spec.condition || this.selection_filter || this.ref_condition || entity.selection_filter;
        if (spec.skip_full_load === undefined) {
            // if (spec.condition) {
            //     spec.skip_full_load = false;
            // } else
            // if (typeof this.isAutocompleter === "function") {                // avoid caching large data volumes
            //     spec.skip_full_load = this.isAutocompleter();
            // } else {
                spec.skip_full_load = (entity.data_volume_oom > 1);
            // }
        }
    }
    this.lov = LoV.getLoV(spec, this.getSession());
    if (this.allow_unchanged_inactive_value && this.orig_val && this.lov.getItem(this.orig_val)) {
        this.lov.getItem(this.orig_val).active = true;
    }
    return this.lov;
});





/**
* To get a session object associated with this field, if one is available
* @return session object or null
*/
module.exports.define("getSession", function () {
    return this.session
        || (this.owner && this.owner.session)
        || (this.owner && this.owner.trans && this.owner.trans.session)
        || (this.owner && this.owner.page  && this.owner.page.session);
});


module.exports.define("appendClientSideProperties", function (obj) {
    obj.data_length       = this.getDataLength();
    obj.regex_label       = this.regex_label;
    obj.regex_pattern     = this.regex_pattern;
    obj.input_mask        = this.input_mask;
    obj.before_validation = this.before_validation;
    obj.auto_search_oper  = this.auto_search_oper;
});



module.exports.define("isDatabaseColumn", function () {
    return (!this.sql_function && !this.getComputed);
});


module.exports.define("obfuscate", function () {
    var sql;
    if (!this.obfuscate_funct || !this.isDatabaseColumn()) {
        return;
    }
    sql = "UPDATE " + this.owner.id + " SET " + this.id + "=" + this[this.obfuscate_funct]();
    Connection.shared.executeUpdate(sql);
});


module.exports.define("getTokenValue", function (token) {
    var out;
    if (token.length < 2 || token[1] === "text") {
        out = this.getText();
    } else if (token[1] === "val") {
        out = this.get();
    } else if (Lib.isStrictNumber(token[1])) {
        out = this.getText().substr(0, parseInt(token[1], 10) - 3) + "...";
    } else {
        out = "(ERROR: unrecognized token modifier: " + token[1] + " for " + token[0] + ")";
    }
    return out;
});



// Filter Field Generator
module.exports.define("getFilterField", function (fieldset, spec /*, suffix*/) {
    return fieldset.cloneField(spec.base_field, {
        id              : spec.id + "_filt",
        editable        : true,
        mandatory       : false,
        css_reload      : false,
        instance        : spec.instance
    });
});


/**
* To generate a reasonable test value for this field
* @param session object
* @return test value string
*/
module.exports.define("generateTestValue", function (/*session*/) {
    var attempt = 0,
        valid = false,
        length,
        regex,
        array,
        val;

    length = Math.min(this.getDataLength() / 2, 500);
    if (this.regex_pattern || this.isKey()) {
        regex  = this.regex_pattern ? new RegExp(this.regex_pattern) : null;
        array  = Lib.getRandomStringArray({ space: !this.isKey() });
        while (!valid && attempt < 100) {
            val = Lib.getRandomString(length, array);
            valid = regex ? regex.test(val) : true;
            attempt += 1;
        }
        if (!valid) {
            this.throwError("Couldn't generate test value after 100 attempts: " + this);
        }
    } else {
        val = Lib.getRandomWords(length);
    }
    return val;
});
