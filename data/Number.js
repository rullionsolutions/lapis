/*global x, _ */
"use strict";

/**
* To represent a decimal number field
*/
x.data.fields.Number = x.data.fields.Text.clone({
    id                      : "Number",
    css_type                : "number",
    css_align               : "right",
    search_oper_list        : "sy.search_oper_list_scalar",
    auto_search_oper        : "EQ",
    search_filter           : "ScalarFilter",
    decimal_digits          : 0,
    data_length             : 20,        // Has to be to pass Text.validate(), which must be called to set validated to true
//    tb_span               : 2,
    tb_input                : "input-mini",
    db_type                 : 'I',
    db_int_type             : "INT",
    min                     : 0,           // prevent negatives by default
    flexbox_size            : 2
//    update_length         : 10
});


x.data.fields.Number.define("obfuscateNumber", function () {
    return "FLOOR(RAND() * " + ((this.max || 100000) * Math.pow(10, this.decimal_digits)) + ")";
});


x.data.fields.Number.override("set", function (new_val) {
    if (typeof new_val === "number") {
        new_val = String(new_val);
    }
    new_val = new_val.replace(/,/g, "");
    return Parent.set.call(this, new_val);
});


x.data.fields.Number.define("setRounded", function (new_val) {
    return this.set(this.round(new_val));
});


x.data.fields.Number.defbind("validateNumber", "validate", function () {
    var number_val,
        decimals = 0;

    if (this.val) {
        try {
            number_val = Lib.parseStrict(this.val, 10);
            this.val = String(number_val);
            decimals = (this.val.indexOf(".") === -1) ? 0 : this.val.length - this.val.indexOf(".") - 1;
            if (decimals > this.decimal_digits) {
                this.messages.add({ type: 'E', text: this.val + " is more decimal places than the " + this.decimal_digits + " allowed for this field" });
//            } else {
//                this.val = this.val + Lib.repeat("0", this.decimal_digits - decimals);
            }
        } catch (e) {
            this.messages.add({ type: 'E', text: e.toString(), cli_side_revalidate: true });
        }

        Log.trace("Validating " + this.toString() + ", val: " + this.val + ", decimal_digits: " + this.decimal_digits +
            ", number_val: " + number_val);
        if (this.isValid()) {
            if (typeof this.min === "number" && !isNaN(this.min) && number_val < this.min) {
                this.messages.add({ type: 'E', text: this.val + " is lower than minimum value: " + this.min, cli_side_revalidate: true });
            }
            if (typeof this.max === "number" && !isNaN(this.max) && number_val > this.max) {
                this.messages.add({ type: 'E', text: this.val + " is higher than maximum value: " + this.max, cli_side_revalidate: true });
            }
        }
    }
});


x.data.fields.Number.override("getTextFromVal", function () {
    var val = this.get(),
        number_val;

    try {
        number_val = Lib.parseStrict(val, 10);
        val = this.format(number_val);
    } catch (ignore) {}
    return val;
});


x.data.fields.Number.define("format", function (number_val) {
    if (this.display_format) {
        return String((new java.text.DecimalFormat(this.display_format)).format(number_val));
    }
    return number_val.toFixed(this.decimal_digits);
});



x.data.fields.Number.define("round", function (number) {
    if (typeof number !== "number") {
        number = this.getNumber(0);
    }
    return parseFloat(number.toFixed(this.decimal_digits), 10);
});


