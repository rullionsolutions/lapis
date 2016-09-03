/*global x, _ */
"use strict";

/**
* To manage a set of records, ensuring ACID compliance
*/
x.data.DataSet = x.base.Base.clone({
    id : "DataSet",
    curr_rows  : {},            // full key rows
    new_rows   : [],            // partial key rows
    row_number : 0,
    stage      : 10         // 0 = init, 10 = ready, 20 = modified, 30 = presave start, 40 = presave end, 50 = save ended successfully
    // active     : true,
    // modified   : false,
    // readonly   : false
});


/**
* To create a new row for the given entity in this transaction, which will initially have
* @param string id of the entity
* @return new row object (clone of x.entities[entity_id]) belonging to this transaction
*/
x.data.DataSet.define("createNewRow", function (entity_id, addl_data) {
    var row;
    if (this.stage < 10 || this.stage > 30) {
        this.throwError("transaction not active: " + this.stage);
    }
    row = x.data.entities[entity_id].getTransRow(this, "C", null, addl_data);
    this.new_rows.push(row);            // add to new_rows cache before generating key
    row.setDefaultVals();
    row.generateKey();                  // which may move it into the curr_rows cache
    // added to Entity.keyChange() to happen automatically whenever a key field is changed
    row.happen("initCreate");
    if (this.stage === 30 && !row.presave_called) {
        row.presave(this.presave_outcome_id);
    }
    return row;
});


/**
* To amend an existing row for the given entity in this transaction, whose key cannot be
* @param string id of the entity; string key referencing the row
* @return row object (clone of x.entities[entity_id]) belonging to this transaction
*/
x.data.DataSet.define("getActiveRow", function (entity_id, key) {
    var row;
    if (this.stage < 10 || this.stage > 30) {
        this.throwError("transaction not active: " + this.stage);
    }
    row = this.isInCache(entity_id, key);
    if (row) {
        return row;
    }
    row = x.data.entities[entity_id].getTransRow(this, "U", key);
    row.load(key);                    // throws 'Record not found' if not found
    this.addToCache(row);
    row.happen("initUpdate");
    if (this.presave_called && !row.presave_called) {
        row.presave(this.presave_outcome_id);
    }
    return row;
});


x.data.DataSet.define("getRow", function (entity_id, key, addl_data) {
    var row;
    if (this.stage < 10 || this.stage > 30) {
        this.throwError("transaction not active: " + this.stage);
    }
    row = this.isInCache(entity_id, key);
    if (row) {
        return row;
    }
    row = x.data.entities[entity_id].getTransRow(this, "", key, addl_data);
    try {
        row.load(key);                // throws 'Record not found' if not found
        // added to Entity.keyChange() to happen automatically whenever a key field is changed
        this.addToCache(row);
        row.action = "U";
        row.happen("initUpdate");
    } catch (ignore) {
        this.new_rows.push(row);            // add to new_rows cache before generating key
        row.action = "C";
        row.populateFromKey(key);
        row.setDefaultVals();
        row.generateKey();                    // which may move it into the curr_rows cache
        row.happen("initCreate");
    }
    if (this.presave_called && !row.presave_called) {
        row.presave(this.presave_outcome_id);
    }
    return row;
});


/**
* To return an array containing each full-key rows in this transaction. Optional filtered by entity Id
* @param Entity id or undefined
* @return Array of entities row or an empty array
*/
x.data.DataSet.define("getExistingRows", function (entity_id) {
    var rows = [];
    function pushRow(row) {
        rows.push(row);
    }
    function pushAllRows(rows_entity_array) {
        _.each(rows_entity_array, pushRow);
    }
    if (entity_id && this.curr_rows[entity_id]) {
        _.each(this.curr_rows[entity_id], pushRow);
    }
    if (!entity_id) {
        _.each(this.curr_rows, pushAllRows);
    }
    rows.sort(function (row1, row2) {
        return row1.getKey() > row2.getKey() ? 1 : -1;
    });
    return rows;
});


x.data.DataSet.define("removeRow", function (row) {
    if (this.stage < 10 || this.stage > 30) {
        this.throwError("transaction not active: " + this.stage);
    }
    row.cancel();
    if (this.curr_rows[row.id] && this.curr_rows[row.id][row.getKey()]) {
        delete this.curr_rows[row.id][row.getKey()];
    } else if (this.new_rows.indexOf(row) > -1) {
        this.new_rows.splice(this.new_rows.indexOf(row), 1);
    }
});


x.data.DataSet.define("doFullKeyRows", function (funct) {
    _.each(this.curr_rows, function (curr_rows) {
        _.each(curr_rows, function (curr_row) {
            funct(curr_row);
        });
    });
});


x.data.DataSet.define("doPartialKeyRows", function (funct) {
    var temp_rows = this.new_rows.slice(0),         // avoid mutations in new_rows during execution
        i;

    for (i = 0; i < temp_rows.length; i += 1) {
        funct(temp_rows[i]);
    }
});


