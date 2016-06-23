/*global x, _ */
"use strict";

/**
* To represent a date field
*/
x.data.fields.Date = x.data.fields.Text.clone({
    id                      : "Date",
    css_type                : "date",
    search_oper_list        : "sy.search_oper_list_scalar",
    auto_search_oper        : "EQ",
    search_filter           : "ScalarFilter",
    internal_format         : "yyyy-MM-dd",
    update_format           : "dd/MM/yy",
    display_format          : "dd/MM/yy",
    input_mask              : "99/99/99",
    regex_label             : "Not a valid date",
    data_length             : 10,
//    update_length         : 8,
//    tb_span               : 2,
    tb_input                : "input-mini",
    week_start_day          : 0,            // 0 = Sun, 1 = Mon, etc
    error_message           : "not a valid date"
});


x.data.fields.Date.override("getUpdateText", function () {
    return this.getText();
});



x.data.fields.Date.define("getDBDateFormat", function (format) {
    return format
        .replace("HH"  , "%H")
        .replace("mm"  , "%i")
        .replace("ss"  , "%s")
        .replace("dd"  , "%z")      // %z - not used by MySQL - holding char
        .replace("MM"  , "%m")
        .replace("yyyy", "%Y")
        .replace("d"   , "%e")
        .replace("M"   , "%c")
        .replace("yy"  , "%y")
        .replace("%z"  , "%d");
});


/*
x.data.fields.Date.override("getDBTextExpr", function (alias) {
    return "DATE_FORMAT(" + (alias ? alias + "." : "") + this.id + ", '" + this.getDBDateFormat(this.display_format) + "')";
});
*/

