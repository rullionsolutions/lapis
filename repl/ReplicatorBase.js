/*global x, _, Promise */
"use strict";

x.repl = x.repl || {};

/*
 * General Design:
 * 1. Get a structure representing changes on the server - getServerAllDocSummary() returning server_props_all
 * 2. replicateLocalDocs() loops over all local documents,
 * 3. calling replicateSingleDoc() on each, which:
 * 4. decides whether a local change needs to be pushed to the server, vice versa, or no action required
 *
 * doc_obj.local_change = true              I have a local change to PUT, server believed to be in sync
 * doc_obj.conflict = true                  I have a local change to PUT, server found to be out of sync
 * doc_obj.conflict_payload = {...}         I have got latest from server to resolve conflict
 */

x.repl.ReplicatorBase = x.base.Base.clone({
    id                  : "Replicator",
     local_store        : null,             // local Store object
    remote_store        : null,             // remote Store object
    replication_interval: 1000 * 60,
    replication_continue: true
});


x.repl.ReplicatorBase.register("start");
x.repl.ReplicatorBase.register("replicate");


//------------------------------------------------------------------------------ API: General Replication

x.repl.ReplicatorBase.define("start", function () {
    var that = this;
    if (!this. local_store) {
        this.throwError("no local_store defined");
    }
    if (!this.remote_store) {
        this.throwError("no remote_store defined");
    }
    return this.happenAsync("start", this.getNullPromise())
        .then(function () {
            that.info("replicate() calling loop");
            that.replicationLoop();         // NOT a promise!
        });
});


x.repl.ReplicatorBase.define("replicate", function () {
    var that = this;
    this.replication_data = {
        started_at    : (new Date()).toISOString(),
        start_point   : null,
          end_point   : null,
        local_deletes : 0,
        local_updates : 0,
        remote_updates: 0,
        remote_creates: 0,
        conflicts     : 0
    };
    this.info("beginning replicate() at " + this.replication_data.started_at);
    this.setStatus("replicating", "getting changes from server");

    return this.getLastReplicationPoint()
        .then(function () {
            return that.getServerDocChanges();
        })
        .then(function (server_changed_docs) {
            that.debug("start() typeof server_changed_docs: " + typeof server_changed_docs);
            that.setStatus("replicating", "cycling through local docs");
            return that.replicateDocs(server_changed_docs);
        })
        .then(function () {
            that.replication_data.ended_at = (new Date()).toISOString();
            return that.setThisReplicationPoint();
        })
        .then(function () {
            that.setStatus("paused");
        })
        .then(null, /* catch */ function (reason) {
            that.error("replicate() failed because: " + reason);
            that.setStatus("terminating");
            that.replication_continue = false;
        });
});


//------------------------------------------------------------------------------ API: Docs


x.repl.ReplicatorBase.define("saveDoc", function (uuid, payload, conflict_resolved) {
    var that = this;
    return this.local_store.get(uuid)
        .then(null, function () {           // assume doc not found
            return { uuid: uuid };
        })
        .then(function (doc_obj) {
            if (doc_obj.conflict && !conflict_resolved) {
                that.throwError("document cannot be saved until conflict is resolved");
            }
            if (_.isEqual(doc_obj.payload, payload)) {          // no change to save
                return that.getNullPromise(false);
            }
            doc_obj.local_change = true;        // test to see if payload has changed
            doc_obj.payload = payload;
            delete doc_obj.conflict;
            return that.local_store.save(doc_obj);
        });
});


x.repl.ReplicatorBase.define("getDoc", function (uuid) {
    return this.local_store.get(uuid)
        .then(function (doc_obj) {
            return doc_obj.payload;
        });
});


x.repl.ReplicatorBase.define("getServerDocChanges", function () {         // to be overridden
    return undefined;
});


x.repl.ReplicatorBase.define("replicationLoop", function () {
    var that = this;
    this.info("beginning replicationLoop()");
    setTimeout(function () {
        if (!that.replication_continue) {
            that.info("Replicator terminating");
            return;
        }
        that.replicate();
    }, this.replication_interval);
});


