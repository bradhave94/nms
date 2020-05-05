---
title: All Refiner Recipes | No Man's Sky Refiner Recipes, Crafting Guide and Cooking
  Guide
permalink: "/all"
position: 4
layout: page
description: All refiner recipes for No Man's Sky
type: refiner
page_id: all
---

<div class="card mb-3" id="slotWrapper">
    <div class="card-header">
        <img src="uploads/portable.png" />
        <img src="uploads/medium.png" />
        <img src="uploads/large.png" />
        <span>All</span>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-bordered" id="dataTable" width="100%" cellspacing="0">
                <thead>
                    <tr>
                        <th>Refiner</th>
                        <th><div>Input 1</div></th>
                        <th><div>Input 2</div></th>
                        <th><div>Input 3</div></th>
                        <th><div>Output</div></th>
                    </tr>
                </thead>
                <tfoot>
                    <tr>
                        <th>Refiner</th>
                        <th>Input 1</th>
                        <th>Input 2</th>
                        <th>Input 3</th>
                        <th>Output</th>
                    </tr>
                </tfoot>
                <tbody id="all"></tbody>
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
            if (!isEmpty(item.ing_3)) {
                $("#all").append(
                    '<tr>  <td>Large </td> <td bgcolor="' +
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
                    getColor(item.ing_3) +
                    '"><img src="uploads/' +
                    item.ing_3.replace(/ /g, "-").toLowerCase() +
                    '.png" /><span>' +
                    item.ing_3 +
                    " x" +
                    item.ing_3_num +
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
            } else if (!isEmpty(item.ing_2)) {
                $("#all").append(
                    '<tr>  <td>Medium</td> <td bgcolor="' +
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
                    '</span></td> <td></td> <td bgcolor="' +
                    getColor(item.result) +
                    '"><img src="uploads/' +
                    item.result.replace(/ /g, "-").toLowerCase() +
                    '.png" /><span>' +
                    item.result +
                    " x" +
                    item.result_num +
                    "</span></td>"
                );
            } else {
                $("#all").append(
                    '<tr>  <td>Portable </td> <td bgcolor="' +
                    getColor(item.ing_1) +
                    '"><img src="uploads/' +
                    item.ing_1.replace(/ /g, "-").toLowerCase() +
                    '.png" /><span>' +
                    item.ing_1 +
                    " x" +
                    item.ing_1_num +
                    '</span></td> <td></td> <td></td> <td bgcolor="' +
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
                [4, "asc"]
            ],
            ordering: false,
            language: {
                searchPlaceholder: "Search",
                search: ""
            }
        });

        $('#dataTable thead th').each( function () {
            var title = $(this).text();
            $(this).find('div').append( '<input type="text" class="form-control form-control-sm cell-search" placeholder="Search '+title+'" />' );
        } );
    
        var table = $('#dataTable').DataTable();
    
        // Apply the search
        table.columns().every( function () {
            var that = this;
    
            $( 'input', this.header() ).on( 'keyup change clear', function () {
                if ( that.search() !== this.value ) {
                    that
                        .search( this.value )
                        .draw();
                }
            } );
        } );
    
        $("#loading-gif").fadeOut();
    }
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/tabletop.js/1.5.1/tabletop.min.js"></script>