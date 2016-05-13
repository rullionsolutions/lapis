/*global x, _ */
"use strict";

/**
* To represent a record in a database table
*/
x.data.Entity = x.data.FieldSet.clone({
    id                      : "Entity",
    db_record_exists        : false,                    // whether or not a corresponding record exists in the db
    db_record_locked        : false,                    // whether or not we have a lock on the db record
    duplicate_key           : false,
    export_sql_block        : 100,
    use_query_cache         : true,
    using_max_key_table     : false,
    entities                : x.base.OrderedMap.clone({ id: "entities" }),          // singleton - not to be cloned!
    data_volume_oom         : null                      // expected data size as a power of 10
});



x.data.Entity.register("initCreate");
x.data.Entity.register("initUpdate");
x.data.Entity.register("load");
x.data.Entity.register("reload");
x.data.Entity.register("afterTransChange");
x.data.Entity.register("presave");



x.data.Entity.defbind("setupEntity", "cloneType", function () {
    this.table = this.table || this.id;
    if (this.parent_entity) {            // parent_entity MUST be loaded first
        this.trace("Linking " + this.id + " to its parent " + this.parent_entity );
        if (!this.getEntity(this.parent_entity)) {          // parent entities will have to be loaded before their children!
            this.throwError("invalid parent entity");
        }
        if (!this.getEntity(this.parent_entity).children) {
            this.getEntity(this.parent_entity).children = {};
        }
        this.getEntity(this.parent_entity).children[this.id] = this;
    }
});


x.data.Entity.define("getRecord", function (spec) {
    spec = spec || {};
    spec.id = spec.id || this.id;
    spec.instance = true;
    delete spec.key;
    return this.clone(spec);
});


x.data.Entity.define("getRow", function (arg, connection) {
    var row,
        obj = this;

    if (obj.instance) {
        obj = obj.parent;
    }
    row = obj.clone({
        id: obj.id,
        connection: connection,         // transactional connection
        modifiable: false,
        instance: true
    });
    if (typeof arg === "string") {
        row.load(arg);          // throws 'Record not found' if not found
    } else if (arg && arg.resultset) {
        row.populate(arg.resultset);
        row.db_record_exists = true;
    } else {
        this.throwError("invalid argument: " + arg);
    }
    return row;
});



x.data.Entity.define("getKey", function () {
    var key_fields = this.primary_key.split(","),
        delim = "",
        i;

    if (!this.key) {
        this.key = "";
        for (i = 0; i < key_fields.length; i += 1) {
            this.key += delim + this.getField(key_fields[i]).get();
            delim = ".";
        }
    }
    return this.key;
});


x.data.Entity.define("getLabel", function (pattern_type) {
    var pattern = this["label_pattern_" + pattern_type] || this.label_pattern,
        out;

    if (pattern) {
        out = this.detokenize(pattern);
    } else if (this.title_field) {
        out = this.getField(this.title_field).getText();
    }
    return out || "(ERROR: no label defined for " + this.id + ")";
});


x.data.Entity.define("getPluralLabel", function () {
    return this.plural_label || this.title + "s";
});


x.data.Entity.define("getSearchPage", function () {
    var page_id = this.id + "_search";
    if (typeof this.search_page === "string") {
        page_id = this.search_page;
    }
    return require("../page/Page").getPage(page_id);        // can't declare at top due to circularity!!!!
});


x.data.Entity.define("getDisplayPage", function () {
    var page_id = this.id + "_display";
    if (typeof this.display_page === "string") {        // ignores this.display_page if boolean
        page_id = this.display_page;
    }
    return require("../page/Page").getPage(page_id);
});


x.data.Entity.define("getDisplayURL", function (key) {
    if (typeof key !== "string") {
        key = this.getKey();
    }
    this.checkKey(key);            // throws exception if key is invalid
    return this.getDisplayPage().getSimpleURL(key);
});


x.data.Entity.define("isKey", function (field_id) {
    var key_fields = this.primary_key.split(",");
    return (key_fields.indexOf(field_id) > -1);
});