/**
* To attempt to parse a given date (or date/time) string, using given in/out formats if supplied, and applying any 'adjusters'
* @param A date string, with optional 'adjusters', separated by '+' chars, e.g. 'week-start', 'month-end', '2months', '-3minutes', numbers interpreted as days; 2nd arg is optional string input format, 3rd arg is optional string out format
* @return Converted date string (if conversion could be performed), otherwise returns the input string
*/
x.data.fields.Date.define("parse", function (val, in_format, out_format) {
    var parts,
        date,
        i;

    if (typeof val !== "string") {
        return val;
    }
    date = new Date();
    parts = val.split("+");
     in_format =  in_format || this.internal_format;
    out_format = out_format || this.internal_format;
    for (i = 0; i < parts.length && date; i += 1) {        // exit loop if date is ever null
        if (parts[i] === "today") {
            continue;
        }
        if (parts[i] === "now") {
            continue;
        }
        if (parts[i] === "day-start") {
            date.clearTime();
        } else if (parts[i] === "day-end") {
            date.setHours(23);
            date.setMinutes(59);
            date.setSeconds(59);
            date.setMilliseconds(999);
        } else if (parts[i] === "week-start") {
            date.add('d',   - ((date.getDay() + this.week_start_day) % 7));            // getDay() returns 0 for Sun to 6 for Sat
        } else if (parts[i] === "week-end") {
            date.add('d', 6 - ((date.getDay() + this.week_start_day) % 7));
        } else if (parts[i] === "month-start") {
            date.setDate(1);
        } else if (parts[i] === "month-end") {
            date.add('M', 1);
            date.setDate(1);
            date.add('d', -1);
        } else if (parts[i].indexOf("minutes") > -1) {
            date.add('m', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("hours") > -1) {
            date.add('h', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("days") > -1) {
            date.add('d', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("weeks") > -1) {
            date.add('d', parseInt(parts[i], 10) * 7);
        } else if (parts[i].indexOf("months") > -1) {
            date.add('M', parseInt(parts[i], 10));
        } else if (parts[i].indexOf("years") > -1) {
            date.add('y', parseInt(parts[i], 10));
        } else if (parseInt(parts[i], 10).toFixed(0) === parts[i]) {
            date.add('d', parseInt(parts[i], 10));
        } else {
            date = Date.parseString(parts[i], in_format);
        }
    }
    return (date ? date.format(out_format) : val);
});


/**
* Syntactic sugar - equivalent to this.parse(val, this.internal_format, this.display_format)
* @param A date string, with optional 'adjusters', separated by '+' chars, e.g. 'week-start', 'month-end', '2months', '-3minutes', numbers interpreted as days; 2nd arg is optional string input format, 3rd arg is optional string out format
* @return Converted date string (if conversion could be performed) in usual display format, otherwise returns the input string
*/
x.data.fields.Date.define("parseDisplay", function (val) {
    return this.parse(val, this.internal_format, this.display_format);
});


/**
* To obtain a JavaScript date object representing the value of this field
* @return A JavaScript date object corresponding to this field's value - note that changes to it do NOT update the value of the field
*/
x.data.fields.Date.define("getDate", function () {
    if (!this.isBlank()) {
        return Date.parse(this.get());
    }
});


/**
* To indicate whether or not the date (or date/time) argument is before this field's value
* @param Date string
* @return True if this field's value represents a point in time before the date argument
*/
x.data.fields.Date.define("isBefore", function (date) {
    var nThisDay,
        nOtherDay;

    if (!this.get() || !date) {
        return false;
    }
     nThisDay = Math.floor(Date.parse(this.get()      ).getTime() / ( 1000 * 60 * 60 * 24));
    nOtherDay = Math.floor(Date.parse(this.parse(date)).getTime() / ( 1000 * 60 * 60 * 24));
    return (nThisDay < nOtherDay);
});


/**
* To indicate whether or not the date (or date/time) argument is after this field's value
* @param Date string
* @return True if this field's value represents a point in time after the date argument
*/
x.data.fields.Date.define("isAfter", function (date) {
    var nThisDay,
        nOtherDay;

    if (!this.get() || !date) {
        return false;
    }
     nThisDay = Math.floor(Date.parse(this.get()      ).getTime() / ( 1000 * 60 * 60 * 24));
    nOtherDay = Math.floor(Date.parse(this.parse(date)).getTime() / ( 1000 * 60 * 60 * 24));
    return (nThisDay > nOtherDay);
});


x.data.fields.Date.override("setInitial", function (new_val) {
    x.data.fields.Text.setInitial.call(this, new_val);
    this.val = this.parse(this.val);
});


x.data.fields.Date.override("set", function (new_val) {
    if (typeof new_val === "object" && typeof new_val.getFullYear === "function") {
        new_val = new_val.internal();
    } else if (typeof new_val === "string") {
        new_val = this.parse(new_val);
        if (!Date.isValid(new_val, this.internal_format) && Date.isValid(new_val, this.update_format)) {
            new_val = Date.parseString(new_val, this.update_format).format(this.internal_format);
        }
    } else if (!new_val) {
        new_val = "";
    }
    x.data.fields.Text.set.call(this, new_val);
});


x.data.fields.Date.defbind("validateDate", "validate", function () {
    var date;
    if (this.val) {                // Only do special validation if non-blank
        date = Date.parse(this.val);
        if (date && date.format(this.internal_format) === this.val) {
            if (this.min && this.val < this.parse(this.min)) {
                this.messages.add({ type: 'E', text: "earlier than minimum value: " + this.parseDisplay(this.min) });
            }
            if (this.max && this.val > this.parse(this.max)) {
                this.messages.add({ type: 'E', text:   "later than maximum value: " + this.parseDisplay(this.max) });
            }
        } else {            // not a valid date
            this.messages.add({ type: 'E', text: this.error_message });
        }
    }
});


x.data.fields.Date.override("getTextFromVal", function () {
    var val = this.get();
    if (val) {
        try {
            val = Date.parse(val).format(this.display_format);
        } catch (ignore) {}          // leave val as-is if date is invalid
    }
    return val;
});

/*
x.data.fields.Date.override("generateTestValue", function (min, max) {
    var i;
    min = Date.parse(min || this.min || "2000-01-01");
    max = Date.parse(max || this.max || "2019-12-31");
    i = Math.floor(Math.random() * min.daysBetween(max));
//    return Lib.formatDate(Lib.addDays(min, i));
    return min.add('d', i).format(this.internal_format);
});
*/
