/*global x, _ */
"use strict";

x.ui.Page.clone({
    id              : "sy_list_create",
    entity_id       : "sy_list",
    title           : "Create a List of Values",
    transactional   : true,
    short_title     : "Create"
});

x.ui.pages.sy_list_create.sections.addAll([
    { id: "main" , type: "Create"    , entity: "sy_list" },
    { id: "items", type: "ListUpdate", entity: "sy_list_item", link_field: "list" }
]);
