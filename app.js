var express = require("express");
var bP = require("body-parser");
var mongoose = require("mongoose");
var request = require("request");
var async = require("async");
var https = require('https');
var fs = require('fs');
var jsonfile = require("jsonfile");
var app = express();
var temp = "https://api.deckbrew.com/mtg/cards?";
var searchValue = "";
var cards = "";
var allSets = [];
var finalTemp = [];
var autoComplete = new Array();
var allCards = require("./json/AllCards.json");
var temporary = "";
// Temporary Attributes
var tempAttr = {name: "coll", power_From: 9, power_To: 10, toughness_From: 7, toughness_To: 9};

app.set("view engine", "ejs");
app.use(bP.urlencoded({extended: true}));
app.use(express.static("public"));
var emitters = require('events').EventEmitter;
emitters.defaultMaxListeners = 200;
// getAllCards();
getAllSets();
getAllCardNames();
matchStats(allCards, tempAttr);

app.get("/", function(req, res){
    cards = "";
    res.render("index", {cards: cards, allCards: autoComplete});
});

app.get("/search", function(req, res){
    var body = req.query;
    if(!body.cardName){
        var searchVal = (temp + temporary);
    }else{
        var searchVal = (temp + "name=" + body.cardName);
    }
    console.log(searchVal);
    request(searchVal, function(err, values){
        if(err){
            console.log(err);
        }else{
            temporary = "";
            cards = JSON.parse(values.body);
            res.render("index", {cards: cards, allCards: autoComplete});
        }
    });
});

app.get("/advancedSearch", function(req, res){
    res.render("advancedSearch", {sets: allSets, allCards: autoComplete});
});

app.post("/advancedSearch", function(req, res){
    var temp = req.body;
    var xyz = [];
    for(var k in temp) xyz.push(k);
    for(var i = 0; i < Object.keys(temp).length; i++){
        // console.log(xyz[i]);
        if(xyz[i]){
            if(typeof(temp[xyz[i]]) === "object"){
                for(var j = 0; j < temp[xyz[i]].length; j++){
                    if(temporary != ""){
                        temporary += ("&" + xyz[i] + "=" + temp[xyz[i]][j]);
                    }else{
                        temporary += (xyz[i] + "=" + temp[xyz[i]][j]);
                    }
                }
            }else{
                console.log(xyz[i]);
                if((xyz[i] == "powerFrom") || (xyz[i] == "powerTo") || (xyz[i] == "toughnessFrom") || (xyz[i] == "toughnessTo") || (xyz[i] == "costFrom") || (xyz[i] == "costTo")){
                    
                }else{
                    if(temp[xyz[i]] == ""){
                        
                    }else{
                        if(temporary != ""){
                            temporary += ("&" + xyz[i] + "=" + temp[xyz[i]]);
                        }else{
                            temporary += ( xyz[i] + "=" + temp[xyz[i]]);
                        }
                    }
                }
            }
        }
    }
    // console.log(temporary);
    res.redirect("/search");
});

app.get("/sets/:setName", function(req, res){
    var search = ("https://api.deckbrew.com/mtg/cards?set=" + req.params.setName);
    request(search, function(err, card){
        if(err){
            console.log("Cannot find set with id: " + req.params.setName);
        }else{
            card = JSON.parse(card.body);
            res.render("setDetails", {cards: card, allCards: autoComplete});
        }
    });
});

app.get("/:id/details", function(req, res){
    var search = ("https://api.deckbrew.com/mtg/cards?multiverseid=" + req.params.id);
    request(search, function(err, card){
        if(err){
            console.log("Cannot find card with Id: " + req.params.id);
        }else{
            card = JSON.parse(card.body);
            prepareText(card);
            res.render("details", {cards: card, allCards: autoComplete});
        }
    });
});

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("MTG Searver started...");
});

