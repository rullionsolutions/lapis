/*global x, _ */
"use strict";

/**
* To represent a field that references a record in another entity
*/
x.data.fields.Reference = x.data.fields.Text.clone({
    id                      : "Reference",
    css_type                : "reference",          // mapped to autocompleter or dropdown by setCSSType() below
    search_oper_list_option: "sy.search_oper_list_option",
    auto_search_oper        : "EQ",
    url_pattern             : "?page_id={ref_entity}_display&page_key={val}",
    data_length             : null,
    flexbox_size            : 4,
    allow_unchanged_inactive_value: true,
    apply_autocompleter_security : false
});



x.data.fields.Reference.defbind("setCSSType", "cloneInstance", function () {
    if (this.css_type === "reference") {
        this.css_type = (this.isAutocompleter() ? "autocompleter" : "dropdown");
    }
});


/**
* To return the reference value of this field, or an empty string if this value does not represent a reference (e.g. Combo field)
* @return string reference id, or empty string
*/
x.data.fields.Reference.define("getRefVal", function () {
    return this.val;
});


x.data.fields.Reference.override("getKeyPieces", function () {
    return x.data.entities[this.ref_entity].getKeyPieces();
});


/**
* To return the LoV object this field contains, being the 'lov' property if present; if not, this function
* @return LoV object, this.lov
x.data.fields.Reference.define("getLoV", function () {
    var condition;
    if (!this.lov) {
        if (!this.ref_entity) {
            this.throwError("no ref entity property");
        }
        if (!x.data.entities[this.ref_entity]) {
            this.throwError("unrecognized ref entity");
        }
        // this.ref_condition is deprecated in favour of this.selection_filter
        condition = this.selection_filter || this.ref_condition || x.data.entities[this.ref_entity].selection_filter;
        this.lov = LoV.getEntityLoV(this.ref_entity, condition);
    }
    return this.lov;
});


* Sets this.lov to be a local, non-cached LoV object on the entity given by 'ref_entity' property
* @param selection_filter string to apply to the LoV object",
* @return LoV object, this.lov"
x.data.fields.Reference.define("getOwnLoV", function (selection_filter) {
    this.lov = LoV.clone({ id: this.ref_entity, entity: this.ref_entity, instance: true });
    this.lov.loadEntity(null, selection_filter);
    return this.lov;
});

*/

/**
* To obtain a row object corresponding to the record in ref_entity with a key being the value of this field
* @return row object with a key of this field's value, or undefined
*/
x.data.fields.Reference.define("getRecord", function () {
    var ref_val = this.getRefVal();
    if (ref_val) {
        if (this.owner.trans && (this.owner.trans.isActive() || this.owner.trans.isInCache(this.ref_entity, ref_val))) {
            return this.owner.trans.getActiveRow(this.ref_entity, ref_val);
        }
        return x.data.entities[this.ref_entity].getRow(ref_val);
    }
});


x.data.fields.Reference.defbind("validateReference", "validate", function () {
    var item,
        val;

    if (!this.ref_entity) {
        this.messages.add({ type: 'E', text: "no ref_entity property found" });
        return;
    }
    if (!x.data.entities[this.ref_entity]) {
        this.messages.add({ type: 'E', text: "ref_entity property value invalid: " + this.ref_entity });
        return;
    }
//    if (val && this.lov) {                // Only do special validation if non-blank
    this.getLoV();    // Trial alternative, low memory approach of only validating against an LoV if it is already present
                                        // Entities (e.g. rm_rsrc) that specified a selection_filter caused separate loV object for each instance
    val = this.getRefVal();
    if (!this.lov) {
        this.text = "[unknown: " + val + "]";
        this.messages.add({ type: 'E', text: "no lov found" });
    } else if (val) {                // Only do special validation if non-blank
        try {
            item = this.lov.getItem(val);
        } catch (e) {                // val is invalid
            this.report(e);
        }
        if (item) {
            this.text = item.label;
        } else if (this.owner && this.owner.trans && this.owner.trans.isActive() && this.owner.trans.isInCache(this.ref_entity, val)) {
            this.text = this.owner.trans.getRow(this.ref_entity, val).getLabel("reference");
        } else {
            this.text = "[unknown: " + val + "]";
            this.messages.add({ type: 'E', text: "invalid reference: " + val });
            this.debug("invalid reference: " + val + " for field " + this);
        }
    }
});


