/*global x, _ */
"use strict";


x.data.Document = x.base.Base.clone({
    id              : "Document",
    store           : null,             // data store to get Document from and save back to
    entity          : null,             // entity representing the top level of the Document
    record          : null,             // record storing the actual values of the entity
    status          : null              // 'N'ew, 'C'reating, 'L'oading, 'U'nmodified, 'M'odified, 'S'aving, 'E'rror
                                        // N > C > M > S > U,   N > L > U > M > S > U,   S > E,   L > E
});


x.data.Document.register("beforeLoad");
x.data.Document.register( "afterLoad");
x.data.Document.register("beforeSave");
x.data.Document.register( "afterSave");
x.data.Document.register("ready");


x.data.Document.defbind("setupDocInstance", "cloneInstance", function () {
    this.status = 'N';
});


x.data.Document.define("load", function (key) {
    var that = this;
    if (this.status !== 'N') {
        this.throwError("invalid status: " + this.status);
    }
    this.status = 'L';      // loading
    this.happen("beforeLoad", key);
    return this.store.get(key)
        .then(function (doc_obj) {
            that.happen("afterLoad", doc_obj);
        })
        .then(function () {
            that.happen("ready");
        });
});


x.data.Document.defbind("populate", "afterLoad", function (doc_obj) {
    if (this.status !== 'L') {
        this.throwError("invalid status: " + this.status);
    }
    this.record = this.entity.getRecord();
    this.record.document = this;
    this.record.populateFromDocument(doc_obj);
    this.record.happen("initUpdate");
    this.status = 'U';      // unmodified
});


x.data.Document.define("create", function () {
    if (this.status !== 'N') {
        this.throwError("invalid status: " + this.status);
    }
    this.status = 'C';      // creating / unmodified
    this.record = this.entity.getRecord({ modifiable: true, document: this });
    this.record.setDefaultVals();
    // this.record.generateKey();                  // which may move it into the curr_rows cache
    this.record.happen("initCreate");
    this.happen("ready");
    return this.record;
});


x.data.Document.define("getRecord", function () {
    if (this.status === 'L') {
        this.throwError("record not available - loading");
    }
    if (this.status === 'S') {
        this.throwError("record not available - saving");
    }
    if (!this.record) {
        this.throwError("record not available - unknown reason");
    }
    return this.record;
});


x.data.Document.define("touch", function () {
    if (this.status === 'M') {
        return;
    }
    if (this.status !== 'C' && this.status !== 'U') {
        this.throwError("invalid status: " + this.status);
    }
    this.status = 'M';
});


x.data.Document.define("save", function () {
    var that = this;
    if (this.status !== 'M') {
        this.throwError("invalid status: " + this.status);
    }
    // this.uuid = this.record.getKey();
    // if (!this.uuid || typeof this.uuid !== "string") {
    //     this.throwError("invalid uuid: " + this.uuid);
    // }
    this.status = 'S';
    this.happen("beforeSave");
    return this.store.save(this.record.populateToDocument())
        .then(function () {
            that.happen("afterSave");
        })
        .then(function () {
            that.happen("ready");
        });
});


x.data.Document.defbind("saveSuccessful", "afterSave", function () {
    if (this.status !== 'S') {
        this.throwError("invalid status: " + this.status);
    }
    this.status = 'U';
});

