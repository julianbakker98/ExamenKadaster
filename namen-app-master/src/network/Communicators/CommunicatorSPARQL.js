import {
    processSearchScreenResults,
    processGetAllAttributes,
    clusterObjects,
    firstLetterCapital
} from "../ProcessorMethods";
import Resultaat from "../../model/Resultaat";
import * as wellKnown from "wellknown";

/**
 * Dit is het laatst ingetype string. zorgt ervoor dat je niet vorige resultaten rendert
 * @type {string}
 */
let latestString = "";

/**
 * Vind een match. Dit zoekt op exact en contains.
 * Als je het opnieuw wilt implementeren moet deze er in blijven.
 * Je zal een string krijgen die door de gebruiker ingetypte search query bevat.
 *
 * @param text de geschreven text.
 * @param url
 * @param setResFromOutside de methode om res van buitenaf te zetten. Dit is bijvoorbeeld handig met het clusteren. Je
 * moet wel "waiting" teruggeven als string als je dit wilt gebruiken.
 * @returns {Promise<string|undefined>} Undefined wanneer de fetch request veroudert is en een array met Resultaat.js als
 * de query nog niet veroudert is, Kan ook de string "error" terug krijgen. Dit is wanneer er een netwerk error is.
 */
export async function getMatch(text, url, setResFromOutside) {
    //check of de gebruiker een exact only querie heeft geschreven.
    let isExactMatch = text.match(/".*"/);
    let isMax = false;

    text = text.replace(/"/g, "");

    //update eerst de laatst ingetype string
    latestString = text;
    // zoekresultaat word gesplitst
    const textSplit = text.split(" ");

    // -1 pakt laatste waarde uit array, dus huisnummer als die als laatste word getypt
    // resulaten worden samengevoegd behalve -1 (huisnummer), dit gebeurd als er meerdere losse woorden in een
    // straatnaam staan.
    let streetName = "", houseNumber = "";
    if (textSplit.length === 1) {
        streetName = firstLetterCapital(textSplit.join(" "));
    }
    if (textSplit.length > 1) {
        houseNumber = textSplit.slice(-1).pop();
        streetName = firstLetterCapital(textSplit.slice(0, -1).join(" "));
    }

    const objects = [];
    if (streetName) {
        let exactMatch = await queryEndpoint(queryBag(streetName, houseNumber), url);

        //als de gebruiker iets nieuws heeft ingetypt geef dan undefined terug.
        if (latestString !== text) {
            return undefined;
        } else if (exactMatch.status > 300) {
            //bij een network error de string error
            return "error";
        }

        //zet deze om in een array met Resultaat.js
        exactMatch = await exactMatch.text();
        exactMatch = JSON.parse(exactMatch);

        const bindings = exactMatch.results.bindings;
        for (let i = 0; i < bindings.length; i++) {
            const huisNummer = houseNumber ? houseNumber : bindings[i].huisnummer.value;

            const result = new Resultaat(
                bindings[i].nummeraanduiding.value,
                [streetName, huisNummer].join(" "),
                [bindings[i].postcode.value, bindings[i].woonplaats.value].join(" "),
                wellKnown.parse(bindings[i].shape.value),
                "blue",
                ""
            );

            objects.push(result);
        }
    }

    return objects;
}

/**
 * Functie die alle overige attributen ophaalt van het object.
 * De front end gebruikt deze functie voor het clicked resultaat scherm.
 *
 * Deze moet erin blijven als je het opnieuw wilt implmenteren.
 *
 * @param clickedRes een ClickedResultaat.js object die leeg is.
 * @param endpointurl
 * @returns {Promise<void>}
 */
export async function getAllAttribtes(clickedRes, endpointurl) {
    /**
     * Haal alle attributen van
     */
    let url = clickedRes.getUrl();

    let res = await queryEndpoint(allAttributesFromUrl(url), endpointurl);
    res = await res.text();
    res = JSON.parse(res);

    processGetAllAttributes(res, clickedRes);
}

/**
 * Maakt een lijst van Resultaat.js objecten uit de sparql query.
 * @param results
 * @param url
 * @returns {[]}
 */
async function makeSearchScreenResults(results, url) {
    results = results.results.bindings;

    if (results.length === 0) {
        return [];
    }

    let string = "";
    for (let i = 0; i < results.length; i++) {
        string += `<${results[i].shape.value}>`;
        //string += `<${results[i].x.value}>`;
    }

    let res = await queryEndpoint(queryBetterForType(string), url);

    //bij een network
    if (res.status > 300) {
        return [];
    }

    res = await res.text();
    res = JSON.parse(res);

    return processSearchScreenResults(res, latestString);
}

/**
 * Voeg resultaten samen op basis van uri
 * @param exact
 * @param regex
 * @returns {any[] | string}
 */
function mergeResults(exact, regex) {
    exact.forEach(resexact => {
            regex = regex.filter(resregex => {
                return resexact.getUrl() !== resregex.getUrl();
            });
        }
    );

    return exact.concat(regex);
}

/**
 * Methode om sparql endpoint te querien
 * @param query
 * @param url
 * @returns {Promise<Response>}
 */
export async function queryEndpoint(query, url) {
    return await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json'
        },
        body: query
    });

}

