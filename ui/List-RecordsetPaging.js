/*global x, _ */
"use strict";



    recordset_size      : 10,
    recordset_size_ext  : 20,
    recordset_size_long_lists: 1000,
    recordset           : 1,
    recordset_last      : 1,
    frst_recordset_icon : "&#x25C1;&#x25C1;",
    prev_recordset_icon : "&#x25C1;",
    next_recordset_icon : "&#x25B7;",
    last_recordset_icon : "&#x25B7;&#x25B7;",
    extd_recordset_icon : "&#x25BD;&#x25BD;",
    prev_columnset_icon : "&#x25C1;",
    next_columnset_icon : "&#x25B7;"

x.ui.sections.List.defbind("updateListExtend", "update", function (params) {
    if (params.page_button === "list_set_extend_" + this.id) {
        this.recordset = 1;
        this.recordset_size += this.recordset_size_ext;
    }
});



/**
* To render the player-style control for pages back and forth through recordsets of data, if appropriate
* @param foot_elem (xmlstream), render_opts
*/
x.ui.sections.List.define("renderListPager", function (foot_elem, render_opts) {
    var pagr_elem,
        ctrl_elem;

    pagr_elem = foot_elem.addChild("span", null, "css_row_pager");
    ctrl_elem = pagr_elem.addChild("span", null, "css_list_control");
    if (this.recordset > 1) {
        ctrl_elem.addChild("a", "list_set_frst_" + this.id, "css_cmd css_uni_icon_lrg")
            .attribute("title", "first recordset")
            .addText(this.frst_recordset_icon, true);
        ctrl_elem.addChild("a", "list_set_prev_" + this.id, "css_cmd css_uni_icon_lrg")
            .attribute("title", "previous recordset")
            .addText(this.prev_recordset_icon, true);
    }
    this.renderRowCount(pagr_elem, render_opts);
    ctrl_elem = pagr_elem.addChild("span", null, "css_list_control");

//    if (this.open_ended_recordset || (this.recordset_last > 1 && this.recordset < this.recordset_last)) {
    if (this.subsequent_recordset) {
        ctrl_elem.addChild("a", "list_set_next_" + this.id, "css_cmd css_uni_icon_lrg")
            .attribute("title", "next recordset")
            .addText(this.next_recordset_icon, true);
    }
    if (this.subsequent_recordset && !this.open_ended_recordset) {
        ctrl_elem.addChild("a", "list_set_last_" + this.id, "css_cmd css_uni_icon_lrg")
            .attribute("title", "last recordset")
            .addText(this.last_recordset_icon, true);
    }
    if (this.subsequent_recordset) {
        pagr_elem.addChild("span", null, "css_list_rowcount").addChild("a", "list_set_extend_" + this.id, "css_cmd css_uni_icon_lrg")
            .attribute("title", "expand this recordset by " + this.recordset_size_ext + " rows")
            .addText(this.extd_recordset_icon, true);
    }
});





/**
* Move to the nth recordset
* @param Index of recordset to move to
*/
x.ui.sections.List.define("moveToRecordset", function (new_recordset) {
    return undefined;
});

