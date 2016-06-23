/*global x, _ */
"use strict";

x.ui.Page.clone({
    id              : "sy_list_delete",
    entity_id       : "sy_list",
    title           : "Delete this List of Values",
    transactional   : true,
    requires_key    : true,
    short_title     : "Delete",
    security        : { all: false, sysmgr: true }
});

x.ui.pages.sy_list_delete.sections.addAll([
    { id: "main", type: "Delete", entity: "sy_list" }
]);