x.data.Entity.define("isKeyComplete", function (key) {
    if (typeof key !== "string") {
        key = this.getKey();
    }
    try {
        this.checkKey(key);
        return true;
    } catch (ignore) {
        return false;
    }
});


x.data.Entity.define("getKeyPieces", function () {
    var key_fields = this.primary_key.split(","),
        i,
        field;

    if (!this.key_pieces) {
        this.key_pieces = 0;
        for (i = 0; i < key_fields.length; i += 1) {
            field = this.getField(key_fields[i]);
            if (!field) {
                this.throwError("invalid field in primary key");
            }
            this.key_pieces += field.getKeyPieces();
        }
    }
    return this.key_pieces;
});


x.data.Entity.define("getKeyLength", function () {
    var key_fields,
        i,
        field,
        delim = 0;

    key_fields = (this.primary_key && this.primary_key.split(",")) || [];
    if (typeof this.key_length !== "number") {
        this.key_length = 0;
        for (i = 0; i < key_fields.length; i += 1) {
            field = this.getField(key_fields[i]);
            if (!field) {
                this.throwError("invalid field in primary key");
            }
            this.key_length += delim + field.getDataLength();
            delim = 1;
        }
    }
    return this.key_length;
});


x.data.Entity.define("checkKey", function (key) {
    var pieces,
        piecesRequired,
        val,
        i;

    if (typeof key !== "string" || key === "") {
        this.throwError("key must be nonblank string");
    }
    pieces = key.split(".");            // Argument is NOT a regex
    piecesRequired = this.getKeyPieces();
    if (piecesRequired !== pieces.length) {
        this.throwError("wrong number of key pieces");
    }
    for (i = 0; i < pieces.length; i += 1) {
        val = pieces[i];
        if (!val) {
            this.throwError("key piece is blank");
        }
        if (val && !val.match(/^[a-zA-Z0-9_\-]+$/)) {
            this.throwError("invalid character in key string");
        }
    }
});


x.data.Entity.define("populateFromKey", function (key) {
    var key_fields = this.primary_key.split(","),
        pieces = key.split("."),
        start = 0,
        end,
        field,
        i;

    this.checkKey(key);
    for (i = 0; i < key_fields.length; i += 1) {
        field = this.getField(key_fields[i]);
        end = start + field.getKeyPieces();
        field.set(pieces.slice(start, end).join("."));
        start = end;
    }
});


x.data.Entity.define("getAutoIncrementColumn", function () {
    var key_fields = this.primary_key.split(",");
    return (key_fields.length === 1) && this.getField(key_fields[0]).auto_generate && key_fields[0];
});


x.data.Entity.override("isValid", function () {
    // TODO - some code sets the key of sub-records in page presave(), which is only called if the transaction is valid already
    return x.data.FieldSet.isValid.call(this) && !this.duplicate_key /*&& this.isKeyComplete()*/ && !this.lock_failure &&
            (!this.messages || !this.messages.error_recorded_since_clear);
});


x.data.Entity.override("setDelete", function (bool) {
    // var that = this;
    x.data.FieldSet.setDelete.call(this, bool);
/* - nice idea, but needs testing                        TODO
    if (this.action === "C" || this.action === "I") {
        this.action = bool ? "I" : "C";        // 'I' = ignore (create & delete); 'C' = create
    } else if (this.action === "U" || this.action === "D") {
        this.action = bool ? "D" : "U";        // 'D' = delete; 'U' = update
    }
*/
    if (this.deleting && this.db_record_exists /*&& !this.db_record_locked*/) {
//        this.lock();      trans.getRow() and trans.getActiveRow() now lock the obtained row
        this.eachChildRow(function (row) {
            row.setDelete(bool);
        });
    }
});


x.data.Entity.define("eachChildRow", function (callback) {
    var that = this;
    _.each(this.children, function (ignore /*record*/, entity_id) {
        that.trace("loadChildRows() found child: " + entity_id);
        that.eachLinkedRow(entity_id, null, callback);
    });
});


