---
title: Crafting Guide | No Man's Sky Refiner Recipes, Crafting Guide and Cooking Guide
permalink: "/crafting-guide"
position: 5
layout: page
description: Crafting Guide for No Man's Sky
page_id: crafting
---

<div class="card mb-3" id="slotWrapper">
    <div class="card-header">
        <img src="uploads/resources.png" />
        <span>Crafting</span>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <div id="loading" class="text-center" style="padding: 2rem">
                <img src="uploads/loading.gif" width="50"/>
            </div>
            <table class="crafting table table-bordered loading" id="dataTable" width="100%" cellspacing="0">
                <thead>
                    <tr class='tr-title'>
                        <th>Value</th>
                        <th>Resources 1</th>
                        <th>Resources 2</th>
                        <th>Resources 3</th>
                        <th>Product</th>
                    </tr>
                    <tr class="text-center">
                        <th><div>Value</div></th>
                        <th><div>Resources 1</div></th>
                        <th><div>Resources 2</div></th>
                        <th><div>Resources 3</div></th>
                        <th><div>Product</div></th>
                    </tr>
                </thead>
                <tfoot>
                    <tr class='tr-title'>
                        <th>Value</th>
                        <th>Resources 1</th>
                        <th>Resources 2</th>
                        <th>Resources 3</th>
                        <th>Product</th>
                    </tr>
                </tfoot>
                <tbody id="crafting"></tbody>
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
          data.crafting.elements.forEach(function(item, index) {
              if (!isEmpty(item.resources_3)) {
                  $("#crafting").append(
                      '<tr>  <td onclickc="getText(\''+item.value+'\')">' +
                      item.value +
                      '</td> <td onclickc="getText(\''+item.resources_1+'\')"><img src="uploads/' +
                      item.resources_1.replace(/ /g, "-").toLowerCase() +
                      '80.png" /><span>' +
                      item.resources_1 +
                      " " +
                      item.resources_1_num.replace(/one/g, "") +
                      '</span></td> <td onclickc="getText(\''+item.resources_2+'\')"><img src="uploads/' +
                      item.resources_2.replace(/ /g, "-").toLowerCase() +
                      '80.png" /><span>' +
                      item.resources_2 +
                      " " +
                      item.resources_3_num.replace(/one/g, "") +
                      '</span></td> <td onclickc="getText(\''+item.resources_3+'\')"><img src="uploads/' +
                      item.resources_3.replace(/ /g, "-").toLowerCase() +
                      '80.png" /><span>' +
                      item.resources_3 +
                      " " +
                      item.resources_3_num.replace(/one/g, "") +
                      '</span></td> <td onclickc="getText(\''+item.product+'\')"><img src="uploads/' +
                      item.product.replace(/ /g, "-").toLowerCase() +
                      '80.png" /><span>' +
                      item.product +
                      '</span></td></tr>'
                  );
              } else if (!isEmpty(item.resources_2)) {
                  $("#crafting").append(
                      '<tr>  <td onclickc="getText(\''+item.value+'\')">' +
                      item.value +
                      '</td>  <td onclickc="getText(\''+item.resources_1+'\')"><img src="uploads/' +
                      item.resources_1.replace(/ /g, "-").toLowerCase() +
                      '80.png" /><span>' +
                      item.resources_1 +
                      " " +
                      item.resources_1_num.replace(/one/g, "") +
                      '</span></td> <td onclickc="getText(\''+item.resources_2+'\')"><img src="uploads/' +
                      item.resources_2.replace(/ /g, "-").toLowerCase() +
                      '80.png" /><span>' +
                      item.resources_2 +
                      " " +
                      item.resources_2_num.replace(/one/g, "") +
                      '</span></td> <td></td> <td onclickc="getText(\''+item.product+'\')"><img src="uploads/' +
                      item.product.replace(/ /g, "-").toLowerCase() +
                      '80.png" /><span>' +
                      item.product +
                      '</span></td> </tr>'
                  );
              } else {
                  $("#crafting").append(
                      '<tr>  <td onclickc="getText(\''+item.value+'\')">' +
                      item.value +
                      '</td> <td onclickc="getText(\''+item.resources_1+'\')"><img src="uploads/' +
                      item.resources_1.replace(/ /g, "-").toLowerCase() +
                      '80.png" /><span>' +
                      item.resources_1 +
                      " " +
                      item.resources_1_num.replace(/one/g, "") +
                      '</span></td> <td></td> <td></td> <td onclickc="getText(\''+item.product+'\')"><img src="uploads/' +
                      item.product.replace(/ /g, "-").toLowerCase() +
                      '80.png" /><span>' +
                      item.product +
                      '</span></td> </tr>'
                  );
              }
    
              itemsProcessed++;
              if (itemsProcessed === data.crafting.elements.length) {
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
                  [0, "desc"]
              ],
              lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
              pageLength: 100,
              language: {
                  searchPlaceholder: "Search",
                  search: '<a class="clearSearch" onclickc="clearSearch()"><i class="fa fa-times" aria-hidden="true"></i></a>'
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
<script src="https://cdnjs.cloudflare.com/ajax/libs/tabletop.js/1.5.1/tabletop.min.js"></script>