/**
 * Query om alle exacte matches op te halen
 * @param query
 * @returns {string}
 */
function queryBag(streetName, houseNumber) {

    let result;
    if (streetName && houseNumber) {
        result = `PREFIX bag: <http://bag.basisregistraties.overheid.nl/def/bag#>
                PREFIX geo: <http://www.opengis.net/ont/geosparql#>
                select * {
                  ?openbareRuimte
                    bag:bijbehorendeWoonplaats/bag:naamWoonplaats ?woonplaats;
                    bag:naamOpenbareRuimte "${streetName}".
                  ?nummeraanduiding
                    bag:bijbehorendeOpenbareRuimte ?openbareRuimte;
                    bag:huisnummer ${houseNumber};
                    bag:postcode ?postcode.
                  ?verblijfsobject
                    bag:hoofdadres ?nummeraanduiding;
                    bag:pandrelatering/geo:hasGeometry/geo:asWKT ?shape.
                }
                limit 1000`
    } else {
        result = `PREFIX bag: <http://bag.basisregistraties.overheid.nl/def/bag#>
                PREFIX geo: <http://www.opengis.net/ont/geosparql#>
                select * {
                  ?openbareRuimte
                    bag:bijbehorendeWoonplaats/bag:naamWoonplaats ?woonplaats;
                    bag:naamOpenbareRuimte "${streetName}".
                  ?nummeraanduiding
                    bag:bijbehorendeOpenbareRuimte ?openbareRuimte;
                    bag:huisnummer ?huisnummer;
                    bag:postcode ?postcode.
                  ?verblijfsobject
                    bag:hoofdadres ?nummeraanduiding;
                    bag:pandrelatering/geo:hasGeometry/geo:asWKT ?shape.
                }
                limit 1000`
    }

    return result;
}

    /**
     * Query om all regex matches op te halen.
     * @param queryString
     * @param exactvalues
     * @returns {string}
     */
    function nameQueryForRegexMatch(queryString, exactvalues) {
        let uris = [];
        exactvalues.forEach(res => {
            uris.push("<" + res.getUrl() + ">");
        });

        uris = uris.join(",");

        return ``
    }

    /**
     * Query om alle type en overige attributen op te halen van de eerder opgehaalde resultaten.
     * @param values
     * @returns {string}
     */
    export function queryBetterForType(values) {
        return `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX brt: <http://brt.basisregistraties.overheid.nl/def/top10nl#>
        PREFIX geo: <http://www.opengis.net/ont/geosparql#>
    
        SELECT * WHERE {
            VALUES ?s {
               ${values}
            }
            ?s a ?type.
    
      Optional{?s brt:naam ?naam.}.
      Optional{?s brt:naamNL ?naamNl.}.
      Optional{?s brt:naamFries ?naamFries}.
      Optional{?s brt:knooppuntnaam ?knooppuntnaam.}.
      Optional{?s brt:sluisnaam ?sluisnaam.}.
      Optional{?s brt:tunnelnaam ?tunnelnaam}.
      Optional{?s brt:brugnaam ?brugnaam.}.
      Optional{?s brt:naamOfficieel ?offnaam.}.
      Optional{?s geo:hasGeometry/geo:asWKT ?wktJson}.
      }
`
    }


    /**
     * Haal alle attributen van een object op.
     * @param namedNode
     * @returns {string}
     */
    function allAttributesFromUrl(namedNode) {
        return `PREFIX brt: <http://brt.basisregistraties.overheid.nl/def/top10nl#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

            SELECT * WHERE {
                <${namedNode}> ?prd ?obj.
            }`

}
