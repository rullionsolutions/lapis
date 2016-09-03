/*global x, URI, window */
"use strict";


var uriFunction = URI;

x.ui = x.ui || {};

x.ui.Controller = x.base.Base.clone({
    id              : "Controller",
    data_manager    : null,
    selectors       : null,
    page            : null,
    default_home    : "home"
});



x.ui.Controller.define("hashChange", function () {
    var uri = uriFunction(window.location.href),
        params = this.getParamsFromHash(uri.fragment());

    // alert user if page has unsaved data
    params.page_id = params.page_id || this.default_home;
    this.page = this.getPageFromParams(params);
    this.page.render();
});


x.ui.Controller.define("getParamsFromHash", function (hash) {
    var parts = hash.split("&"),
        parts2,
        out   = {},
        i;

    for (i = 0; i < parts.length; i += 1) {
        parts2 = parts[i].split("=");
        out[parts2[0]] = (parts2.length > 1 ? parts2[1] : null);
    }
    return out;
});


x.ui.Controller.define("getPageFromParams", function (params) {
    var page_id = params.page_id;
    if (!page_id) {
        this.throwError("no page_id parameter supplied");
    }
    if (!x.ui.pages[page_id]) {
        this.throwError("page_id not recognized: " + page_id);
    }
    return x.ui.pages[page_id].clone({
        id          : page_id,
        instance    : true,
        page_key    : params.page_key,
        data_manager: this.data_manager,
        selectors   : this.selectors
    });
});