x.data.Entity.define("eachLinkedRow", function (entity_id, link_field_id, callback) {
    var entity = this.getEntityThrowIfUnrecognized(entity_id),
        query,
        row,
        response;

    if (!this.trans) {
        this.throwError("row has no transaction");
    }
    if (!link_field_id && entity.parent_entity === this.id) {
        link_field_id = entity.link_field;
    }

    query = entity.getQuery();
    query.addCondition({ column: "A." + link_field_id, operator: "=", value: this.getKey() });
    while (query.next() && response !== false) {
        if (this.trans) {
            row = this.trans.getActiveRow(entity_id, query.getColumn("A._key").get());
            response = callback.call(this, row);
        } else {
            response = callback.call(this, query);
        }
    }
    query.reset();
    if (!this.trans) {
        return;
    }
    _.each(this.trans.curr_rows[entity_id], function (row) {
        if (row.action === 'C' && row.getField(link_field_id).get() === this.getKey()) {
            callback.call(this, row);
        }
    });
});


x.data.Entity.defbind("preventKeyChange", "beforeFieldChange", function (arg) {
    if (this.isKey(arg.field.getId()) && this.db_record_exists) {
        this.throwError("trying to change key field of existing record");
    }
    this.trace("preventKeyChange() " + this.db_record_exists + ", " + this.db_record_locked);
    if (this.db_record_exists && this.action !== 'C' && !this.db_record_locked && !this.lock_failure) {
        this.lock();
    }
});


x.data.Entity.defbind("doKeyChange", "afterFieldChange", function (arg) {
    this.trace(this.id + "::afterFieldChange(): " + arg.field.old_val + "->" + arg.field.get() + ", trans: " + this.trans);
    if (this.trans) {
        if (this.isKey(arg.field.getId()) && arg.field.isValid()) {    // only try keyChange() on a valid value
            this.keyChange(arg.field, arg.field.old_val);
        }
        this.happen("afterTransChange", arg);
    }
});


x.data.Entity.define("linkToParent", function (parent_record, link_field) {
    // if (!this.db_record_exists && parent_record && link_field) {
        if (typeof parent_record.getKey() === "string" && this.getField(link_field).get() !== parent_record.getKey()) {
            this.getField(link_field).set(parent_record.getKey());
        }
        this.parent_record = parent_record;         // support key change linkage
        this.trans_link_field = link_field;         // invoked when keyChange() calls trans.addToCache()
    // }
});


// copy values from fieldset's fields for each field whose id matches, except for keys, using setInitial()
x.data.Entity.override("copyFrom", function (fieldset) {
    this.each(function (field) {
        if (fieldset.getField(field.id) && !field.isKey()) {
            field.setInitial(fieldset.getField(field.id).get());
        }
    });
});


//copy values from query's columns for each field whose id matches, except for keys, using setInitial()
x.data.Entity.define("copyFromQuery", function (query) {
    this.each(function (field) {
        if (!field.isKey()) {
            field.copyFromQuery(query);
        }
    });
});


x.data.Entity.define("presave", function (outcome_id) {
    this.presave_called = true;
    this.happen("presave", outcome_id);
});


// This function is NOT defined in an entity unless it actually does something
// - so the existence of this function indicates whether or not record security is applicable for the entity.
// x.data.Entity.define("addSecurityCondition", function (query, session) {
// });	//---addSecurityCondition
x.data.Entity.define("renderLineItem", function (element /*, render_opts*/) {
    var display_page = this.getDisplayPage(),
        anchor = element.makeAnchor(this.getLabel("list_item"), display_page && display_page.getSimpleURL(this.getKey()));

    return anchor;
});


x.data.Entity.define("renderTile", function (parent_elem, render_opts) {
    var div_elem = parent_elem.addChild("div", this.id + "_" + this.getKey(), "css_tile");
    this.addTileURL(div_elem, render_opts);
    this.addTileContent(div_elem, render_opts);
});


x.data.Entity.define("addTileURL", function (div_elem /*, render_opts*/) {
    var display_page = this.getDisplayPage();
    if (display_page) {
        div_elem.attr("url", display_page.getSimpleURL(this.getKey()));
    }
});


