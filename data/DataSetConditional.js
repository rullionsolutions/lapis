/*global x, _ */
"use strict";


x.data.DataSetConditional = x.data.DataSet.clone({
    id              : "DataSetConditional"
});


x.data.DataManager.defbind("setupConditionalDataSet", "cloneInstance", function () {
    this.conditional_datasets = [];
});


x.data.DataSetConditional.defbind("setupDataManager", "cloneInstance", function () {
    this.criteria = [];
    if (!this.data_manager) {
        this.throwError("not associated with a DataManager");
    }
    this.data_manager.conditional_datasets.push(this);
});


x.data.Entity.defbind("checkForDataSetChange", "afterFieldChange", function () {
    this.data_manager.checkConditionalDataSetRecord(this);
});


x.data.DataManager.define("checkConditionalDataSet", function () {
    var that = this;
    function checkRecord(record) {
        that.checkConditionalDataSetRecord(record);
    }
    this.doFullKeyRecords(checkRecord);
    this.doPartialKeyRecords(checkRecord);
});


x.data.DataManager.define("checkConditionalDataSetRecord", function (record) {
    _.each(this.conditional_datasets, function (dataset) {
        dataset.checkRecord(record);
    });
});


x.data.DataSetConditional.define("addCriterion", function (spec) {
    if (!spec.entity_id && (!spec.field_id || !spec.value)) {
        this.throwError("invalid criterion: " + spec);
    }
    this.criteria.push(spec);
});


x.data.DataSetConditional.define("checkRecord", function (record) {
    var that = this,
        incl = true,
        currently_contained = this.containsRecord(record);

    this.criteria.each(function (criterion) {           // criteria currently ANDed together
        incl = incl && that.doesRecordMatchCriterion(record, criterion);
    });

    if (incl && !currently_contained) {
        this.addRecord(record);
    } else if (!incl && currently_contained) {
        this.removeRecord(record);
    }
    this.debug("checking whether record " + record + " is joining or leaving DataSet " + this + "; was contained? " + currently_contained + ", will be? " + incl);
});


x.data.DataSetConditional.define("doesRecordMatchCriterion", function (record, criterion) {
    var incl = false,
        value;

    if (typeof criterion.entity_id === "string") {
        incl = (criterion.entity_id === record.parent.id);

    } else if (Array.isArray(criterion.entity_id)) {
        incl = (criterion.entity_id.indexOf(record.parent.id) > -1);

    } else if (criterion.field_id && criterion.value) {
        value = record.getField(criterion.field_id).get();          // throws exception if field_id doesn't exist in record
        if (!criterion.operator || criterion.operator === "=" || criterion.operator === "EQ") {
            incl = (value === criterion.value);
        } else {
            this.throwError("unsupported operator: " + criterion.operator);
        }
    }
    return incl;
});