x.data.fields.Reference.override("getTextFromVal", function () {
    this.text = "";
    this.validate();
    return this.text;
});

/*
x.data.fields.Reference.override("getURLFromVal", function () {
    var display_page = x.data.entities[this.ref_entity].getDisplayPage(),
        url = "",
        this_val = this.getRefVal();

    if (display_page && this_val && display_page.allowed(this.getSession(), this_val).access) {                            // §vani.core.7.5.1.7
        url = display_page.getSimpleURL(this_val);
    }
    return url;
});
*/
// Support Linked Pairs
// link_one_way = true means that the child field is disabled until the parent is chosen (to limit drop-down size)
/**
* To link this field to a parent field",
* @param parent field object, link field string, boolean to force the link to be one-way (i.e. pick parent first, then child)",
* @return nothing"
*/
x.data.fields.Reference.define("linkToParent", function (parent_field, link_field, link_one_way) {
    this.linked_parent = parent_field;
    this.link_field    = link_field;
    this.link_one_way  = link_one_way;
    if (this.link_one_way && this.editable) {
        this.editable = false;
        this.editable_once_parent_set = true;
    }
    parent_field.linked_child = this;
    parent_field.css_reload = true;
    if (!parent_field.isBlank()) {
        this.parentChanged(parent_field.get());
    }
});


x.data.fields.Reference.defbind("afterChangeLinkedFields", "afterChange", function (/*old_val*/) {
    if (this.linked_child) {
        this.linked_child.parentChanged();
    } else if (this.linked_parent) {
        this.linked_parent.childChanged();
    }
});


/**
* Called on the child field when the linked parent's value is changed
*/
x.data.fields.Reference.define("parentChanged", function () {
    var new_ref_condition,
        ref_row,
        implied_parent_val;

    if (!this.link_field) {
        this.throwError("invalid configuration");
    }

    if (!this.linked_parent.isEditable()) {
        return;
    }

    if (this.link_one_way) {
        this.editable = this.editable_once_parent_set && !this.linked_parent.isBlank();
    }
    new_ref_condition = this.linked_parent.isBlank() ? null : "A." + this.link_field + "=" + x.sql.escape(this.linked_parent.get());
    if (new_ref_condition !== this.ref_condition) {
        this.lov = null;
        this.ref_condition = new_ref_condition;
        if (!this.linked_parent.isBlank() && !this.isBlank()) {         // This may be called as a result of childChanged(), so the parent may
            ref_row = this.getRow();                                    // already be set to the value corresponding to this field's new value
            implied_parent_val = ref_row.getField(this.link_field).get();

            this.debug("curr parent field val: " + this.linked_parent.get() + ", parent val implied by this (child) field val: " + implied_parent_val);
            if (implied_parent_val !== this.linked_parent.get()) {
                this.set("");
            }
        }
        this.getLoV();
        this.validate();
    }
});


/**
* Called on the parent field when the linked child's value is changed
*/
x.data.fields.Reference.define("childChanged", function () {
    var ref_row,
        implied_parent_val;

    if (!this.linked_child) {
        this.throwError("invalid configuration");
    }
    if (!this.linked_child.link_field) {
        this.throwError("invalid configuration");
    }
    if (!this.linked_child.isBlank() && this.isBlank()) {
        ref_row = this.linked_child.getRow();
        implied_parent_val = ref_row.getField(this.linked_child.link_field).get();

        this.debug("child field val: " + this.linked_child.get() + ", parent val implied by child field val: " + implied_parent_val);
        if (implied_parent_val !== this.get()) {
            this.set(implied_parent_val);
        }
    }
});



