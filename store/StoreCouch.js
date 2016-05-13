/*global x, $, Promise */
"use strict";


x.store.StoreCouch = x.store.Store.clone({
    id: "StoreCouch",
    server_url      : null,
    ajax_timeout    : 60000
});


x.store.StoreCouch.override("createDatabase", function () {
    var that = this,
        url  = that.server_url + "/" + that.db_id;
    return new Promise(function (resolve, reject) {
        $.ajax({ url: url, type: "PUT"   , timeout: that.ajax_timeout, cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Content-type", "application/json");
                xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
                that.debug("HTTP response: [" + jq_xhr.status + "] " + jq_xhr.statusText + ", " + text_status + " to " + url);
                resolve(data);
            },
            error: function (jq_xhr, text_status, error_thrown) {
                that.ajaxError(jq_xhr, text_status, error_thrown, url);
                reject(text_status);
            }
        });
    });
});


x.store.StoreCouch.override("deleteDatabase", function () {
    var that = this,
        url  = that.server_url + "/" + that.db_id;
    return new Promise(function (resolve, reject) {
        $.ajax({ url: url, type: "DELETE", timeout: that.ajax_timeout, cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Content-type", "application/json");
                xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
                that.debug("HTTP response: [" + jq_xhr.status + "] " + jq_xhr.statusText + ", " + text_status + " to " + url);
                resolve(data);
            },
            error: function (jq_xhr, text_status, error_thrown) {
                that.ajaxError(jq_xhr, text_status, error_thrown, url);
                reject(text_status);
            }
        });
    });
});


x.store.StoreCouch.override("save", function (doc_obj) {
    var that = this,
        url  = that.server_url + "/" + that.db_id + "/" + doc_obj.uuid;

    if (typeof doc_obj.uuid !== "string") {
        this.throwError("invalid uuid property: " + doc_obj.uuid);
    }
    return new Promise(function (resolve, reject) {
        $.ajax({ url: url, type: "PUT"   , timeout: that.ajax_timeout, cache: false, data: JSON.stringify(doc_obj),
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Content-type", "application/json");
                xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
                that.debug("HTTP response: [" + jq_xhr.status + "] " + jq_xhr.statusText + ", " + text_status + " to " + url);
                resolve(data);
            },
            error: function (jq_xhr, text_status, error_thrown) {
                that.ajaxError(jq_xhr, text_status, error_thrown, url);
                reject(text_status);
            }
        });
    });
});


x.store.StoreCouch.override("get", function (id) {
    var that = this,
        url  = that.server_url + "/" + that.db_id + "/" + id;
    return new Promise(function (resolve, reject) {
        $.ajax({ url: url, type: "GET"   , timeout: that.ajax_timeout, cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Content-type", "application/json");
                xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
                that.debug("HTTP response: [" + jq_xhr.status + "] " + jq_xhr.statusText + ", " + text_status + " to " + url);
                resolve(data);
                // if (data.ok) {          // Couch response
                //     resolve(data);
                // } else {
                //     reject("unknown");
                // }
            },
            error: function (jq_xhr, text_status, error_thrown) {
                that.ajaxError(jq_xhr, text_status, error_thrown, url);
                reject(text_status);
            }
        });
    });
});


x.store.StoreCouch.override("delete", function (id) {
    var that = this,
        url  = that.server_url + "/" + that.db_id + "/" + id;
    return new Promise(function (resolve, reject) {
        $.ajax({ url: url, type: "DELETE", timeout: that.ajax_timeout, cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Content-type", "application/json");
                xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
                that.debug("HTTP response: [" + jq_xhr.status + "] " + jq_xhr.statusText + ", " + text_status + " to " + url);
                resolve(data);
            },
            error: function (jq_xhr, text_status, error_thrown) {
                that.ajaxError(jq_xhr, text_status, error_thrown, url);
                reject(text_status);
            }
        });
    });
});


x.store.StoreCouch.override("copy", function (id) {
    var that = this,
        url  = that.server_url + "/" + that.db_id + "/" + id;
    return new Promise(function (resolve, reject) {
        $.ajax({ url: url, type: "COPY"  , timeout: that.ajax_timeout, cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Content-type", "application/json");
                xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
                that.debug("HTTP response: [" + jq_xhr.status + "] " + jq_xhr.statusText + ", " + text_status + " to " + url);
                resolve(data);
            },
            error: function (jq_xhr, text_status, error_thrown) {
                that.ajaxError(jq_xhr, text_status, error_thrown, url);
                reject(text_status);
            }
        });
    });
});


x.store.StoreCouch.define("ajaxError", function (jq_xhr, text_status, error_thrown, url) {
    this.error("HTTP response: [" + jq_xhr.status + "] " + jq_xhr.statusText + ", " + jq_xhr.responseText + ", " + text_status + ", " + error_thrown + " to " + url);
});


x.store.StoreCouch.define("getChanges", function (since) {
    var that = this,
        url = that.server_url + "/" + this.db_id + "/_changes";

    if (since) {
        url += "?since=" + since;
    }
    this.debug(url);
    return new Promise(function (resolve, reject) {
        $.ajax({ url: url, type: "GET"   , timeout: that.ajax_timeout, dataType: "json", cache: false,
            beforeSend: function (jq_xhr) {
                jq_xhr.setRequestHeader("Content-type", "application/json");
                jq_xhr.setRequestHeader("Accept"      , "application/json");
            },
            success: function (data, text_status, jq_xhr) {
                that.debug("HTTP response: [" + jq_xhr.status + "] " + jq_xhr.statusText + ", " + text_status + " to " + url);
                resolve(data);
            },
            error: function (jq_xhr, text_status, error_thrown) {
                that.ajaxError(jq_xhr, text_status, error_thrown, url);
                reject(text_status);
            }
        });
    });
});
