/*global x, indexedDB, Promise */
"use strict";


x.store = x.store || {};

x.store.Store = x.base.Base.clone({
    id: "Store",
    db_id: null                     // string database name
});


x.store.Store.register("start");
// x.store.Store.register("deleteStore");
// x.store.Store.register("createStore");
// x.store.Store.register("saveDoc");
// x.store.Store.register("getDoc");
// x.store.Store.register("deleteDoc");


x.store.Store.define("start", function () {
    return this.happenAsync("start", this.getNullPromise());
});


x.store.Store.define("createDatabase", function () {
    this.throwError("not implemented");
});


x.store.Store.define("deleteDatabase", function () {
    this.throwError("not implemented");
});


x.store.Store.define("save", function (/*doc_obj*/) {
    this.throwError("not implemented");
});


x.store.Store.define("get", function (/*key*/) {
    this.throwError("not implemented");
});


x.store.Store.define("delete", function (/*key*/) {
    this.throwError("not implemented");
});


x.store.Store.define("copy", function (/*key*/) {
    this.throwError("not implemented");
});


x.store.Store.define("getAll", function () {
    this.throwError("not implemented");
});


x.store.Store.define("deleteAll", function () {
    this.throwError("not implemented");
});