x.data.fields.Reference.override("renderNavOptions", function (parent_elem, render_opts, cached_record) {
    var display_page,
        session,
        that = this,
        this_val,
        ul_elem,
        count = 0,
        display_url,
        context_url;

    session  = this.getSession();
    this_val = this.getRefVal();
    if (!this_val || !this.ref_entity || !x.data.entities[this.ref_entity]) {
        return;
    }
    display_page = x.data.entities[this.ref_entity].getDisplayPage();
    if (!display_page) {
        return;
    }
    if (!cached_record) {
        cached_record = x.data.entities[this.ref_entity].getSecurityRecord(session, this_val);
    }
    if (x.ui.pages[this.ref_entity + "_context"] && x.ui.pages[this.ref_entity + "_context"].allowed(session, this_val, cached_record).access) {
//        context_url = "modal&page_id=" + this.ref_entity + "_context&page_key=" + this_val;  // §vani.core.7.5.1.7
        context_url = x.ui.pages[this.ref_entity + "_context"].getSimpleURL(this_val);
    }
    if (display_page.allowed(session, this_val, cached_record).access) {                            // §vani.core.7.5.1.7
        display_url = display_page.getSimpleURL(this_val);
    }

    function renderDropdown() {
        ul_elem = that.renderDropdownDiv(parent_elem, "nav_" + that.getControl(), "Navigation options for this item");
        if (context_url) {
            ul_elem.addChild("li").makeAnchor("Preview", context_url /*, "css_open_in_modal"*/);
            count += 1;
        }
        if (display_url) {
            ul_elem.addChild("li").makeAnchor("Display", display_url);
            count += 1;
        }
        if (count > 0) {
            ul_elem.addChild("li", null, "divider");
        }
    }

    display_page.links.each(function (link) {
        if (link.isVisible(session, this_val, cached_record)) {
            if (!ul_elem) {
                renderDropdown();
            }
            link.renderNavOption(ul_elem, render_opts, this_val);
            count += 1;
        }
    });

    return count;
});


x.data.fields.Reference.define("isAutocompleter", function () {
    var entity;
    if (typeof this.render_autocompleter === "boolean") {
        return this.render_autocompleter;
    }
    entity = x.data.entities[this.ref_entity];
    return (typeof entity.autocompleter === "boolean" ? entity.autocompleter : (entity.data_volume_oom > 2));
});


x.data.fields.Reference.override("renderUpdateControls", function (div, form_type) {
    var css_class = this.getInputSizeCSSClass(form_type) /* TB£: "form-control" */;
    if (this.isAutocompleter()) {
        this.renderAutocompleter(div, css_class);
    } else {
        this.renderDropdown     (div, css_class);
    }
});


x.data.fields.Reference.define("renderAutocompleter", function (div, css_class) {
    div.makeInput("text", null, this.getText(), css_class, this.placeholder || this.helper_text)
        .attr("autocomplete", "off");
});


x.data.fields.Reference.define("renderDropdown", function (div, css_class) {
    var select;
    this.getLoV().reloadComplete();
    if (this.lov) {
        if (!this.lov.complete) {
            this.throwError("lov is incomplete");
            // this.lov.loadEntity();
        }
        if (this.allow_unchanged_inactive_value && this.orig_val && this.lov.getItem(this.orig_val)) {
            this.lov.getItem(this.orig_val).active = true;
        }
        if (this.render_radio) {
            select = this.lov.renderRadio   (div, this.val, this.getControl(),
                css_class, this.mandatory);
        } else {
            select = this.lov.renderDropdown(div, this.val, this.getControl(),
                css_class, this.mandatory);
        }
    }
    return select;
});


x.data.fields.Reference.define("autocompleter", function (match_term, out, session) {
    var ref_entity = x.data.entities[this.ref_entity],
        query = ref_entity.getAutoCompleterQuery(),
        filter_condition = this.autocompleter_filter ||
                           this.selection_filter     ||
                           this.ref_condition        ||
                           ref_entity.selection_filter,
        out_obj;

    ref_entity.addAutoCompleterSelectionCondition(query, match_term);
    if (filter_condition) {
        query.addCondition({ full_condition: filter_condition });
    }
    if (typeof ref_entity.addSecurityCondition === "function" && this.apply_autocompleter_security) {// §vani.core.7.3.5.3
        ref_entity.addSecurityCondition(query, session);
    }
    out_obj = this.getAutoCompleterResultsObj(query);
    query.reset();
    out.print(JSON.stringify(out_obj));
});

