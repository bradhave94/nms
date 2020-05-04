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
            <table class="table table-bordered" id="dataTable" width="100%" cellspacing="0">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Tier</th>
                        <th><div>Ingredient 1</div></th>
                        <th><div>Ingredient 2</div></th>
                        <th><div>Ingredient 3</div></th>
                        <th><div>Result</div></th>
                        <th>Quality</th>
                    </tr>
                </thead>
                <tfoot>
                    <tr>
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
    var publicSpreadsheetUrl =
          "https://docs.google.com/spreadsheets/d/1rgIYbl3zCD3qGTE-5ZCCmHiol7-9QzIIujkAfmgKoSo/edit?usp=sharing";
    
      function init() {
          Tabletop.init({
              key: publicSpreadsheetUrl,
              callback: showInfo,
              simpleSheet: false
          });
      }
    
      function showInfo(data, tabletop) {
          var itemsProcessed = 0;
          data.cooking.elements.forEach(function(item, index) {
              if (!isEmpty(item.ing_3)) {
                  $("#all").append(
                      "<tr> <td>" +
                      item.type +
                      "</td> <td>" +
                      item.tier +
                      '</td> <td><img src="uploads/' +
                      item.ing_1.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.ing_1 +
                      '</span></td> <td><img src="uploads/' +
                      item.ing_2.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.ing_2 +
                      '</span></td> <td><img src="uploads/' +
                      item.ing_3.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.ing_3 +
                      '</span></td> <td><img src="uploads/' +
                      item.result.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.result +
                      "</span></td><td>" +
                      item.quality +
                      "</td>"
                  );
              } else if (!isEmpty(item.ing_2)) {
                  $("#all").append(
                      "<tr> <td>" +
                      item.type +
                      "</td> <td>" +
                      item.tier +
                      '</td> <td><img src="uploads/' +
                      item.ing_1.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.ing_1 +
                      '</span></td> <td><img src="uploads/' +
                      item.ing_2.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.ing_2 +
                      '</span></td> <td></td> <td><img src="uploads/' +
                      item.result.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.result +
                      "</span></td><td>" +
                      item.quality +
                      "</td>"
                  );
              } else {
                  $("#all").append(
                      "<tr> <td>" +
                      item.type +
                      "</td> <td>" +
                      item.tier +
                      '</td> <td><img src="uploads/' +
                      item.ing_1.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.ing_1 +
                      '</span></td> <td></td> <td></td> <td><img src="uploads/' +
                      item.result.replace(/ /g, "-").toLowerCase() +
                      '.png" /><span>' +
                      item.result +
                      "</span></td><td>" +
                      item.quality +
                      "</td>"
                  );
              }
    
              itemsProcessed++;
              if (itemsProcessed === data.cooking.elements.length) {
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
              pageLength: 10,
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