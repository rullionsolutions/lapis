/*global x, _ */
"use strict";

/**
* To represent a column in a table
*/
x.ui.sections.List.Row = x.ui.sections.RecordSet.Record.clone({
    id      : "List.Row",
    main_tag: "tr"
});


x.ui.sections.List.Row.defbind("renderRow", "render", function () {
    var i;
    this.element.attr("class", this.getCSSClass());
    this.addRecordKey();
    for (i = 0; i < this.level_break_depth; i += 1) {
        this.element.makeElement("td");
    }
    for (i = 0; i < this.owner.columns.length(); i += 1) {
        if (this.owner.columns.get(i).isVisibleColumn()) {
            this.owner.columns.get(i).renderCell(this.element, i, this.fieldset);
        }
    }
    // for (i = 0; i < this.columns.length(); i += 1) {
    //     this.columns.get(i).renderAdditionalRow(table_elem, i, record, css_class);
    // }
});


/**
* To return the CSS class string for the tr object - 'css_row_even' or 'css_row_odd' for row striping
* @param record
* @return CSS class string
*/
x.ui.sections.List.Row.define("getCSSClass", function (/*record*/) {
    var str = (this.owner.getRecordCount() % 2 === 0) ? "css_row_even" : "css_row_odd";
    return str;
});


/**
* To return a string URL for the row, if appropriate
* @param row_elem (xmlstream), record (usually a fieldset)
* @return string URL or null or undefined
*/
x.ui.sections.List.define("addRecordKey", function () {
    if (this.fieldset && typeof this.fieldset.getKey === "function") {
        this.element.attr("data-key", this.fieldset.getKey());
    }
});