/*
x.data.fields.Reference.define("getAutoCompleterMatchField", function (ref_entity) {
    var match_field = ref_entity.autocompleter_field || ref_entity.title_field;        // match_field can be a SQL function
    if (ref_entity.getField(match_field) && ref_entity.getField(match_field).sql_function) {
        match_field = ref_entity.getField(match_field).sql_function.replace(/\?\./g, "");
    }
    return match_field;
});
*/



x.data.fields.Reference.define("getAutoCompleterResultsObj", function (query) {
    var out_obj = { results: [], meta: {} };
    out_obj.results = [];
    while (query.next()) {
        out_obj.results.push({
            "_key": query.getColumn("A._key"    ).get(),
             value: query.getColumn("match_term").get()
         });
    }
    out_obj.meta.found_rows = query.found_rows;
    return out_obj;
});


// x.data.fields.Reference.override("addColumnToTable", function (query_table, col_spec) {
//     var column,
//         sort_cols;

//     if (!this.ref_entity || !x.data.entities[this.ref_entity]) {
//         this.throwError("invalid ref entity");
//     }
//     column = x.data.fields.Text.addColumnToTable.call(this, query_table, col_spec);
//     if (x.data.entities[this.ref_entity].reference_sort_order) {
//         column.order_term = x.data.entities[this.ref_entity].reference_sort_order;
//     } else {
//         if (!x.data.entities[this.ref_entity].default_order) {
//             this.throwError("undefined property");
//         }
//         sort_cols = x.data.entities[this.ref_entity].default_order.split(/\s*,\s*/);
//         column.order_term = sort_cols[0];
//     }
//     column.order_term = "( SELECT ZR." + column.order_term + " FROM " + this.ref_entity + " ZR WHERE ZR._key=" +
//         query_table.alias + (this.sql_function ? "_" : ".") + this.id + " )";
//     return column;
// });

/*
x.data.fields.Reference.define("getReferentialIntegrityDDL", function () {
    return "FOREIGN KEY (" + this.getId() + ") REFERENCES " + this.ref_entity + " (_key)";
});


x.data.fields.Reference.define("checkDataIntegrity", function () {
    var conn = Connection.getQueryConnection("checkDataIntegrity"),
        resultset,
        out,
        count   = {},
        key_map = {},
        key,
        val,
        delim = "";


    if (!this.ref_entity || x.data.entities[this.ref_entity].view_only || this.sql_function || !this.owner) {
        return;
    }
    out = "Broken references for " + this.id + ": ";
//    resultset = Connection.shared.executeQuery("SELECT _key, " + this.id + " FROM " + App.database + "." + this.owner.table +
//        " WHERE " + this.id + " IS NOT NULL AND " + this.id + " NOT IN ( SELECT _key FROM " + this.ref_entity + " )");
// This is often much faster...
    resultset = Connection.shared.executeQuery(this.getDataIntegritySQL());
    while (resultset.next()) {
        key = Connection.getColumnString(resultset, 1);
        val = Connection.getColumnString(resultset, 2);
        if (!count[val]) {
            count[val] = 0;
        }
        count[val] += 1;
        if (key_map[val]) {
            if (count[val] <= 10) {
                key_map[val] += ", " + key;
            }
        } else {
            key_map[val] = key;
        }
    }
    conn.finishedWithResultSet(resultset);
    for (val in key_map) {
        if (key_map.hasOwnProperty(val)) {
            out += delim + "[" + val + "] " + key_map[val] + " (" + count[val] + ")";
            delim = ", ";
        }
    }
    if (delim) {
        return out;
    }
});


x.data.fields.Reference.define("getDataIntegritySQL", function () {
    return "SELECT A._key, A." + this.id + " FROM " + this.owner.table + " A " +
        " LEFT OUTER JOIN " + this.ref_entity + " B ON A." + this.id + " = B._key " +
        " WHERE A." + this.id + " IS NOT NULL AND B._key IS NULL";
});


x.data.fields.Reference.override("generateTestValue", function (session) {
    var lov,
        i;

    lov = LoV.getEntityLoV(this.ref_entity, this.generate_test_condition);
    if (!lov || lov.length() === 0) {
        return "";
    }
    i = Math.floor(Math.random() * lov.length());
    if (!lov.get(i)) {
        this.throwError("invalid lov item");
    }
    return lov.get(i).id;
});
*/