x.repl.ReplicatorBase.define("replicateDocs", function (server_changed_docs) {
    var that = this;
    this.debug("beginning replicateDocs()");
    return this.local_store.getAll()
        .then(function (results) {
            return that.loopOverLocalDocs(results, server_changed_docs);
        })
        .then(function () {
            that.info("Docs on the server not already local: " + Object.keys(server_changed_docs));
            return that.loopOverRemoteDocs(server_changed_docs);
        });
});


x.repl.ReplicatorBase.define("loopOverLocalDocs", function (results, server_changed_docs) {
    var that = this,
        result = results.pop();

    if (!result) {
        return;
    }
    this.debug("loopOverLocalDocs() " + result.uuid);
    return this.replicateLocalSingleDoc(result, server_changed_docs[result.uuid])
        .then(function () {
            delete server_changed_docs[result.uuid];
            return that.loopOverLocalDocs(results, server_changed_docs);
        });
});


x.repl.ReplicatorBase.define("replicateLocalSingleDoc", function (doc_obj, server_changed_doc_rev) {
    var that = this,
        promise;

    this.info("beginning replicateLocalSingleDoc() on: " + doc_obj.uuid +
        ", local_change: " + doc_obj.local_change +
        ", server_changed_doc_rev: " + server_changed_doc_rev +
        ", doc_obj._rev: " + doc_obj._rev);

    if (doc_obj.uuid === "root") {
        this.trace("ignore root doc in replication");

    } else if (doc_obj.local_delete) {
        this.debug("replicateLocalSingleDoc() marked for deletion, delete from server");
        promise = this.deleteFromServer(doc_obj);
        this.replication_data.local_deletes += 1;

    } else if (doc_obj.conflict || !doc_obj.payload || (server_changed_doc_rev && server_changed_doc_rev !== doc_obj._rev)) {
        this.debug("replicateLocalSingleDoc() rev diff, pull from server");
        delete doc_obj.latest_server_rev;
//        doc_obj.latest_server_rev = latest_server_rev;
        if (doc_obj.local_change) {
            this.error("replicateLocalSingleDoc() conflict found");
            doc_obj.conflict_payload = doc_obj.payload;
            this.replication_data.conflicts += 1;
        } else {
            this.replication_data.remote_updates += 1;
        }
        promise = this.local_store.save(doc_obj)
            .then(function () {
                return that.pullFromServer(doc_obj);
            });

    } else if (doc_obj.local_change) {
        this.debug("replicateLocalSingleDoc() local_change, push to server");
        this.replication_data.local_updates += 1;
        promise = this.pushToServer(doc_obj);
    }
    if (!promise) {
        promise = this.getNullPromise();
    }
    return promise;
});


x.repl.ReplicatorBase.define("loopOverRemoteDocs", function (server_changed_docs) {
    var that = this,
        uuid = Object.keys(server_changed_docs)[0];

    if (uuid) {
        this.replication_data.remote_creates += 1;
        delete server_changed_docs[uuid];
        return this.pullFromServer({ uuid: uuid })
            .then(function () {
                return that.loopOverRemoteDocs(server_changed_docs);
            });
    }
    return this.getNullPromise();
});


x.repl.ReplicatorBase.define("deleteFromServer", function (doc_obj) {
    var that = this;
    this.info("beginning deleteFromServer(): " + doc_obj.uuid);
    return this.remote_store.delete(doc_obj.uuid)
        .then(function (/*data*/) {
            that.debug("deleteFromServer() okay");
            return that.local_store.delete(doc_obj.uuid);
        });
});