x.data.DataSet.define("addToCache", function (row, prev_key) {
    var entity_id = row.id,
        key = row.getKey(),
        new_row;

    row.checkKey(key);          // throws errort if incomplete
    if (this.curr_rows[entity_id] && this.curr_rows[entity_id][key]) {
        this.throwError("id already present in cache: " + entity_id + ":" + key);
    }
    new_row = this.new_rows.indexOf(row);
    if (new_row > -1) {
        this.new_rows.splice(new_row, 1);      // Remove row from new_rows
        this.debug("Removing row from new_rows cache: " + entity_id + ":" + key);
    }
    if (prev_key && this.curr_rows[entity_id] && this.curr_rows[entity_id][prev_key] === row) {
        this.debug("Removing row from curr_rows cache: " + entity_id + ":" + prev_key);
        delete this.curr_rows[entity_id][prev_key];
    }

    this.debug("Adding row to curr_rows cache: " + entity_id + ":" + key);
    if (!this.curr_rows[entity_id]) {
        this.curr_rows[entity_id] = {};
    }
    this.curr_rows[entity_id][key] = row;

    this.debug("Checking for parent_record updates: " + entity_id + ":" + key);
    // do full-key rows first; a partial-key row may be turned into a full-key row by this call
    this.doFullKeyRows(function (child_row) {
        if (child_row.parent_record === row && child_row.trans_link_field) {
            child_row.getField(child_row.trans_link_field).set(key);
        }
    });
    this.doPartialKeyRows(function (child_row) {
        if (child_row.parent_record === row && child_row.trans_link_field) {
            child_row.getField(child_row.trans_link_field).set(key);
        }
    });
});


x.data.DataSet.define("isInCache", function (entity_id, key) {
    return this.curr_rows[entity_id] && this.curr_rows[entity_id][key];
});


x.data.DataSet.define("setModified", function () {
    this.modified = true;
});


x.data.DataSet.define("isModified", function () {
    return this.modified;
});


x.data.DataSet.define("isValid", function () {
    var valid = true;
    this.doFullKeyRows(function(row) {
        if (!row.deleting && row.isModified()) {
            valid = valid && row.isValid();
        }
    });
    this.doPartialKeyRows(function(row) {
        if (!row.deleting) {
            valid = valid && row.isValid();
        }
    });
    valid = valid && !this.messages.error_recorded_since_clear;
    return valid;
//    return this.messages.isValid();
});


x.data.DataSet.define("isActive", function () {
    return this.active && this.session.active;
});


x.data.DataSet.define("getStatus", function () {
    return (this.saved ? 'S' : (!this.active ? 'I' : (this.isValid() ? 'V' : 'N')));
});


x.data.DataSet.define("getRowCount", function (modified_only) {
    if (modified_only) {
        return this.getFullKeyRowCount(modified_only) + this.getPartialKeyRowCount(modified_only);
    }
    return this.row_number;
});


x.data.DataSet.define("getFullKeyRowCount", function (modified_only) {
    var count = 0;
    this.doFullKeyRows(function(row) {
        if (!modified_only || row.isModified()) {
            count += 1;
        }
    });
    return count;
});


x.data.DataSet.define("getPartialKeyRowCount", function (modified_only) {
    var count = 0;
    if (modified_only) {
        this.doPartialKeyRows(function(row) {
            if (row.isModified()) {
                count += 1;
            }
        });
        return count;
    }
    return this.new_rows.length;
});


x.data.DataSet.define("getPartialKeyRowsDescription", function () {
    var text = "",
        delim = "";

    this.doPartialKeyRows(function(row) {
        text += delim + row.id;
        delim = ", ";
    });
    return text;
});


x.data.DataSet.define("presave", function (outcome_id) {
    var partial_key_rows = 0;
    if (this.stage < 10 || this.stage > 20) {
        this.throwError("transaction not active: " + this.stage);
    }
    if (this.presave_called) {
        this.throwError("presave already called");
    }
    this.stage = 30;
    this.presave_outcome_id = outcome_id;
    this.doPartialKeyRows(function (row) {
        if (!row.deleting) {
            partial_key_rows += 1;
        }
    });
    if (partial_key_rows > 0) {
        this.messages.add({ type: "E", text: partial_key_rows +
            " partial-key rows still exist: " + this.getPartialKeyRowsDescription() });
    }
    this.doFullKeyRows(function (row) {
        if (row.isModified() && !row.presave_called) {
            row.presave(outcome_id);
        }
    });
});


x.data.DataSet.define("save", function (outcome_id) {
    if (this.stage < 10 || this.stage > 30) {
        this.throwError("transaction not active: " + this.stage);
    }
    if (!this.isValid()) {
        this.throwError("transaction invalid");
    }
    // this is the last point the transaction ia still salavgeable
    if (this.stage < 30) {              // page calls trans.presave() separately before trans.save()
        this.presave(outcome_id);       // if transation used outside of page, ensure presave () is called
    }
    this.stage = 40;
    if (!this.isValid()) {
        this.throwError("transaction invalid");
    }
    this.doFullKeyRows(function (row) {
        if (row.isModified()) {
            row.save();
        }
    });
    this.stage = 50;
});


x.data.DataSet.define("cancel", function () {
    this.stage = 45;
});

