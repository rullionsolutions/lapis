/*global x, _ */
"use strict";


x.data.DataSet = x.base.Base.clone({
    id : "DataSet"
});



x.data.DataSet.register("recordAdded");
x.data.DataSet.register("recordRemoved");



x.data.DataSet.defbind("setupArray", "cloneInstance", function () {
    this.records = [];
});


x.data.DataSet.define("containsRecord", function (record) {
    return (this.records.indexOf(record) > -1);
});


x.data.DataSet.define("eachRecord", function (funct) {
    _.each(this.records, funct);
});


x.data.DataSet.define("addRecord", function (record) {
    if (this.containsRecord(record)) {
        this.throwError("record already exists in this DataSet: " + record);
    }
    this.records.push(record);
    this.happen("recordAdded", { record: record });
});


x.data.DataSet.define("removeRecord", function (record) {
    if (!this.containsRecord(record)) {
        this.throwError("record doesn't exists in this DataSet: " + record);
    }
    this.records.splice(this.records.indexOf(record), 1);
    this.happen("recordRemoved", { record: record });
});
