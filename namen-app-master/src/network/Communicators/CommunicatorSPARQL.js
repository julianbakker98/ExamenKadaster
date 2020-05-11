import {
    processSearchScreenResults,
    processGetAllAttributes,
    clusterObjects,
    firstLetterCapital
} from "../ProcessorMethods";

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

    //doe hierna 2 queries. Eentje voor exacte match
    let exactMatch = await queryEndpoint(nameQueryExactMatch(firstLetterCapital(text)), url);

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

    console.log(exactMatch);

    if(exactMatch.results.bindings.length === 4000){
        isMax = true;
    }

    exactMatch = await makeSearchScreenResults(exactMatch, url);

    //als de gebruiker alleen een exact querie wou, dan eindigt het hier.
    if (isExactMatch) {
        return clusterObjects(exactMatch, text, setResFromOutside);
    }

    //Doe hierna nog een query voor dingen die op de ingetypte string lijken.
    let result = await queryEndpoint(nameQueryForRegexMatch(text, exactMatch), url);

    //als de gebruiker iets nieuws heeft ingetypt geef dan undefined terug.
    if (latestString !== text) {
        return undefined;
    } else if (result.status > 300) {
        return "error";
    }

    //zet netwerk res om in een array met Resultaat.js
    result = await result.text();
    result = await makeSearchScreenResults(JSON.parse(result), url);

    //voeg de arrays samen.
    let res = mergeResults(exactMatch, result);

    //cluster ze en stuur ze terug.
    return clusterObjects(res, text, setResFromOutside, isMax);
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
       // string += `<${results[i].sub.value}>`;
        string += `<${results[i].x.value}>`;
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
function nameQueryExactMatch(query) {
    // return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    //         PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    //             PREFIX brt: <http://brt.basisregistraties.overheid.nl/def/top10nl#>
    //
    //         SELECT distinct * WHERE {
    //           {?sub brt:naamNL "${query}"@nl.} union {?sub brt:naam "${query}"@nl.} union {?sub brt:naamFries "${query}"@fy.} UNION {?sub brt:brugnaam "${query}"@nl}  UNION {?sub brt:tunnelnaam "${query}"@nl} UNION {?sub brt:sluisnaam "${query}"@nl} UNION {?sub brt:knooppuntnaam "${query}"@nl} UNION {?sub brt:naamOfficieel  "${query}"@nl} UNION {?sub brt:naamOfficieel "${query}"@fy}
    //         }
    //         LIMIT 4000

    return `PREFIX bag: <http://bag.basisregistraties.overheid.nl/def/bag#>
SELECT ?x WHERE {
 ?x a bag:Pand.
 ?x bag:oorspronkelijkBouwjaar ?bouwjaar.
 FILTER (?bouwjaar = 1923)
}
LIMIT 100`
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

    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX brt: <http://brt.basisregistraties.overheid.nl/def/top10nl#>
            
            SELECT distinct ?sub WHERE {
            { ?sub brt:naam ?label } UNION { ?sub brt:naamNL ?label } UNION {?sub brt:naamFries ?label} UNION {?sub brt:brugnaam ?label}  UNION {?sub brt:tunnelnaam ?label} UNION {?sub brt:sluisnaam ?label} UNION {?sub brt:knooppuntnaam ?label} UNION {?sub brt:naamOfficieel ?label}.
              
              filter( ?sub not IN(${uris})).
              FILTER(REGEX(?label, "${queryString}", "i")).
            }
            LIMIT 1000
            `
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
