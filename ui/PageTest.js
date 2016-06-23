/*global x, _ */
"use strict";


/**
* To represent a component of a page with display content
*/
x.ui.PageTest = x.ui.Page.clone({
    id                      : "Page",
    title                   : "PageTest"
});



x.ui.PageTest.tabs.addAll([
    { id: "asgn_main", label: "Assignment"            },
    { id: "asgn_org" , label: "Organisation"          },
    { id: "asgn_asw" , label: "Agency-Supplied Worker"},
    { id: "asgn_awr" , label: "AWR"                   }
]);

x.ui.PageTest.sections.addAll([
    { id: "asgn_main"    , type: "Section"  , tab: "asgn_main", entity: "rm_asgn", field_group: "main"    , title: "Assignment Main Details" },
    { id: "asgn_rqmt"    , type: "Section"  , tab: "asgn_main", entity: "rm_asgn", field_group: "rqmt"   , title: "Some Other Section", text: "With additional text" },
    { id: "asgn_org"     , type: "Section"  , tab: "asgn_org" , entity: "rm_asgn", field_group: "org"     , title: "Organisation" },
    { id: "asgn_asw"     , type: "Section"  , tab: "asgn_asw" , entity: "rm_asgn", field_group: "asw"     , title: "Details Stored Against the Assignment" },
    { id: "asgn_awr_ctrl", type: "Section"  , tab: "asgn_awr" , entity: "rm_asgn", field_group: "awr_ctrl", title: "AWR Setup" },
    { id: "asgn_awr_comp", type: "Section"  , tab: "asgn_awr" , entity: "rm_asgn", field_group: "awr_comp", title: "AWR Comparators" }
]);
