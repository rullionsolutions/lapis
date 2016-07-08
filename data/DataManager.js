/*global x, _ */
"use strict";

/**
* To manage a set of records, ensuring ACID compliance
*/
x.data.DataManager = x.base.Base.clone({
    id          : "DataManager",
    curr_records: null,            // full key records
     new_records: null             // partial key records
});


x.data.DataManager.defbind("setupInstance", "cloneInstance", function () {
    this.curr_records = {};            // full key records
    this. new_records = [];            // partial key records
});


x.data.DataManager.define("getRecordNullIfNotInCache", function (entity_id, key) {
    if (!x.data.entities[entity_id]) {
        this.throwError("entity id not recognized: " + entity_id);
    }
    if (!this.curr_records[entity_id]) {
        return null;
    }
    return this.curr_records[entity_id][key];
});


x.data.DataManager.define("getRecordThrowIfNotInCache", function (entity_id, key) {
    var record = this.getRecordNullIfNotInCache(entity_id, key);
    if (!record) {
        this.throwError("record not found with entity id: " + entity_id + " and key: " + key);
    }
    return this.curr_records[entity_id][key];
});


x.data.DataManager.define("getRecord", function (entity_id, key) {
    var record = this.getRecordNullIfNotInCache(entity_id, key);
    if (!record) {
        record = this.getExistingRecordNotInCache(entity_id, key);
    }
    return record;
});


x.data.DataManager.define("getExistingRecordNotInCache", function (entity_id, key) {
    var record;
    if (this.getRecordNullIfNotInCache(entity_id, key)) {
        this.throwError("record already exists with entity id: " + entity_id + " and key: " + key);
    }
    record = x.data.entities[entity_id].getRecord({ data_manager: this, status: 'L', modifiable: true, load_key: key });
    // record.populateFromObject(values);
    this.addToCache(record);
    record.getReadyPromise();
    return record;
});


x.data.DataManager.define("getLoadingPromise", function (/*record*/) {
    this.throwError("not implemented");
});


x.data.DataManager.define("getSavingPromise", function (/*record*/) {
    this.throwError("not implemented");
});


x.data.DataManager.define("createNewRecord", function (entity_id) {
    var record;
    if (!x.data.entities[entity_id]) {
        this.throwError("entity id not recognized: " + entity_id);
    }
    record = x.data.entities[entity_id].getRecord({ data_manager: this, status: 'C', modifiable: true });
    record.setDefaultVals();
    record.status = 'U';
    // this.record.generateKey();                  // which may move it into the curr_records cache
    this.new_records.push(record);
    record.happen("initCreate");
    return record;
});


x.data.DataManager.define("doFullKeyRecords", function (funct) {
    _.each(this.curr_records, function (curr_records) {
        _.each(curr_records, function (curr_record) {
            funct(curr_record);
        });
    });
});


x.data.DataManager.define("doPartialKeyRecords", function (funct) {
    var temp_records = this.new_records.slice(0),         // avoid mutations in new_records during execution
        i;

    for (i = 0; i < temp_records.length; i += 1) {
        funct(temp_records[i]);
    }
});


x.data.DataManager.define("addToCache", function (record, prev_key) {
    var entity_id = record.id,
        key       = record.load_key || record.getFullKey(),
        index;

    if (this.curr_records[entity_id] && this.curr_records[entity_id][key]) {
        if (this.curr_records[entity_id][key] === record) {
            this.throwError("record is already present in cache with correct entity_id and key: " + entity_id + ":" + key);
        }
        this.throwError("id already present in cache: " + entity_id + ":" + key);
    }
    index = this.new_records.indexOf(record);
    if (index > -1) {
        this.new_records.splice(index, 1);      // Remove record from new_records
        this.debug("Removing record from new_records cache: " + entity_id + ":" + key);
    }
    if (prev_key && this.curr_records[entity_id] && this.curr_records[entity_id][prev_key] === record) {
        this.debug("Removing record from curr_records cache: " + entity_id + ":" + prev_key);
        delete this.curr_records[entity_id][prev_key];
    }

    this.debug("Adding record to curr_records cache: " + entity_id + ":" + key);
    if (!this.curr_records[entity_id]) {
        this.curr_records[entity_id] = {};
    }
    this.curr_records[entity_id][key] = record;

    this.debug("Checking for parent_record updates: " + entity_id + ":" + key);
});


x.data.DataManager.define("isValid", function () {
    var valid = true;
    this.doFullKeyRecords(function (record) {
        if (!record.deleting && record.isModified()) {
            valid = valid && record.isValid();
        }
    });
    this.doPartialKeyRecords(function (record) {
        if (!record.deleting) {
            valid = valid && record.isValid();
        }
    });
    return valid;
});


x.data.DataManager.define("getRecordCount", function (spec) {
    return this.getRecordCountFullKey(spec) + this.getRecordCountPartialKey(spec);
});


x.data.DataManager.define("getRecordCountFullKey", function (spec) {
    var count = 0;
    if (!spec.partial_key_only) {
        this.doFullKeyRecords(function (record) {
            if (!spec.modified_only || record.isModified()) {
                count += 1;
            }
        });
    }
    return count;
});


x.data.DataManager.define("getRecordCountPartialKey", function (spec) {
    var count = 0;
    if (!spec.full_key_only) {
        this.doPartialKeyRecords(function (record) {
            if ((typeof spec.modified !== "boolean") || (spec.modified === record.isModified())) {
                count += 1;
            }
        });
    }
    return count;
});


x.data.DataManager.define("save", function () {
    this.presaveValidation();
    this.saveInternal();
});


x.data.DataManager.define("presaveValidation", function () {
    var count = this.getRecordCount({ partial_key_only: true });
    if (count > 0) {
        this.throwError(count + " partial-key record(s) still present");
    }
    count = this.getRecordCount({ full_key_only: true, modified: true });
    if (count === 0) {
        this.throwError("no modified record(s) to save");
    }
    if (!this.isValid()) {
        this.throwError("contains invalid record(s)");
    }
});


x.data.DataManager.define("saveInternal", function () {
    this.doFullKeyRecords(function (record) {
        if (record.deleting || record.isModified()) {
            record.saveInternal();
        }
    });
});


x.data.DataManager.define("afterSave", function (record) {
    record.status = 'U';
    record.modified = false;
    if (record.deleting) {
        delete this.curr_records[record.id][record.getFullKey()];
    }
});
