/*global x, _ */
"use strict";

x.ui.Page.clone({
    id              : "home",
    title           : "Home",
    security        : { all: true }
});

x.ui.pages.home.defbind("setupEnd", "setupEnd", function () {
    this.full_title = "Welcome, Stevie";
});

