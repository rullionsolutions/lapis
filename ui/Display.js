/*jslint node: true */

"use strict";

var Parent       = require("./FormBase")
  // , Entity       = require("../data/Entity")
  ;

/**
* To represeent an existing record in the database being displayed
*/
module.exports = Parent.clone({
    id      : "Display",
    layout  : "form-horizontal-readonly"
});


/**
* To prepare the Display section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined
*/
module.exports.defbind("setupFieldSet", "setup", function () {
    if (this.fieldset) {
        return;                    // done manually in setupStart
    }
    this.setFieldSet(this.entity.getRow(this.deduceKey()));
});


module.exports.defbind("reloadFieldSet", "update", function () {
    if (typeof this.fieldset.reload === "function") {
        this.fieldset.reload();
    }
});