x.repl.ReplicatorBase.define("pushToServer", function (doc_obj) {
    var that = this,
        remote_doc;

    this.info("beginning pushToServer(): " + doc_obj.uuid);
    remote_doc = _.extend(_.pick(doc_obj, "uuid", "_rev"), doc_obj.payload);
    this.debug("sending object: " + JSON.stringify(remote_doc));
    return this.remote_store.save(remote_doc)
        .then(null, /* catch */ function (reason) {
            if (reason === "409") {            // conflict
                return that.markAsConflict(doc_obj);
            }
            that.throwError(reason);
        })
        .then(function (data) {
//{"ok":true,"id":"cf454fa3-daad-41c1-bed3-2df58a70eec5","rev":"3-6fe8a81ac68a0f5f87644f1ed2898554"}
            if (!data.ok) {
                that.throwError(JSON.stringify(data));
            }
            that.debug("pushToServer() okay: new rev: " + data.rev);
            doc_obj._rev = data.rev;
            delete doc_obj.local_change;
            return that.local_store.save(doc_obj);
        });
});


x.repl.ReplicatorBase.define("pullFromServer", function (doc_obj) {
    var that = this;
    this.info("beginning pullFromServer(): " + doc_obj.uuid);
    if (!doc_obj.uuid) {
        this.throwError("doc_obj has no uuid property");
    }
    return this.remote_store.get(doc_obj.uuid)
        .then(function (data) {
            doc_obj._rev = data._rev;
            doc_obj.payload = _.omit(data, [ "uuid", "_id", "_rev" ]);
            return that.local_store.save(doc_obj);
        });
});


x.repl.ReplicatorBase.define("markAsConflict", function (doc_obj) {
    this.info("beginning markAsConflict()");
    doc_obj.conflict = true;
    delete doc_obj.local_change;
    return this.local_store.save(doc_obj);
});


// This function should be used to reset the replication state of the local data, but NOT to clean up the doc payloads
x.repl.ReplicatorBase.define("replicationReset", function () {
    var that = this;
    this.info("beginning replicationReset()");
    this.last_replication_point = null;
    return this.local_store.getAllDocs()
        .then(function (results) {
            var i,
                doc;
            for (i = 0; i < results.length; i += 1) {
                doc = results[i];
                delete doc.repl_status;
                delete doc.local_change;
                delete doc.conflict;
                delete doc._rev;
                delete doc.conflict_payload;
                that.local_store.save(doc);
            }
        })
        .then(null, /* catch */ function (reason) {
            that.error("replicationReset() failed: " + reason);
        });
});



x.repl.ReplicatorBase.define("setStatus", function (status_str, message) {
    this.info(this.id + " === " + status_str + " === " + (message || ""));
});


x.repl.ReplicatorBase.define("getReplicationStatus", function (doc_obj) {
    var   out = "",
        delim = "";

    function addPiece(str) {
        out += delim + str;
        delim = ", ";
    }
    if (doc_obj.local_delete) {
        addPiece("local delete");
    }
    if (doc_obj.local_change) {
        addPiece("local change");
    }
    if (doc_obj.conflict) {
        addPiece("** conflict **");
    }
    if (!out) {
        out = "up-to-date";
    }
    return out;
});


x.repl.ReplicatorBase.define("getLastReplicationPoint", function () {
    var that = this;
    this.debug("beginning getLastReplicationPoint()");
    if (this.root_doc) {
        this.replication_data.start_point = this.root_doc.last_replication_point;
        return this.getNullPromise();
    }
    return this.local_store.get("root")
        .then(function (doc_obj) {
            that.root_doc = doc_obj;
            that.replication_data.start_point = that.root_doc.last_replication_point;
        })
        .then(null, /* catch */ function (reason) {
            that.warn("getLastReplicationPoint(): no root doc found: " + reason);
        });
});


x.repl.ReplicatorBase.define("setThisReplicationPoint", function () {
    this.info("beginning setThisReplicationPoint()");
    this.root_doc = this.root_doc || { uuid: "root" };
    this.root_doc.last_replication_point = this.replication_data.end_point;
    this.root_doc.history = this.root_doc.history || [];
    this.root_doc.history.push(this.replication_data);
    return this.local_store.save(this.root_doc);
});


x.repl.ReplicatorBase.define("resetReplicationPoint", function () {
    var that = this;
    this.info("beginning resetReplicationPoint()");
    if (!this.root_doc) {
        this.throwError("no root doc");
    }
    this.root_doc.last_replication_point = null;
    delete this.root_doc.repl_status;
    return this.local_store.save(this.root_doc)
        .then(null, /* catch */ function (reason) {
            that.error("setThisReplicationPoint() failed: " + reason);
        });
});


