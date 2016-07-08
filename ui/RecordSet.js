/*global x, _ */
"use strict";

x.ui.sections.RecordSet = x.ui.sections.Section.clone({
    id                  : "RecordSet",
    records             : null,               // array of record objects
       allow_add_records: true,
    allow_delete_records: true,
       add_record_icon  : "<i class='icon-plus'></i>",        // ordinary plus ; "&#x2795;" heavy plus sign
    delete_record_icon  : "<i class='icon-remove'></i>",      // ordinary cross; "&#x274C;" heavy cross mark
       add_record_label : "Add a new record",
    delete_record_label : "Remove this record",
    text_no_records     : "no records",
    text_one_records    : "1 record",
    text_many_records   : "records",
    recordset_size      : 10,
    recordset_size_ext  : 20,
    recordset_size_long_lists: 1000,
    recordset           : null,
    recordset_last      : null,
    frst_recordset_icon : "<i class='icon-fast-backward'></i>",
    prev_recordset_icon : "<i class='icon-backward'></i>",
    next_recordset_icon : "<i class='icon-forward'></i>",
    last_recordset_icon : "<i class='icon-fast-forward'></i>",
    extd_recordset_icon : "<i class='icon-arrow-down'></i>"
});


x.ui.sections.RecordSet.register(   "addRecord");
x.ui.sections.RecordSet.register("deleteRecord");
x.ui.sections.RecordSet.register("renderBeforeRecords");
x.ui.sections.RecordSet.register("renderAfterRecords");


x.ui.sections.RecordSet.defbind("initializeRecordSet", "cloneInstance", function () {
    this.records        = [];
    this.recordset      = 1;
    this.recordset_last = 1;
});


x.ui.sections.RecordSet.define("addRecord", function (record) {
    if (!this.allow_add_records) {
        this.throwError("records cannot be added to this RecordSet");
    }
    this.records.push(record);
    this.happen("addRecord", record);
    this.renderRecord(record);
});


x.ui.sections.RecordSet.define("deleteRecord", function (record) {
    var i = this.records.indexOf(record);
    if (i < 0) {
        this.throwError("record not in this RecordSet: " + record.getUUID());
    }
    if (!this.allow_delete_records) {
        this.throwError("records cannot be deleted from this RecordSet");
    }
    if (record.allow_delete === false) {
        this.throwError("this record cannot be deleted");
    }
    record.setDelete(true);
    this.records.splice(i, 1);
    this.happen("deleteRecord", record);
    this.render();              // no object containing the tr element, so must refresh whole section
});


x.ui.sections.RecordSet.define("getRecordCount", function () {
    return this.records.length;
});


x.ui.sections.RecordSet.define("eachRecord", function (funct) {
    var i;
    for (i = 0; i < this.records.length; i += 1) {
        funct(this.records[i]);
    }
});


x.ui.sections.RecordSet.override("isValid", function () {
    var valid = true;
    this.eachRecord(function (record) {
        valid = valid && (record.deleting || record.isValid());
    });
    return valid;
});

/*
x.ui.sections.RecordSet.defbind("renderRecordSet", "render", function () {
    this.happen("renderBeforeRecords");
    this.renderRecords();
    this.happen("renderAfterRecords" );
});
*/

x.ui.sections.RecordSet.define("renderRecords", function () {
    var i;
    this.happen("renderBeforeRecords");
    for (i = 0; i < this.records.length; i += 1) {
        if (!this.records[i].deleting) {
            this.renderRecord(this.records[i]);
        }
    }
    this.happen("renderAfterRecords" );
});


x.ui.sections.RecordSet.define("renderRecord", function (/*record*/) {
    this.throwError("not implemented");
});


/**
* To render elements displayed in the event that the list thas no records. By default this will be the text_no_records but can be overridden to display addition elements.
* @param
*/
x.ui.sections.RecordSet.define("renderNoRecords", function () {
    this.getSectionElement().text(this.text_no_records);
});


x.ui.sections.RecordSet.define("extendRecordSet", function () {
    this.recordset = 1;
    this.recordset_size += this.recordset_size_ext;
});



/**
* To render the player-style control for pages back and forth through recordsets of data, if appropriate
* @param foot_elem (xmlstream)
*/
x.ui.sections.RecordSet.define("renderListPager", function (foot_elem) {
    var ctrl_elem = foot_elem.makeElement("span", "btn-group css_record_pager");
    if (this.recordset > 1) {
        ctrl_elem.makeElement("a", "css_cmd btn btn-mini", "list_set_frst_" + this.id)
            .attr("title", "first recordset")
            .text(this.frst_recordset_icon, true);
        ctrl_elem.makeElement("a", "css_cmd btn btn-mini", "list_set_prev_" + this.id)
            .attr("title", "previous recordset")
            .text(this.prev_recordset_icon, true);
    }
    this.renderRecordCount(ctrl_elem);

//    if (this.open_ended_recordset || (this.recordset_last > 1 && this.recordset < this.recordset_last)) {
    if (this.subsequent_recordset || this.recordset > 1) {
        ctrl_elem.makeElement("span", "css_list_recordcount").makeElement("a", "css_cmd btn btn-mini", "list_set_extend_" + this.id)
            .attr("title", "expand this recordset by " + this.recordset_size_ext + " records")
            .text(this.extd_recordset_icon, true);
    }
    if (this.subsequent_recordset) {
        ctrl_elem.makeElement("a", "css_cmd btn btn-mini", "list_set_next_" + this.id)
            .attr("title", "next recordset")
            .text(this.next_recordset_icon, true);
    }
    if (this.subsequent_recordset && !this.open_ended_recordset) {
        ctrl_elem.makeElement("a", "css_cmd btn btn-mini", "list_set_last_" + this.id)
            .attr("title", "last recordset")
            .text(this.last_recordset_icon, true);
    }
});



x.ui.sections.RecordSet.define("getRecordCountText", function () {
    var text;
    if (this.recordset === 1 && !this.subsequent_recordset) {
        if (this.record_count === 0) {
            text = this.text_no_records;
        } else if (this.record_count === 1) {
            text = this.text_one_records;
        } else {
            text = this.record_count + " " + this.text_many_records;
        }
    } else {
        if (this.frst_record_in_set && this.last_record_in_set) {
            text = "records " + this.frst_record_in_set + " - " + this.last_record_in_set;
            if (!this.open_ended_recordset && this.found_records && this.recordset_size < this.found_records) {
                text += " of " + this.found_records;
            }
        } else {
            text = this.record_count + " " + this.text_many_records;
        }
    }
    return text;
});



/**
* Move to the nth recordset
* @param Index of recordset to move to
*/
x.ui.sections.RecordSet.define("moveToRecordset", function (/*new_recordset*/) {
    return undefined;
});

