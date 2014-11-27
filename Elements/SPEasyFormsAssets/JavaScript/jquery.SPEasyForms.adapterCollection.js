﻿/*
 * SPEasyForms.adapterCollection - collection of field control adapters.
 *
 * @requires jQuery v1.11.1 
 * @copyright 2014 Joe McShea
 * @license under the MIT license:
 *    http://www.opensource.org/licenses/mit-license.php
 */
/* global spefjQuery */
(function ($, undefined) {

    ////////////////////////////////////////////////////////////////////////////
    // Collection of field control adapters.
    ////////////////////////////////////////////////////////////////////////////
    $.spEasyForms.adapterCollection = {
        adapterImplementations: {},

        supportedTypes: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            var result = [];
            if (opt.currentConfig.adapters && opt.currentConfig.adapters.def) {
                $.each(Object.keys(adapterCollection.adapterImplementations), function (idx, impl) {
                    if (impl in adapterCollection.adapterImplementations) {
                        result = result.concat(adapterCollection.adapterImplementations[impl].supportedTypes(opt));
                    }
                });
                result = $(result).filter(function (pos, item) {
                    return $.inArray(item, result) === pos;
                });
            }
            return result;
        },

        transform: function (options) {
            if (window.location.href.toLowerCase().indexOf("speasyformssettings.aspx") < 0) {
                var opt = $.extend({}, $.spEasyForms.defaults, options);
                if (opt.currentConfig && opt.currentConfig.adapters && opt.currentConfig.adapters.def) {
                    opt.adapters = opt.currentConfig.adapters.def;
                    $.each(opt.adapters, function (idx, adapter) {
                        opt.adapter = adapter;
                        if (opt.adapter.type in adapterCollection.adapterImplementations) {
                            adapterCollection.adapterImplementations[opt.adapter.type].transform(opt);
                        }
                    });
                }
            }
        },

        toEditor: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            opt.adapters = opt.currentConfig.adapters.def;

            $.each(Object.keys(adapterCollection.adapterImplementations), function (idx, impl) {
                if (impl in adapterCollection.adapterImplementations) {
                    adapterCollection.adapterImplementations[impl].toEditor(opt);
                }
            });

            $("tr.speasyforms-adapter-static").remove();
            $.each(Object.keys(opt.adapters).sort(this.compareAdapters), function (idx, adapterField) {
                opt.adapter = opt.adapters[adapterField];
                opt.fieldName = adapterField;
                if (opt.adapter.type in adapterCollection.adapterImplementations) {
                    adapterCollection.drawAdapter(opt);
                }
            });
            if ($("tr.speasyforms-adapter-static").length === 0) {
                $("#spEasyFormsAdapterTable").append("<tr class='speasyforms-adapter-static'>" +
                    "<td class='speasyforms-adapter-static' colspan='5'>" +
                    "There are no adpaters configured for the current form.</td></tr>");
            }
            $("#tabs-min-adapters").append("<br /><br />");

            $("tr.speasyforms-sortablefields").each(function () {
                var tds = $(this).find("td");
                if (tds.length > 2) {
                    var internalName = $(this).find("td")[1].innerHTML;
                    var type = $(this).find("td")[2].innerHTML;
                    opt.supportedTypes = adapterCollection.supportedTypes(opt);
                    if ($.inArray(type, opt.supportedTypes) >= 0) {
                        $(this).append(
                            "<td class='speasyforms-adapter'><button id='" +
                            internalName +
                            "Adapter' class='speasyforms-containerbtn " +
                            "speasyforms-adapter' data-spfieldtype='" +
                            type + "'>" +
                            "Configure Field Control Adapter</button></td>");
                    } else {
                        $(this).append("<td class='speasyforms-blank'>&nbsp;</td>");
                    }
                }
            });

            $("#adapterTypeDialog").dialog({
                modal: true,
                autoOpen: false,
                width: 400,
                buttons: {
                    "Ok": function () {
                        $("#adapterTypeDialog").dialog("close");
                        opt.adapterType = $("#adapterType option:selected").text();
                        $.each(adapterCollection.adapterImplementations, function (idx, impl) {
                            if (impl.type === opt.adapterType) {
                                opt.adapterImpl = impl;
                            }
                        });
                        if (opt.adapterImpl) {
                            opt.adapterImpl.launchDialog(opt);
                        }
                    },
                    "Cancel": function () {
                        $("#adapterTypeDialog").dialog("close");
                    }
                }
            });

            $("button.speasyforms-adapter").button({
                icons: {
                    primary: "ui-icon-shuffle"
                },
                text: false
            }).click(function () {
                opt.button = this;
                opt.fieldName = opt.button.id.replace("Adapter", "");
                opt.spFieldType = $.spEasyForms.containerCollection.rows[opt.fieldName].spFieldType;
                adapterCollection.launchDialog(opt);
                return false;
            });

            if ($("#spEasyFormsAdapterTable tr.speasyforms-fieldmissing").length > 0 && opt.verbose) {
                $("#adapterTab").addClass("speasyforms-fieldmissing");
            }
            else {
                $("#adapterTab").removeClass("speasyforms-fieldmissing");
            }
        },

        launchDialog: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            opt.dialogLaunched = false;
            opt.adapters = opt.currentConfig.adapters.def;
            opt.adapter = undefined;
            if (opt.fieldName in opt.adapters) {
                opt.adapter = opt.adapters[opt.fieldName];
            }
            if (opt.adapter) {
                var a = opt.adapters[opt.fieldName];
                if (a.type in adapterCollection.adapterImplementations) {
                    adapterCollection.adapterImplementations[a.type].launchDialog(opt);
                    opt.dialogLaunced = true;
                }
            }
            if (!opt.dialogLaunced) {
                opt.typeAdapters = [];
                $.each(adapterCollection.adapterImplementations, function (idx, impl) {
                    if ($.inArray(opt.spFieldType, impl.supportedTypes(opt)) >= 0) {
                        opt.typeAdapters.push({
                            impl: impl,
                            type: opt.spFieldType
                        });
                    }
                });
                if (opt.typeAdapters.length === 1) {
                    opt.typeAdapters[0].impl.launchDialog(opt);
                } else {
                    // ask what type of adapter they want
                    $("#adapterFieldType").text(opt.spFieldType);
                    $("#adapterType").find("option:not(:first)").remove();
                    $.each(opt.typeAdapters, function (idx, current) {
                        $("#adapterType").append("<option value='" + idx + "'>" + current.impl.type + "</option>");
                    });
                    $("#adapterTypeDialog").dialog("open");
                }
            }
            $(".tabs-min").hide();
            $("#tabs-min-adapters").show();
        },

        preSaveItem: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            var result = true;
            $.each(adapterCollection.adapterImplementations, function (idx, impl) {
                if (typeof (impl.preSaveItem) === "function") {
                    result = result && impl.preSaveItem(opt);
                }
            });
            return result;
        },

        drawAdapter: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            var displayName = opt.fieldName;
            var klass = "speasyforms-adapter-static speasyforms-dblclickdialog";
            var title = JSON.stringify(opt.adapter);
            var config = "";

            $.each(Object.keys(opt.adapter).sort(), function (idx, key) {
                if (key !== "type" && key !== "columnNameInternal") {
                    if (config.length > 0) {
                        config += "<br />";
                    }
                    config += "<b>" + $.spEasyForms.utilities.titleCase(key) + "</b> = " + opt.adapter[key];
                }
            });

            if ($.spEasyForms.containerCollection.rows[opt.adapter.columnNameInternal] &&
                !$.spEasyForms.containerCollection.rows[opt.adapter.columnNameInternal].fieldMissing) {
                displayName = $.spEasyForms.containerCollection.rows[opt.adapter.columnNameInternal].displayName;
            }
            else {
                klass += " speasyforms-fieldmissing";
                title = "This field was not found in the form and may have been deleted.";
            }

            if (opt.verbose && klass.indexOf("speasyforms-fieldmissing") >= 0) {
                $("#spEasyFormsAdapterTable").append("<tr class='" + klass + "' " +
                    "data-fieldname='" + opt.adapter.columnNameInternal + "' " +
                    "data-dialogtype='adapter' title='" + title + "'>" +
                    "<td class='" + klass + "'>" + displayName + "</td>" +
                    "<td class='" + klass + " speasyforms-hidden' style='display:none'>" + opt.adapter.columnNameInternal + "</td>" +
                    "<td class='" + klass + "'>" + opt.adapter.type + "</td>" +
                    "<td class='" + klass + "'>" + config + "</td>" +
                    "</tr>");
            }
            else if (klass.indexOf("speasyforms-fieldmissing") < 0) {
                $("#spEasyFormsAdapterTable").append("<tr class='" + klass + "' " +
                    "data-fieldname='" + opt.adapter.columnNameInternal + "' " +
                    "data-dialogtype='adapter' title='" + title + "'>" +
                    "<td class='" + klass + "'>" + displayName + "</td>" +
                    "<td class='" + klass + " speasyforms-hidden' style='display:none'>" + opt.adapter.columnNameInternal + "</td>" +
                    "<td class='" + klass + "'>" + opt.adapter.type + "</td>" +
                    "<td class='" + klass + "'>" + config + "</td>" +
                    "</tr>");
            }
            else {
                $("#spEasyFormsAdapterTable").append("<tr class='" + klass + "' " +
                    "data-fieldname='" + opt.adapter.columnNameInternal + "' " +
                    "data-dialogtype='adapter' title='" + title + "' style='display:none'>" +
                    "<td class='" + klass + "'>" + displayName + "</td>" +
                    "<td class='" + klass + " speasyforms-hidden' style='display:none'>" + opt.adapter.columnNameInternal + "</td>" +
                    "<td class='" + klass + "'>" + opt.adapter.type + "</td>" +
                    "<td class='" + klass + "'>" + config + "</td>" +
                    "</tr>");
            }
        },

        compareAdapters: function (a, b) {
            var listctx = $.spEasyForms.sharePointContext.getListContext();
            if (a in listctx.fields) {
                a = listctx.fields[a].displayName;
            }
            if (b in listctx.fields) {
                b = listctx.fields[b].displayName;
            }
            if (a < b) {
                return -1;
            } else if (a > b) {
                return 1;
            }
            return 0;
        },

        validateRequired: function (options) {
            var control = $("#" + options.id);
            control.parent().find(".speasyforms-error").remove();
            if (!control.val()) {
                control.parent().append(
                    "<div class='speasyforms-error'>'" + options.displayName +
                    "' is a required field!</div>");
            }
        }
    };
    var adapterCollection = $.spEasyForms.adapterCollection;

})(spefjQuery);