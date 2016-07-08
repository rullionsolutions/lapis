/*global x, _ */
"use strict";

x.data.entities = {};                      // singleton - not to be cloned!

/**
* To represent a record in a database table
*/
x.data.Entity = x.data.FieldSet.clone({
    id                      : "Entity",
    status                  : null,     // 'N'ew, 'C'reating, 'L'oading, 'U'nmodified, 'M'odified, 'S'aving, 'E'rror
                                        // N > C > U > M > S > U,   N > L > U > M > S > U,   S > E,   L > E
    deleting                : null,
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
    this.status   = this.status || 'N';
    this.deleting = false;
    this.children = {};                     // map of arrays of record objects
    _.each(this.parent.children, function (ignore /*entity*/, entity_id) {
        that.children[entity_id] = [];
    });
    if (this.primary_key) {
        key_fields = this.primary_key.split(",");
        this.primary_key = [];
        _.each(key_fields, function (key_field) {
            var field = that.getField(key_field);
            if (field) {
                that.primary_key.push(field);
                if (!field.mandatory) {
                    that.throwError("key field must be mandatory: " + key_field);
                }
            } else {
                that.throwError("invalid field id in primary_key: " + key_field);
            }
        });
    }
});


//--------------------------------------------------------------------------------- type methods
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


//--------------------------------------------------------------------------------- instance methods
x.data.Entity.define("isInitializing", function () {
    if (this.status === 'N') {
        this.throwError("status should not be N");
    }
    return (this.status === 'C' || this.status === 'L');
});


x.data.Entity.define("getReadyPromise", function () {
    if (!this.ready_promise) {
        if (this.status === 'L') {
            this.ready_promise = this.data_manager.getLoadingPromise(this);
        } else if (this.status === 'S') {
            this.ready_promise = this.data_manager.getSavingPromise(this);
        } else {
            this.ready_promise = this.getNullPromise(this);
        }
    }
    return this.ready_promise;
});


x.data.Entity.define("populateFromObject", function (obj) {
    var that = this;
    this.each(function (field) {
        if (typeof obj[field.id] === "string") {
            field.set(obj[field.id]);
        }
    });
    // this.uuid = obj.uuid;
    // this.status   = 'U';        // unmodified
    // if (this.data_manager && this.isInitializing()) {       // if not initializing, addToCache is already called by field.set() above
    //     this.data_manager.addToCache(this, this.full_key);
    // }
    // this.full_key = this.getFullKey();
    if (!this.children) {
        return;
    }
    _.each(this.parent.children, function (entity, entity_id) {
        if (obj[entity_id] && obj[entity_id].length > 0) {
            that.children[entity_id] = [];
            _.each(obj[entity_id], function (obj_sub) {
                var record = entity.getRecord();
                record.populateFromDocument(obj_sub);
                record.happen("initUpdate");
                that.children[entity_id].push(record);
            });
        }
    });
});


x.data.Entity.define("populateToObject", function () {
    var new_obj = {};
    this.each(function (field) {
        if (!field.isBlank()) {
            new_obj[field.id] = field.get();
        }
    });
    // new_obj.uuid = this.getUUID();
    // if (!new_obj.uuid || typeof new_obj.uuid !== "string") {
    //     this.throwError("invalid uuid: " + new_obj.uuid);
    // }
    _.each(this.children, function (record_array) {
        _.each(record_array, function (record) {
            if (record.deleting) {
                return;
            }
            if (!new_obj[record.parent.id]) {
                new_obj[record.parent.id] = [];
            }
            new_obj[record.parent.id].push(record.populateToDocument());
        });
    });
    return new_obj;
});


x.data.Entity.define("createChildRecord", function (entity_id) {
    var record;
    if (!this.parent.children || !this.parent.children[entity_id]) {
        this.throwError("invalid entity_id: " + entity_id);
    }
    record = this.parent.children[entity_id].getRecord({ modifiable: true });
    this.children[entity_id] = this.children[entity_id] || [];
    this.children[entity_id].push(record);
    record.setDefaultVals();
    record.parent_record = this;         // support key change linkage
    try {
        record.getField(record.link_field).set(this.getFullKey());
    } catch (e) {
        this.report(e);         // should only be 'primary key field is blank...'
    }
    // record.linkToParent(this, link_field);
    record.happen("initCreate");
    return record;
});


x.data.Entity.defbind("setKeyFieldsFixed", "initUpdate", function () {
    this.checkKey(this.getFullKey());
    _.each(this.primary_key, function (key_field) {
        key_field.fixed_key = true;
    });
});


x.data.Entity.defbind("checkForPrimaryKeyChange", "afterFieldChange", function (spec) {
    if (this.status === 'U') {
        this.status = 'M';
    }
    if (this.primary_key.indexOf(spec.field) > -1) {
        if (this.data_manager) {
            this.data_manager.addToCache(this, this.full_key);
        }
        this.full_key = this.getFullKey();
        this.eachChildRecord(function (record) {
            record.getField(record.link_field).set(spec.field.get());
        });
    }
});

/*
x.data.Entity.define("linkToParent", function (parent_record, link_field) {
    // if (!this.db_record_exists && parent_record && link_field) {
    this.parent_record = parent_record;         // support key change linkage
    this.trans_link_field = link_field;         // invoked when keyChange() calls trans.addToCache()
    // }
});
*/

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


x.data.Entity.define("checkKey", function (key) {
    var pieces,
        pieces_required,
        val,
        i;

    if (typeof key !== "string" || key === "") {
        this.throwError("key must be a non-blank string");
    }
    pieces = key.split(".");            // Argument is NOT a regex
    pieces_required = this.getKeyPieces();
    if (pieces_required !== pieces.length) {
        this.throwError(pieces_required + " key pieces required, " + pieces.length + " found in " + key);
    }
    for (i = 0; i < pieces.length; i += 1) {
        val = pieces[i];
        if (!val) {
            this.throwError(i + "th key piece is blank in " + key);
        }
        if (val && !val.match(/^[a-zA-Z0-9_\-]+$/)) {
            this.throwError("invalid character in key piece: " + val);
        }
    }
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
    var count = 0;
    _.each(this.primary_key, function (key_field) {
        count += key_field.getKeyPieces();
    });
    return count;
});


x.data.Entity.define("getKeyLength", function () {
    var that = this,
        delim = 0;

    if (typeof this.key_length !== "number") {
        this.key_length = 0;
        _.each(this.primary_key, function (key_field) {
            that.key_length += delim + key_field.getDataLength();
            delim = 1;
        });
    }
    return this.key_length;
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


x.data.Entity.override("isValid", function () {
    return x.data.FieldSet.isValid.call(this) && (this.status !== 'E') && (!this.messages || !this.messages.error_recorded);
});


x.data.Entity.define("setDelete", function (bool) {
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


x.data.Entity.define("isDelete", function () {
    return this.deleting;
});


// this can be called on an unmodified parent record containing modified children
x.data.Entity.define("saveInternal", function () {
    // if (this.status === 'M' || this.status === 'C' || this.deleting) {
        this.status = 'S';
        this.ready_promise = null;
        this.getReadyPromise();
    // } else {
    //     this.throwError("invalid status: " + this.status + ", and deleting: " + this.deleting);
    // }
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

