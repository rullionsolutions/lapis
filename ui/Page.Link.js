/*global x, _ */
"use strict";


x.ui.Page.Link = x.base.Base.clone({
    id              : "Link",
    visible         : true,                         // Whether or not this tab is shown (defaults to true)
    page_to         : null,                         // String page id for target page
    page_key        : null,                         // String page key (if required), tokens in braces are detokenized, e.g. {page_key}
    label           : null,                         // Text label of link
    css_class       : "btn btn-primary",            // CSS class for link, defaults to 'btn'
    arrow_icon      : " &#10148;",
    purpose         : "Link from this page to another"
});


//Page.getJSON() calls Page.Link.isVisible() and Page.Link.getJSON()
//x.fields.Reference.renderNavOptions() calls Page.Link.isVisible() and Page.Link.renderNavOption()


x.ui.Page.Link.define("getToPage", function () {
    var page_to;
    if (this.page_to) {
        page_to = x.ui.pages[this.page_to];
        if (!page_to) {
            this.throwError("unrecognized to page: " + this.page_to);
        }
        return page_to;
    }
});


x.ui.Page.Link.define("getKey", function (override_key) {
    return override_key || (this.page_key === "{page_key}" ? this.owner.page.page_key : this.page_key);
});


x.ui.Page.Link.define("getURL", function (override_key) {
    var url = "",
        page_to = this.getToPage();

    if (page_to) {
        url = "#page_id=" + page_to.id;
        if (this.page_key) {
            url += "&page_key=" + this.page_key;
        }
    }
    if (this.url) {
        if (url) {
            url += (url.indexOf("?") > -1) ? "&" : "?";
        }
        url += this.url;
    }
    url = url.replace("{page_key}", (override_key || this.owner.page.page_key));
    return url;
});


x.ui.Page.Link.define("getLabel", function () {
    var page_to = this.getToPage();
    if (!this.label && page_to) {
        this.label = page_to.short_title || page_to.title;
    }
    return this.label;
});


/**
* Generate HTML output for this page link, used in context pages
* @param {jquery} div element object to contain the links
* @param {spec} render_opts
*/
x.ui.Page.Link.define("render", function (parent_elmt) {
    var css_class = this.css_class || "",
        page_to   = this.getToPage(),
        url = this.getURL(),
        task_info,
        tooltip;

    if (!this.element) {
        this.element = parent_elmt.makeElement("a");
    }
    this.element.empty();
    if (!this.visible) {
        css_class += " hidden";
    }
    this.element.attr("class", css_class);
    if (url) {
        this.element.attr("href", url);
    }
    if (this.target) {
        this.element.attr("target", this.target);
    }
    // if (page_to) {
    //     task_info = this.owner.page.session.getPageTaskInfo(page_to.id, this.getKey());
    // }
    if (task_info) {
        tooltip = "Task for " + task_info.assigned_user_name;
        if (task_info.due_date) {
            tooltip += " due on " + task_info.due_date;
        }
        this.element.attr("title", tooltip);
    }
    this.element.text(this.getLabel() + (this.arrow_icon || ""), true);
});


x.ui.Page.Link.define("renderNavOption", function (ul_elmt, this_val) {
    var anchor_elmt;
    if (this.nav_options !== false) {
        anchor_elmt = ul_elmt.makeElement("li").makeAnchor(this.getLabel(), this.getURL(this_val));
    }
    return anchor_elmt;
});


// name change: getTargetRow() -> checkCachedRecord()
x.ui.Page.Link.define("checkCachedRecord", function (cached_record, key) {
    var entity,
        page_to = this.getToPage();

    if (!key) {
        cached_record = null;
    }
    if (cached_record && page_to) {
        entity = page_to.page_key_entity || page_to.entity;
        this.trace("checkCachedRecord(): " + entity + ", " + key);
        if (entity && (!cached_record.isDescendantOf(entity) || cached_record.getKey() !== key)) {
            cached_record = null;
        }
    }
    return cached_record;
});


/**
* Check whether to show this link (by default, this is when its visible property is true and, if the link is to a page, the user has access to it
* @param {object} session
* @param {string, optional} override key
* @return {boolean} true if the link should be shown, false otherwise
*/
x.ui.Page.Link.define("isVisible", function (/* session, override_key, cached_record */) {
/*
    var key,
        page_to = this.getToPage();

    if (page_to) {
        key = this.getKey(override_key);
        this.trace("page_to: " + page_to.id + ", key: " + key);// §vani.core.7.5.1.2
        return (this.visible && page_to.allowed(session, key, this.checkCachedRecord(cached_record, key)).access);
    }
*/
    // return session.allowedURL(this.getURL(override_key));               // §vani.core.7.5.2.3
    return this.visible;
//    return this.visible && this.allowed(session, override_key);
});


/**
* Check whether this user is allowed to see and access this link at this time
* @param {object} session
* @param {string, optional} override key
* @return {boolean} true if the linked page is allowed for the user, false otherwise
*/
x.ui.Page.Link.define("allowed", function (session, override_key) {
    if (!this.page_to) {
        return true;
    }
    return session.allowed(this.page_to, this.getKey(override_key));
});


/**
* Create a digest object to be returned in JSON form to represent this link
*/
x.ui.Page.Link.define("getJSON", function () {
    var out = {};
    out.id     = this.id;
    out.url    = this.getURL();
    out.label  = this.getLabel();
    out.target = this.target;
    out.task_info = this.owner.page.session.getPageTaskInfo(this.getToPage().id, this.getKey());
    return out;
});


/**
* Create a new link object in the owning page, using the spec properties supplied
* @param {spec} object whose properties will be given to the newly-created link
* @return {object} Newly-created link object
*/
x.ui.Page.links.override("add", function (spec) {
    var link;
    if (!spec.page_to && !spec.label) {
        this.throwError("Link page_to or label must be specified in spec: " + this + ", " + spec.id);
    }
    link = x.ui.Page.Link.clone(spec);
    x.ui.Page.links.parent.add.call(this, link);
    return link;
});



//To show up in Chrome debugger...
//# sourceURL=page/Link.js