/*global x, _ */
"use strict";

/**
* To manage a set of records, ensuring ACID compliance
*/
x.data.DataManagerDocs = x.data.DataManager.clone({
    id              : "DataManagerDocs",
    store           : null,             // data store to get Document from and save back to
    uuid_prop       : "_id"
});


x.data.DataManagerDocs.override("getLoadingPromise", function (record) {
    if (record.parent_record) {
        return record.parent_record.getReadyPromise();
    }
    return this.store.get(record.id + ":" + record.load_key)
        .then(function (doc_obj) {
            record.populateFromObject(doc_obj);
            record.status = 'U';
            record.happen("initUpdate");
        })
        .then(null, function (error) {
            record.error("record not found for key: " + record.load_key);
            record.report(error);
            record.status = 'E';
        });
});


x.data.DataManagerDocs.override("getSavingPromise", function (record) {
    var that = this,
        doc_obj;

    if (record.parent_record) {
        return record.parent_record.getReadyPromise();
    }
    doc_obj = record.populateToObject();
    doc_obj[this.uuid_prop] = record.getUUID();
    // doc_obj.title           = record.getLabel();
    return this.store.save(doc_obj)
        .then(function (/*doc_obj*/) {
            that.afterSave(record);
        })
        .then(null, function (error) {
            record.error("record not saved: " + record.getUUID());
            record.report(error);
            record.status = 'E';
        });
});

