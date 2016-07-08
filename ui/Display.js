/*global x, _ */
"use strict";


x.ui.sections.Display = x.ui.sections.Form.clone({
    id      : "Display",
    layout  : "form-horizontal-readonly"
});


/**
* To prepare the Display section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined
*/
x.ui.sections.Display.defbind("setupFieldSet", "setup", function () {
    var fieldset;
    if (this.fieldset) {
        return;             // set already
    }
    if (this.link_field) {
        this.throwError("not implemented yet");
    } else if (this.entity.id === this.owner.page.entity.id) {
        this.setDocument(this.owner.page.getMainDocument());
    } else {
        this.throwError("no fieldset and can't create one");
    }
});

