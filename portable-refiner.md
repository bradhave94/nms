---
title: Portable Refiner | No Man's Sky Refiner Recipes, Crafting Guide and Cooking
  Guide
permalink: "/portable-refiner"
position: 1
description: All portable refiner recipes for No Man's Sky
type: refiner
page_id: portable
layout: page
---

<div class="card mb-3" id="slotWrapper">
    <div class="card-header">
        <img src="uploads/portable.png" />
        <span>Portable Refiner</span>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-bordered" id="dataTable" width="100%" cellspacing="0">
                <thead>
                    <tr>
                        <th><div>Input</div></th>
                        <th><div>Output</div></th>
                    </tr>
                </thead>
                <tfoot>
                    <tr>
                        <th>Input</th>
                        <th>Output</th>
                    </tr>
                </tfoot>
                <tbody id="oneslot">
                </tbody>
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
            if (isEmpty(item.ing_3) && isEmpty(item.ing_2)) {
                $("#oneslot").append(
                    '<tr>  <td bgcolor="' +
                    getColor(item.ing_1) +
                    '" style="color:' +
                    item.ing_1 +
                    '"><img src="uploads/' +
                    item.ing_1.replace(/ /g, "-").toLowerCase() +
                    '.png" /><span>' +
                    item.ing_1 +
                    " x" +
                    item.ing_1_num +
                    '</span></td> <td bgcolor="' +
                    getColor(item.result) +
                    '" style="color:' +
                    item.result +
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
                [1, "asc"]
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
        $("#slotWrapper").fadeIn();
    }
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/tabletop.js/1.5.1/tabletop.min.js"></script>