//------------------------------------------------------------------------------ repl_status approach
//------------------------------------------------------------------------------ Replication Status
/*
//action being one of "Local Change", "Synced", "Server Change"
x.repl.ReplicatorBase.define("updateReplStatus", function (doc_obj, action) {
    if (action === "Local Change") {
        if (!doc_obj.repl_status) {
            doc_obj.repl_status = "Local Only";
        } else if (doc_obj.repl_status === "Up-to-date") {
            doc_obj.repl_status = "Local Change";
        } else if (doc_obj.repl_status !== "Local Change") {     // leave Local Change it as-is
            doc_obj.repl_status = "Conflict";
        }
    } else if (action === "Synced") {
        doc_obj.repl_status = "Up-to-date";
    } else if (action === "Server Change") {
        if (doc_obj.repl_status === "Up-to-date") {
            doc_obj.repl_status = "Server Change";
        } else if (doc_obj.repl_status !== "Server Only" && doc_obj.repl_status !== "Server Change") {
            // leave Server Only and Server Change as-is
            doc_obj.repl_status = "Conflict";
        }
    } else if (action === "Local Delete") {
        doc_obj.repl_status = "Local Delete";
    } else if (action === "Forget Local") {
        if (doc_obj.repl_status === "Conflict") {
            doc_obj.repl_status = "Server Change";
        }
    } else {
        this.throwError("invalid action: " + action);
    }
});

x.repl.ReplicatorBase.define("mustDeleteLocal", function (doc_obj) {
    return (doc_obj.repl_status === "Server Delete");
});

x.repl.ReplicatorBase.define("mustDeleteServer", function (doc_obj) {
    return (doc_obj.repl_status === "Local Delete");
});

x.repl.ReplicatorBase.define("mustPushUpdateToServer", function (doc_obj) {
    return (!doc_obj.repl_status || doc_obj.repl_status === "Local Only" || doc_obj.repl_status === "Local Change");
});

x.repl.ReplicatorBase.define("mustPullUpdateFromServer", function (doc_obj) {
    return (doc_obj.repl_status === "Server Only" || doc_obj.repl_status === "Server Change");
});

x.repl.ReplicatorBase.define("forgetLocalChanges", function (doc_obj) {
    // var that = this;
//  alert("forgetLocalChanges: " + doc_obj.uuid);
    if (doc_obj.repl_status !== "Conflict") {
        return false;
    }
    this.updateReplStatus(doc_obj, "Forget Local");
    return this.store.save(doc_obj);
});

*/



/*
x.repl.ReplicatorBase.define("replicateDoc = function (doc_obj, server_props_all) {
    var server_props = server_props_all[doc_obj.uuid];
    this.log("beginning replicateDoc() on: " + doc_obj.uuid + ", repl_status: " + doc_obj.repl_status + ", server_props: " + server_props, 2);
    if (server_props !== doc_obj.payload.rev) {
        this.log("replicateDoc() rev diff, setting repl_status to Server Change", 3);
        this.updateReplStatus(doc_obj, "Server Change");
        x.store.storeDoc("dox", doc_obj);
    }
    delete server_props_all[doc_obj.uuid];

    if (this.mustDeleteLocal(doc_obj)) {
        this.log("replicateDoc() must delete local", 3);
        this.deleteLocal(doc_obj);

    } else if (this.mustDeleteServer(doc_obj)) {
        this.log("replicateDoc() must delete server", 3);
        this.deleteServer(doc_obj.uuid);

    } else if (this.mustPushUpdateToServer(doc_obj)) {
        this.log("replicateDoc() push to server - Local Only OR Local Change", 3);
        this.pushToServer(doc_obj);

    } else if (this.mustPullUpdateFromServer(doc_obj)) {
        this.log("replicateDoc() pull from server - Server Only OR Server Change", 3);
        this.pullFromServer(doc_obj);

    } else {
        this.log("replicateDoc() no action", 3);
    }
};
*/

