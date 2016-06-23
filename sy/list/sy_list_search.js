/*global x, _ */
"use strict";

x.ui.Page.clone({
    id              : "sy_list_search",
    entity_id       : "sy_list",
    title           : "Search for Lists of Values",
    short_title     : "Lists of Values"
});

x.ui.pages.sy_list_search.sections.addAll([
    { id: "main", type: "Search", entity: "sy_list" }
]);

x.ui.pages.sy_list_search.links.addAll([
    { id: "create", page_to: "sy_list_create" }
]);