x.data.Entity.define("addTileContent", function (div_elem /*, render_opts*/) {
    if (this.glyphicon) {
        div_elem.makeElement("i", this.glyphicon);
        div_elem.text("&nbsp;");
    } else if (this.icon) {
        div_elem.makeElement("img")
            .attr("alt", this.title)
            .attr("src", "/cdn/" + this.icon);
    }
    div_elem.text(this.getLabel("tile"));
});


x.data.Entity.define("getDotGraphNode", function (highlight) {
    var key = this.getKey(),
        out = key + " [ label=\"" + this.getLabel("dotgraph") + "\" URL=\"" + this.getDisplayURL(key) + "\"";

    if (highlight) {
        out += " style=\"filled\" fillcolor=\"#f8f8f8\"";
    }
    return out + "]; ";
});


x.data.Entity.define("getDotGraphEdge", function (parent_key) {
    var out = "";
    if (parent_key) {
        out = parent_key + " -> " + this.getKey() + ";";            // add label property if relevant
    }
    return out;
});


x.data.Entity.define("replaceTokenRecord", function (key) {
    var page,
        row;

    page = this.getDisplayPage();
    if (!page) {
        return "(ERROR: no display page for entity: " + this.id + ")";
    }
    row  = this.getRow(key);
    if (!row) {
        return "(ERROR: record not found: " + this.id + ":" + key + ")";
    }
    return "<a href='" + page.getSimpleURL(row.getKey()) + "'>" + row.getLabel("article_link") + "</a>";
    // return XmlStream.left_bracket_subst + "a href='" +
    //     page.getSimpleURL(row.getKey()) + "'" + XmlStream.right_bracket_subst + row.getLabel("article_link") +
    //     XmlStream.left_bracket_subst + "/a" + XmlStream.right_bracket_subst;
});


x.data.Entity.define("setupDateRangeValidation", function (start_dt_field_id, end_dt_field_id) {
    var start_dt_field = this.getField(start_dt_field_id),
          end_dt_field = this.getField(  end_dt_field_id);

    start_dt_field.css_reload = true;
      end_dt_field.css_reload = true;

// could perhaps use update event instead of these two...
    start_dt_field.defbind("setMinDateInitial_" + end_dt_field_id, "setInitialTrans", function () {
        var end_dt_field2 = this.owner.getField(end_dt_field_id);
        end_dt_field2.min = this.get();
        this.max = end_dt_field2.get();
    });

    start_dt_field.defbind("setMinDateChange_" + end_dt_field_id, "afterTransChange", function () {
        var end_dt_field2 = this.owner.getField(end_dt_field_id);
        end_dt_field2.min = this.get();
        this.max = end_dt_field2.get();
    });

      end_dt_field.defbind("setMinDateChange_" + start_dt_field_id, "afterTransChange", function () {
        var start_dt_field2 = this.owner.getField(start_dt_field_id);
        start_dt_field2.max = this.get();
        this.min = start_dt_field2.get();
    });

});


x.data.Entity.define("setupOneWayLinkedFields", function (parent_field_id, child_field_id, interlink_field_id) {
    this.getField(parent_field_id).css_reload           = true;
    this.getField( child_field_id).render_autocompleter = false;
    this.getField( child_field_id).editable             = false;


    this.defbind(  "initOneWayLink_" + child_field_id, "initUpdate", function () {
        this.updateLinkedFields(parent_field_id, child_field_id, interlink_field_id);
    });

    this.defbind("updateOneWayLink_" + child_field_id, "update"    , function () {
        this.updateLinkedFields(parent_field_id, child_field_id, interlink_field_id);
    });
});


x.data.Entity.define("updateLinkedFields", function (parent_field_id, child_field_id, interlink_field_id) {
    var parent_field = this.getField(parent_field_id),
         child_field = this.getField( child_field_id);

    if (!parent_field.isBlank()) {
        child_field.editable = true;
        if (!child_field.lov || parent_field.isChangedSincePreviousUpdate()) {
            child_field.getOwnLoV({ condition: "A." + interlink_field_id + " = " + parent_field.getSQL() });
        }
        if (parent_field.isChangedSincePreviousUpdate()) {
            child_field.set("");
        }
    }
});

