/*global x, _ */
"use strict";

x.ui.ContextPage.clone({
    id              : "sy_list_context",
    entity_id       : "sy_list",
    title           : "List of Values",
    requires_key    : true
});

x.ui.pages.sy_list_context.sections.addAll([
    { id: "main"    , type: "Display", entity: "sy_list" }
]);

x.ui.pages.sy_list_context.links.addAll([
    { id: "update", page_to: "sy_list_update", page_key: "{page_key}" },
    { id: "delete", page_to: "sy_list_delete", page_key: "{page_key}" }
]);
