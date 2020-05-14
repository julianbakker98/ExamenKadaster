var nodes = new vis.DataSet([
    { id: 1, font: { multi: true }, label: '<b>Woning</b>' },
    { id: 2, font: { multi: true }, label: '<b>Verblijfs Object</b>' },
    { id: 3, font: { multi: true }, label: 'Huisnummer' },
    { id: 4, font: { multi: true }, label: 'Toevoeging huisnummer' },
    { id: 5, font: { multi: true }, label: '<b>Oppervlakte</b>' },
    { id: 6, font: { multi: true }, label: 'Straat Naam' },
    { id: 7, font: { multi: true }, label: 'Postcode' },
    { id: 8, font: { multi: true }, label: 'Bouwjaar' },
    { id: 9, font: { multi: true }, label: '<b>Adres</b>' }


]);


var edges = new vis.DataSet([
    { from: 9, to: 3 },
    { from: 1, to: 2 },
    { from: 3, to: 4 },
    { from: 1, to: 6 },
    { from: 1, to: 5 },
    { from: 9, to: 7 },
    { from: 7, to: 3 },
    { from: 1, to: 8 },
    { from: 1, to: 9},


]);

var data = {
    nodes: nodes,
    edges: edges
};
var options = {
    physics: false,
    nodes: {
        shape: 'box',
        size: 50,

        font: {
            boldital: { color: 'black' },
            ital: { color: 'black' },
            mono: { color: 'black' },
            bold: { color: 'black' },
            color: 'black',
        },
        color: "skyblue"
    },
    edges: {
        arrows: 'to',
        smooth: false
    },
};
var container = document.getElementById('mynetwork');
var network = new vis.Network(container, data, options);


//vanaf hier test
const url = 'https://api.labs.kadaster.nl/datasets/kadaster/bag/services/bag/sparql'; //url zetten
fetch(url) //verbinding maken met url
    .then((resp) => resp.json()) // data van api/url naar json omzetten
    .then(function(data) {
    })

function createNode(element) {
    return document.createElement(element); // Maak een Element dat je doorgeeft in de parameters
}

function append(parent, el) {
    return parent.appendChild(el); // Voeg de tweede parameter (element) toe aan de eerste
}