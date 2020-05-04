---
title: Medium Refiner | No Man's Sky Refiner Recipes
permalink: "/medium-refiner"
position: 2
layout: page
description: All medium refiner recipes for No Man's Sky
type: refiner
page_id: medium
---

<div class="card mb-3" id="slotWrapper">
    <div class="card-header">
        <img src="uploads/medium.png" />
        <span>Medium</span>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-bordered" id="dataTable" width="100%" cellspacing="0" id="dataTable">
                <thead>
                    <tr>
                        <th>Input 1</th>
                        <th>Input 2</th>
                        <th>Output</th>
                    </tr>
                </thead>
                <tfoot>
                    <tr>
                        <th>Input 1</th>
                        <th>Input 2</th>
                        <th>Output</th>
                    </tr>
                </tfoot>
                <tbody id="twoslot"></tbody>
            </table>
        </div>
    </div>
</div>

<script type="text/javascript">
    var publicSpreadsheetUrl = "https://docs.google.com/spreadsheets/d/1rgIYbl3zCD3qGTE-5ZCCmHiol7-9QzIIujkAfmgKoSo/edit?usp=sharing";

    function init() {
        Tabletop.init({
            key: publicSpreadsheetUrl,
            callback: showInfo,
            simpleSheet: false
        });
    }

    function showInfo(data, tabletop) {
        var itemsProcessed = 0;

        data.refiner.elements.forEach(function(item, index) {
            if (isEmpty(item.ing_3) && !isEmpty(item.ing_2)) {
                $("#twoslot").append(
                    '<tr> <td bgcolor="' +
                    getColor(item.ing_1) +
                    '"><img src="uploads/' +
                    item.ing_1.replace(/ /g, "-").toLowerCase() +
                    '.png" /><span>' +
                    item.ing_1 +
                    " x" +
                    item.ing_1_num +
                    '</span></td> <td bgcolor="' +
                    getColor(item.ing_2) +
                    '"><img src="uploads/' +
                    item.ing_2.replace(/ /g, "-").toLowerCase() +
                    '.png" /><span>' +
                    item.ing_2 +
                    " x" +
                    item.ing_2_num +
                    '</span></td> <td bgcolor="' +
                    getColor(item.result) +
                    '"><img src="uploads/' +
                    item.result.replace(/ /g, "-").toLowerCase() +
                    '.png" /><span>' +
                    item.result +
                    " x" +
                    item.result_num +
                    "</span></td>"
                );
            }

            itemsProcessed++;
            if (itemsProcessed === data.refiner.elements.length) {
                callback();
            }
        });
    }

    function isEmpty(obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) return false;
        }
        return true;
    }

    window.addEventListener("DOMContentLoaded", init);

    function callback() {
        $("#dataTable").DataTable({
            order: [
                [2, "asc"]
            ],
            language: {
                searchPlaceholder: "Search",
                search: ""
            },
            "columnDefs": [{
                "targets": [0, 1],
                "searchable": false
            }]
        });
        $("#loading-gif").fadeOut();
        $("#slotWrapper").fadeIn();
    }
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/tabletop.js/1.5.1/tabletop.min.js"></script>