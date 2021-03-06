/*global x, _, indexedDB, Promise */
"use strict";


x.store.StoreIndexedDB = x.store.Store.clone({
    id              : "Store",
    db              : null,                   // IndexedDB database object - set in start()
    db_id           : null,                   // string database name
    store_id        : null,                   // string store name
    version         : null,                   // integer version sequence
    create_properties: { keyPath: "_id" },    // object including key path, etc
    indexes         : []                      // array declaring indexes
});


x.store.StoreIndexedDB.defbind("cloneIndexesArray", "clone", function () {
    this.indexes = _.clone(this.indexes);
});


x.store.StoreIndexedDB.override("deleteDatabase", function () {
    try {
        this.db.deleteObjectStore(this.store_id);
        this.debug("deleted store");
        // this.happen("deleteStore", this.store_id);
    } catch (e) {
        this.warn("error trying to delete object store: " + e.toString());
    }
});


x.store.StoreIndexedDB.override("createDatabase", function () {
    var store,
        i;

    try {
        store = this.db.createObjectStore(this.store_id, this.create_properties);
        this.debug("created store");
        for (i = 0; this.indexes && i < this.indexes.length; i += 1) {
            store.createIndex(this.indexes[i].id, this.indexes[i].key_path, this.indexes[i].additional);
            this.debug("created index: " + this.indexes[i].id + " with key_path: " + this.indexes[i].key_path);
        }
        // this.happen("createStore", this.store_id);
    } catch (e) {
        this.warn("error trying to create object store: " + e.toString());
    }
});


x.store.StoreIndexedDB.defbind("upgradeOrNot", "start", function () {
    var that = this;
    return new Promise(function (resolve, reject) {
        var request = indexedDB.open(that.db_id, that.version);

        request.onupgradeneeded = function (/*event*/) {
          // The database did not previously exist, so create object stores and indexes.
            that.info("Upgrading...");
            that.db = request.result;
            that.deleteDatabase();
            that.createDatabase();
        };

        request.onsuccess = function () {
            that.db = request.result;
            resolve();
        };

        request.onerror = function (error) {
            that.error("Store.start() error: " + error);
            reject(error);
        };
    });
});


x.store.StoreIndexedDB.override("save", function (doc_obj) {
    var that = this;
    if (!this.db || typeof this.db !== "object") {
        this.throwError("'db' property of store not set");
    }

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(that.store_id, "readwrite"),
            store = tx.objectStore(that.store_id);

        store.put(doc_obj);
        tx.oncomplete = function () {
            that.debug("doc saved: " + doc_obj[that.create_properties.keyPath]);
            resolve(doc_obj);
        };
        tx.onerror = function () {
            that.error("Store.save() error: " + tx.error);
            reject(tx.error);
        };
    });
});


x.store.StoreIndexedDB.override("get", function (id) {
    var that = this;
    if (!this.db || typeof this.db !== "object") {
        this.throwError("'db' property of store not set");
    }

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(that.store_id, "readonly"),
            store = tx.objectStore(that.store_id),
            request = store.get(id);

        request.onsuccess = function () {
            var doc_obj = request.result;
            if (doc_obj === undefined) {
                that.debug("doc not found: " + id);
                reject("doc not found: " + id);
            } else {
                that.debug("doc loaded: " + id);
                resolve(doc_obj);
            }
        };
        request.onerror = function () {
            that.debug(tx.error);
            reject(tx.error);
        };
    });
});


x.store.StoreIndexedDB.override("delete", function (id) {
    var that = this;
    if (!this.db || typeof this.db !== "object") {
        this.throwError("'db' property of store not set");
    }

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(that.store_id, "readwrite"),
            store = tx.objectStore(that.store_id),
            request = store.delete(id);

        request.onsuccess = function () {
            that.trace("succeeded");
            resolve(id);
        };
        request.onerror = function () {
            that.debug(tx.error);
            reject(tx.error);
        };
    });
});


x.store.StoreIndexedDB.override("getAll", function () {
    var that = this,
        results = [];

    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(that.store_id, "readonly"),
            store = tx.objectStore(that.store_id),
            request = store.openCursor();

        request.onsuccess = function () {
            var cursor = request.result;
            if (cursor) {
                // Called for each matching record.
                results.push(cursor.value);
                cursor.continue();
            } else {
                that.trace("results: " + results.length);
                resolve(results);
            }
        };
        request.onerror = function () {
            that.debug(tx.error);
            reject(tx.error);
        };
    });
});


x.store.StoreIndexedDB.override("deleteAll", function () {
    var that = this;
    return new Promise(function (resolve, reject) {
        var tx = that.db.transaction(that.store_id, "readwrite"),
            store = tx.objectStore(that.store_id),
            request = store.clear();

        request.onsuccess = function () {
            resolve();
        };
        request.onerror = function () {
            that.debug(tx.error);
            reject(tx.error);
        };
    });
});