// Prepare text for display
function prepareText(card){
    var value = "";
    
    //Cost processing
    var text = card[0].cost;
    text = text.replace(/\{X\}/g, "<img src='http://eakett.ca/mtgimage/symbol/mana/x.svg' width='17px'>")
        .replace(/\{C\}/g, "<img src='https://hydra-media.cursecdn.com/mtgsalvation.gamepedia.com/1/1a/C.svg' width='17px'>")
        .replace();
    var testSymbol = "";
    for(var i = 0; i < text.length; i++){
        if(text[i] == "{"){
            if(text[i + 4] == "}"){
                testSymbol = ("{" + text[i + 1] + "/" + text[i + 3] + "}");
                text = text
                    .replace(testSymbol, ("<img src='http://eakett.ca/mtgimage/symbol/mana/" + text[i + 1].toLowerCase() + text[i + 3].toLowerCase() + ".svg' width='17px'>"))
                    .replace();
            }else{
                testSymbol = ("{" + text[i + 1] + "}");
                text = text.replace(testSymbol, ("<img src='http://eakett.ca/mtgimage/symbol/mana/" + text[i + 1].toLowerCase() + ".svg' width='17px'>"));
            }
        }
    }
    card[0].cost = text;
    
    //Details text processing
    text = card[0].text;

    text = text.replace(/\{T\}/g, "<img src='http://www.eakett.ca/mtgimage/symbol/other/t.svg' width='17px'>")
        .replace(/X/g, "<img src='http://eakett.ca/mtgimage/symbol/mana/x.svg' width='17px'>")
        .replace(/\{C\}/g, "<img src='https://hydra-media.cursecdn.com/mtgsalvation.gamepedia.com/1/1a/C.svg' width='17px'>")
        .replace();
        
    //Mana Symbols
    value = "";
    var symbol = ""; 
    for(var i = 0; i < text.length; i++){
        if(text[i]== "{"){
            symbol = ("{" + text[i + 1] + "}");
            text = text.replace(symbol, ("<img src='http://eakett.ca/mtgimage/symbol/mana/" + text[i + 1].toLowerCase() + ".svg' width='17px'>"));
        }
    }
    
    //Italic text
    value = "";
    for(var i = 0; i < text.length; i++){
        value += text[i];
        if(text[i] == "("){
            value += "<em>";
        }else if(text[i] == ")"){
            value += "</em>";
        }
    }
    text = value;
    
    //Text new Lines
    text = text.replace(/\n/g, "<br>");
    
    card[0].text = text;
}

//REFACTOR!!!
// Get all MTG sets for Advanced Search
function getAllSets(){
    request("https://api.deckbrew.com/mtg/sets", function(err, sets){
        if(err){
            console.log("Cannot get all sets!!!");
        }else{
            allSets = JSON.parse(sets.body);
        }
    })
}

function getAllCards(){
    var requests = [];
    for(var i = 0; i < 175; i++){
        requests.push(("https://api.deckbrew.com/mtg/cards?page=" + i));
    }
    // console.log(requests);
    async.map(requests, function(obj, callback) {
      // iterator function
      request(obj, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          // transform data here or pass it on
        //   body.replace(/\]\[/g, ",");
            var body = JSON.parse(body.replace(/\]\[/g, ","));
            callback(null, body);
        } else {
          callback(error || response.statusCode);
        }
      });
    }, function(err, results) {
      // all requests have been made
      if (err) {
        // handle your error
      } else {
        for (var i = 0; i < results.length; i++) {
            fs.appendFile("./json/AllCards.json", JSON.stringify(results[i], null, 4),  function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            });
        }
      }
    });
}

// All card names for Autocomplete
function getAllCardNames(){
    for(var item in allCards){
        var tempExist = allCards[item].name.replace(/\'/g, "");
        autoComplete.push("'" + tempExist + "'");
    }
}

function matchStats(collection, attribs){
    var matched = 0;
    for(var item in collection){
        for(var attr in attribs){
            var index = attr.indexOf("_");
            var tempName = attr.substr(0, index);
            var tempTerm = attr.substr(index, attr.length);
            if(attribs[(tempName + "_From")]){
                console.log("STEP1");
                // if(attr == (tempName + "_To")){
                if(attribs[(tempName + "_To")]){
                    console.log("STEP2");
                    if((collection[item][tempName] >= attribs[(tempName + "_From")]) && (collection[item].power <= attribs[(tempName + "_To")])){
                        matched++;
                    }
                }else{
                    if(collection[item][tempName] >= attribs[(tempName + "_From")]){
                        matched++;
                    }
                }
            }else if(attr[(tempName + "_To")]){
                if(collection[item][tempName] <= attribs[(tempName + "_To")]){
                        matched++;
                    }
            }
        }
        // console.log(matched);
        if(matched == attribs.length){
            console.log(collection[item].name);
        }else{
            
        }
    }
}

// function matchStats(collection, attribs){
//     var matched = 0;
//     for(var item in collection){
//         if(attribs.powerFrom){
//             if(attribs.powerTo){
//                 if((collection[item].power >= attribs.powerFrom) && (collection[item].power <= attribs.powerTo)){
//                     matched++;
//                 }
//             }else{
//                 if((collection[item].power >= attribs.powerFrom) && (collection[item].power <= attribs.powerTo)){
//                     matched++;
//                 }
//             }
//         }
//         if(attribs.)
//     }
// }
