---
title: Cooking Guide | No Man's Sky Refiner Recipes, Crafting Guide and Cooking Guide
permalink: "/cooking"
position: 6
layout: page
description: Cooking Guide for No Man's Sky
page_id: cooking
---

<div class="card mb-3" id="slotWrapper">
    <div class="card-header">
        <img src="uploads/nutrient-processor.png" />
        <span>Cooking</span>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <div id="loading" class="text-center" style="padding: 2rem">
                <img src="uploads/loading.gif" width="50"/>
            </div>
            <table class="table table-bordered loading" id="dataTable" width="100%" cellspacing="0">
                <thead>
                    <tr class='tr-title'>
                        <th>Type</th>
                        <th>Tier</th>
                        <th>Ingredient 1</th>
                        <th>Ingredient 2</th>
                        <th>Ingredient 3</th>
                        <th>Result</th>
                        <th>Quality</th>
                    </tr>
                    <tr class="text-center">
                        <th><div>Type</div></th>
                        <th><div>Tier</div></th>
                        <th><div>Ingredient 1</div></th>
                        <th><div>Ingredient 2</div></th>
                        <th><div>Ingredient 3</div></th>
                        <th><div>Result</div></th>
                        <th><div>Quality</div></th>
                    </tr>
                </thead>
                <tfoot>
                    <tr class='tr-title'>
                        <th>Type</th>
                        <th>Tier</th>
                        <th>Ingredient 1</th>
                        <th>Ingredient 2</th>
                        <th>Ingredient 3</th>
                        <th>Result</th>
                        <th>Quality</th>
                    </tr>
                </tfoot>
                <tbody id="all"></tbody>
            </table>
        </div>
    </div>
</div>

<script type="text/javascript">
      function init() {
          Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vROLg0CZP-mEtST-Lw8CBsWjw2Amm68XMFEL1xoix02LgopFq8SpjaOfv7lgxEn0MSJl9QlMGPoSKDu/pub?gid=1611798043&single=true&output=csv', {
          download: true,
          header: true,
          complete: showInfo
        })
      }
    
      function showInfo(data, tabletop) {
          var itemsProcessed = 0;
          data.data.forEach(function(item, index) {
              if (!isEmpty(item.ing_3)) {
                  $("#all").append(
                      '<tr> <td onclick="getText(\''+item.type+'\')">' +
                      item.type +
                      '</td> <td onclick="getText(\''+item.tier+'\')">' +
                      item.tier +
                      '</td> <td onclick="getText(\''+item.ing_1+'\')"><img src="uploads/' +
                      item.ing_1.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.ing_1 +
                      '</span></td> <td onclick="getText(\''+item.ing_2+'\')"><img src="uploads/' +
                      item.ing_2.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.ing_2 +
                      '</span></td> <td onclick="getText(\''+item.ing_3+'\')"><img src="uploads/' +
                      item.ing_3.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.ing_3 +
                      '</span></td> <td onclick="getText(\''+item.result+'\')"><img src="uploads/' +
                      item.result.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.result +
                      '</span></td><td onclick="getText(\''+item.quality+'\')">' +
                      item.quality +
                      "</td>"
                  );
              } else if (!isEmpty(item.ing_2)) {
                  $("#all").append(
                      '<tr> <td onclick="getText(\''+item.type+'\')">' +
                      item.type +
                      '</td> <td onclick="getText(\''+item.tier+'\')">' +
                      item.tier +
                      '</td> <td onclick="getText(\''+item.ing_1+'\')"><img src="uploads/' +
                      item.ing_1.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.ing_1 +
                      '</span></td> <td onclick="getText(\''+item.ing_2+'\')"><img src="uploads/' +
                      item.ing_2.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.ing_2 +
                      '</span></td> <td></td> <td onclick="getText(\''+item.result+'\')"><img src="uploads/' +
                      item.result.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.result +
                      '</span></td><td onclick="getText(\''+item.quality+'\')">' +
                      item.quality +
                      "</td>"
                  );
              } else {
                  $("#all").append(
                      '<tr> <td onclick="getText(\''+item.type+'\')">' +
                      item.type +
                      '</td> <td onclick="getText(\''+item.tier+'\')">' +
                      item.tier +
                      '</td> <td onclick="getText(\''+item.ing_1+'\')"><img src="uploads/' +
                      item.ing_1.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.ing_1 +
                      '</span></td> <td></td> <td></td> <td onclick="getText(\''+item.result+'\')"><img src="uploads/' +
                      item.result.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.result +
                      '</span></td><td onclick="getText(\''+item.quality+'\')">' +
                      item.quality +
                      "</td>"
                  );
              }
    
              itemsProcessed++;
              if (itemsProcessed === data.data.length) {
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
              lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
              pageLength: 10,
              language: {
                  searchPlaceholder: "Search",
                  search: '<a class="clearSearch" onclick="clearSearch()"><i class="fa fa-times" aria-hidden="true"></i></a>'
              }
          });
          
          $('#dataTable thead th').each( function () {
                var title = $(this).text();
                $(this).find('div').html( '<input type="text" class="form-control form-control-sm cell-search" placeholder="Search '+title+'" />' );
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
    
          $("#loading").remove();
          $(".loading").removeClass('loading');
      }
</script>
<script src="./js/papaparse.js"></script>