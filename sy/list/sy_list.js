/*global x, _ */
"use strict";

x.data.Entity.clone({
    id              : "sy_list",
    title           : "List of Values",
    area            : "sy",
    display_page    : true,
    autocompleter   : true,
    transactional   : true,
    full_text_search: true,
    title_field     : "title",
    default_order   : "area,title",
    primary_key     : "area,id",
    icon            : "Axialis/Png/24x24/Table.png",
    plural_label    : "Lists of Values",
    pack_level      : 0,
    pack_condition  : "area='{module}'",
    data_volume_oom : 2
});

x.data.entities.sy_list.addFields([
    { id: "area" , label: "Area" , type: "Text", data_length:   2, mandatory: true, search_criterion: true, list_column: true, config_item: "x.data.areas" },
    { id: "id"   , label: "Id"   , type: "Text", data_length:  40, mandatory: true, search_criterion: true, list_column: true },
    { id: "title", label: "Title", type: "Text", data_length: 160, mandatory: true, search_criterion: true, list_column: true }
]);

x.data.entities.sy_list.define("indexes", []);
