---
title: Crafting Calculator | No Man's Sky Crafting Calculator,  Refiner Recipes, Crafting
  Guide and Cooking Guide
permalink: "/calculator"
position: 1
description: No Man's Sky Crafting Calculator
type: calc
page_id: calc
layout: page
---

<div class="card mb-3" id="slotWrapper">
    <div class="card-header">
        <img src="uploads/calc.png" />
        <span>Crafting Calculator</span>
    </div>
    <div class="card-body" id="accordian">
        <div id="loading" class="text-center" style="padding: 2rem">
            <img src="uploads/loading.gif" width="50"/>
        </div>
        <ul class="parts"></ul>
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

        var result = data.calc.elements.map(function(e) { return e.name; }).indexOf('Iridesite');
        data.calc.elements.forEach(function(item, index) {
            let str = item.parts;
            let parts = str.length ? str.split(",") : null;
            let raw = []

            function getParts(p, depth, name, q) {
                if (!q)
                    q = 1

                return `
                    <ul class="parts-list">
                        ${depth ? '<div class="q mb-3">Quantity: <div class="qw pl-2"><span class="minus">-</span><input type="number" name="quantity" min="1" value="1"><span class="plus">+</span></div></div>' : ''}

                        ${p.map(part => `<li>${data.calc.elements[data.calc.elements.map(function(e) { return e.name; }).indexOf(part.split(":")[0])].parts ? '<a href="#">' : ''}<img src="uploads/${part.split(":")[0].replace(/\s/g, '-').toLowerCase()}80.png" width="40" alt="${part.split(":")[0]}" />${part.split(":")[0]}${q*part.split(":")[1] ? ` x&nbsp;<span class="quantity" data-quantity="${q*part.split(":")[1]}">${q*part.split(":")[1]}${data.calc.elements[data.calc.elements.map(function(e) { return e.name; }).indexOf(part.split(":")[0])].parts ? '</span><i class="fas fa-fw fa-plus" aria-hidden="true"></i></a>' : ''}` : ` x&nbsp;<span class="quantity" data-quantity="${q* part.split(":")[1]}">1</span>${data.calc.elements[data.calc.elements.map(function(e) { return e.name; }).indexOf(part.split(":")[0])].parts ? '<i class="fas fa-fw fa-plus" aria-hidden="true"></i></a>' : ''}` }

                        ${data.calc.elements[data.calc.elements.map(function(e) { return e.name; }).indexOf(part.split(":")[0])].parts ? getParts(data.calc.elements[data.calc.elements.map(function(e) { return e.name; }).indexOf(part.split(":")[0])].parts.split(","), false, null, part.split(":")[1]) : raw[raw.map(function(e) { return e.name; }).indexOf(part.split(":")[0])] ? `<span class="remove d-none">${raw[raw.map(function(e) { return e.name; }).indexOf(part.split(":")[0])].quantity += parseInt(q* part.split(":")[1])}</span>` : `<span class="remove d-none">${raw.push({name: part.split(":")[0], quantity: parseInt(q*part.split(":")[1])})}</span>`}</li>`).join("")}

                        ${depth ? `<div class="total"><h6>Raw Materials: </h6></div><ol class="${name}-total"></ol>` : ''}
                    </ul>
                `;
            }

            if(item.parts) {
                $(".parts").append(
                    `<li class='part'>

                        <a href="#"><img src="uploads/${item.name.replace(/\s/g, '-').toLowerCase()}80.png" width="60" alt="${item.name}" />${item.name}</a>
                        <i title="Expand all" class="fas fa-fw fa-plus expand ml-2" aria-hidden="true"></i>
                        ${parts ? getParts(parts, true, item.name.replace(/\s/g, '-').toLowerCase()) : ""}

                    </li> `
                );
            }

            let n = item.name.replace(/\s/g, '-').toLowerCase()
            raw.sort(function(a, b){
                if(a.name < b.name) { return -1; }
                if(a.name > b.name) { return 1; }
                return 0;
            })
            raw.forEach(function(item, index) {
                $(`.${n}-total`).append(`<li class="p-2" style="background: ${getColor(item.name)}"><img src="uploads/${item.name.replace(/\s/g, '-').toLowerCase()}80.png" width="30" alt="${item.name}" /> ${item.name} x <span class="quantity" data-quantity="${item.quantity}"> ${item.quantity}</span></li>`);
            });
            $(".remove").remove()

            itemsProcessed++;
            if (itemsProcessed === data.calc.elements.length) {

                $("#loading").remove();
                $(".loading").removeClass('loading');

                $("#accordian a").click(function(e) {
                    e.preventDefault();
                    var link = $(this);
                    if(link.hasClass('active')) {
                        if(link.parent().hasClass('part')) {
                            link.parent().find("ul").slideUp(300, function() {
                                link.removeClass('active')
                                link.parent().find("a").removeClass('active')
                                link.parent().removeClass('active')
                            });
                        } else {
                            link.nextAll("ul").slideUp(300, function() {
                                link.removeClass('active')

                            });
                        }
                    } else {
                        link.nextAll("ul").slideDown(300, function() {
                            link.addClass('active');
                        });
                    }
                })

                $( ".expand" ).click(function(e) {
                    e.preventDefault();
                    if($(this).hasClass('active')) {
                        $(this).parent().find(".parts-list").slideUp(300, function() {
                            $(this).parent().find(".expand").removeClass('active')
                            $(this).parent().find("a").removeClass('active')
                        });
                    } else {
                        $(this).parent().find(".parts-list").slideDown(300, function() {
                            $(this).parent().find(".expand").addClass('active')
                            $(this).parent().find("a").addClass('active')
                        });
                    }

                });

                $("input[name='quantity']").change(function(){
                    let that = $(this);
                    let f = $(this).parent().parent().parent().find("[data-quantity]");
                    f.each(function( index ) {
                        $(this).text(" " + $( this ).data("quantity") * that.val())
                    });
                });

                $('.minus').click(function () {
                    var $input = $(this).parent().find('input');
                    var count = parseInt($input.val()) - 1;
                    count = count < 1 ? 1 : count;
                    $input.val(count);
                    $input.change();
                    return false;
                });
                $('.plus').click(function () {
                    var $input = $(this).parent().find('input');
                    $input.val(parseInt($input.val()) + 1);
                    $input.change();
                    return false;
                });

            }
        });
    }
    window.addEventListener("DOMContentLoaded", init);
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/tabletop.js/1.5.1/tabletop.min.js"></script>