/*global x, _ */
"use strict";

x.data.entities = {};                      // singleton - not to be cloned!

/**
* To represent a record in a database table
*/
x.data.Entity = x.data.FieldSet.clone({
    id                      : "Entity",
    data_volume_oom         : null                      // expected data size as a power of 10
});



x.data.Entity.register("initCreate");
x.data.Entity.register("initUpdate");
x.data.Entity.register("load");
x.data.Entity.register("afterTransChange");
x.data.Entity.register("presave");



x.data.Entity.defbind("setupEntity", "cloneType", function () {
    if (x.data.entities[this.id]) {
        this.throwError("entity already defined: " + this.id);
    }
    x.data.entities[this.id] = this;
    this.children = {};                     // map of Entity objects
    if (this.parent_entity) {               // parent_entity MUST be loaded first
        this.trace("Linking " + this.id + " to its parent " + this.parent_entity );
        // parent entities will have to be loaded before their children!
        this.getEntityThrowIfUnrecognized(this.parent_entity).children[this.id] = this;
    }
});


x.data.Entity.defbind("setupRecord", "cloneInstance", function () {
    var that = this,
        key_fields;

    if (!this.children) {
        return;
    }
    this.children = {};                     // map of arrays of record objects
    _.each(this.parent.children, function (ignore /*entity*/, entity_id) {
        that.children[entity_id] = [];
    });
    if (this.primary_key) {
        key_fields = this.primary_key.split(",");
        this.primary_key = [];
        _.each(key_fields, function (key_field) {
            that.primary_key.push(that.getField(key_field));
        });
    }
});


x.data.Entity.define("getEntity", function (entity_id) {
    return x.data.entities[entity_id];
});


x.data.Entity.define("getEntityThrowIfUnrecognized", function (entity_id) {
    var entity = this.getEntity(entity_id);
    if (!entity) {
        this.throwError("Entity not recognized: " + entity_id);
    }
    return entity;
});


x.data.Entity.define("getRecord", function (spec) {
    spec = spec || {};
    spec.id = spec.id || this.id;
    spec.instance = true;
    delete spec.key;
    return this.clone(spec);
});


x.data.Entity.define("populateFromDocument", function (doc_obj) {
    var that = this;
    this.each(function (field) {
        if (typeof doc_obj[field.id] === "string") {
            field.setInitial(doc_obj[field.id]);
        }
    });
    // this.uuid = doc_obj.uuid;
    if (!this.children) {
        return;
    }
    _.each(this.parent.children, function (entity, entity_id) {
        if (doc_obj[entity_id] && doc_obj[entity_id].length > 0) {
            that.children[entity_id] = [];
            _.each(doc_obj[entity_id], function (doc_obj_sub) {
                var record = entity.getRecord();
                record.populateFromDocument(doc_obj_sub);
                record.happen("initUpdate");
                that.children[entity_id].push(record);
            });
        }
    });
});


x.data.Entity.define("populateToDocument", function () {
    var new_obj = {};
    this.each(function (field) {
        if (!field.isBlank()) {
            new_obj[field.id] = field.get();
        }
    });
    new_obj.uuid = this.getUUID();
    if (!new_obj.uuid || typeof new_obj.uuid !== "string") {
        this.throwError("invalid uuid: " + new_obj.uuid);
    }
    _.each(this.children, function (record_array) {
        _.each(record_array, function (record) {
            if (!new_obj[record.parent.id]) {
                new_obj[record.parent.id] = [];
            }
            new_obj[record.parent.id].push(record.populateToDocument());
        });
    });
    return new_obj;
});


x.data.Entity.define("createChildRecord", function (entity_id, link_field) {
    var record;
    if (!this.parent.children || !this.parent.children[entity_id]) {
        this.throwError("invalid entity_id: " + entity_id);
    }
    record = this.parent.children[entity_id].getRecord({ modifiable: true });
    this.children[entity_id] = this.children[entity_id] || [];
    this.children[entity_id].push(record);
    record.setDefaultVals();
    record.linkToParent(this, link_field);
    record.happen("initCreate");
    return record;
});


x.data.Entity.define("linkToParent", function (parent_record, link_field) {
    // if (!this.db_record_exists && parent_record && link_field) {
    this.parent_record = parent_record;         // support key change linkage
    this.trans_link_field = link_field;         // invoked when keyChange() calls trans.addToCache()
    // }
});


x.data.Entity.define("getChildRecord", function (entity_id, relative_key) {
    var found_record;
    this.eachChildRecord(function (record) {
        if (record.getRelativeKey() === relative_key) {
            found_record = record;
        }
    }, entity_id);
    return found_record;
});


x.data.Entity.define("eachChildRecord", function (funct, entity_id) {
    var that = this;
    if (entity_id) {
        _.each(this.children[entity_id], function (record) {
            funct(record);
        });
    } else {
        _.each(this.children, function (ignore /*record_array*/, temp_entity_id) {
            that.eachChildRecord(funct, temp_entity_id);
        });
    }
});


x.data.Entity.define("getRelativeKey", function () {
    var that  = this,
          out = "",
        delim = "";

    if (!this.primary_key || this.primary_key.length === 0) {
        this.throwError("primary key has no fields");
    }
    _.each(this.primary_key, function (key_field) {
        if (key_field.isBlank()) {
            that.throwError("primary key field is blank: " + key_field.id);
        }
        out += delim + key_field.get();
        delim = ".";
    });
    return out;
});


x.data.Entity.define("getFullKey", function () {
    var out = "";
    if (this.parent_record) {
        out = this.parent_record.getFullKey() + ".";
    }
    out += this.getRelativeKey();
    return out;
});


x.data.Entity.define("getUUID", function () {
    return this.id + ":" + this.getFullKey();
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
    key = key || this.getFullKey();
    return this.getDisplayPage().getSimpleURL(key);
});


x.data.Entity.override("isValid", function () {
    // TODO - some code sets the key of sub-records in page presave(), which is only called if the transaction is valid already
    return x.data.FieldSet.isValid.call(this) && !this.duplicate_key /*&& this.isKeyComplete()*/ && !this.lock_failure &&
            (!this.messages || !this.messages.error_recorded_since_clear);
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
        anchor = element.makeAnchor(this.getLabel("list_item"), display_page && display_page.getSimpleURL(this.getFullKey()));

    return anchor;
});


x.data.Entity.define("renderTile", function (parent_elem, render_opts) {
    var div_elem = parent_elem.makeElement("div", "css_tile", this.getUUID());
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
    var key = this.getFullKey(),
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

