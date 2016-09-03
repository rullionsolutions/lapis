/*global x, _ */
"use strict";

/**
* To represent a column in a table
*/
x.ui.sections.RecordSet.Record = x.base.Base.clone({
    id      : "RecordSet.Record",
    visible : true,
    fieldset: null,
    element : null,
    main_tag: "div"
});


x.ui.sections.RecordSet.Record.register("render");


x.ui.sections.RecordSet.Record.define("render", function (parent_elmt) {
    if (!this.element) {
        this.element = parent_elmt.makeElement(this.main_tag, "hidden", this.id);
    }
    this.element.empty();
    if (!this.fieldset.deleting) {
        this.happen("render");
    }
});
