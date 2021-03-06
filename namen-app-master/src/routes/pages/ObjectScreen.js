import React from 'react';
import Graph from "react-graph-vis";
import * as Communicator from '../../network/Communicator';

/**
 * Dit is het scherm dat het geklikte object laat zien.
 */
class ObjectScreen extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            res: undefined
        }
    }

    componentDidMount() {
        this.getNamenGegevens(this.props.clickedResult);
    }

    /**
     * Haal alle gegevens op van de clickedResult.
     * @param url
     */
    getNamenGegevens = (url) => {
        if (url) {
            Communicator.getAllAttribtes(this.props.clickedResult).then(res => {
                this.setState({
                    res: this.props.clickedResult,
                })
            });
        }
    };

    render() {
        let res = this.state.res;
        let naam;
        let type;
        let tableNamen;
        let tableRest;

        let houseNumberString = 'Huisnummer';
        let streetNameString = 'Straatnaam';
        let postalCodeString = 'Postcode';

        if (res) {
            if (res.getRes() && res.getRes().getNaam()) {
                streetNameString += '\n' + res.getRes().getNaam();
            }

            if(res.getNaam()){
                naam = (<h1>{res.getNaam()}</h1>);
            }else{
                if(res.getTunnelNaam()){
                    naam = (<h1>{res.getTunnelNaam()}</h1>);
                }else if(res.getKnooppuntNaam()){
                    naam = (<h1>{res.getKnooppuntNaam()}</h1>);
                }else if(res.getBrugNaam()){
                    naam = (<h1>{res.getBrugNaam()}</h1>);
                }else if(res.getSluisNaam()){
                    naam = (<h1>{res.getSluisNaam()}</h1>);
                }
            }

            let color;

            if(res.getColor()){
                color = {color: this.props.getHexFromColor(res.getColor(), true)};
            }

            type = (<h3 style={color}>{res.getTypeString()}</h3>);

            let naamNl;
            let naamFries;
            let naamOfficeel;
            let brugnaam;
            let sluisnaam;
            let knooppuntnaam;
            let tunnelnaam;

            if (res.getNaamFries()) {
                naamFries = (
                    <tr>
                        <td><b>Naam Fries:</b></td>
                        <td>{res.getNaamFries()}</td>
                    </tr>
                )
            }

            if(res.getNaamOfficieel()){
                naamOfficeel = (
                    <tr>
                        <td><b>Naam officieel:</b></td>
                        <td>{res.getNaamOfficieel()}</td>
                    </tr>
                )
            }

            if (res.getNaamNl()) {
                naamNl = (
                    <tr>
                         <td><b>Naam Nederlands:</b></td>
                         <td>{res.getNaamNl()}</td>
                     </tr>
                )
            }

            if (res.getTunnelNaam()) {
                tunnelnaam = (
                    <tr>
                        <td><b>Tunnel naam:</b></td>
                        <td>{res.getTunnelNaam()}</td>
                    </tr>
                )
            }

            if (res.getBrugNaam()) {
                brugnaam = (
                    <tr>
                        <td><b>Brug naam:</b></td>
                        <td>{res.getBrugNaam()}</td>
                    </tr>
                )
            }

            if (res.getSluisNaam()) {
                sluisnaam = (
                    <tr>
                        <td><b>Sluis naam:</b></td>
                        <td>{res.getSluisNaam()}</td>
                    </tr>
                )
            }

            if (res.getKnooppuntNaam()) {
                knooppuntnaam = (
                    <tr>
                        <td><b>Knooppunt naam:</b></td>
                        <td>{res.getKnooppuntNaam()}</td>
                    </tr>
                )
            }

            tableNamen = (
                <div>
                    <table className="namenTable">
                        <tbody>
                            {naamOfficeel}
                            {naamNl}
                            {naamFries}
                            {tunnelnaam}
                            {brugnaam}
                            {sluisnaam}
                            {knooppuntnaam}
                        </tbody>
                    </table>
                    <hr/>
                </div>
            );

            let attributes = res.getAttributes().map(res => {
                let value = res.value;

                if (res.key === "huisnummer") {
                    houseNumberString += '\n' + res.value;
                } else if (res.key === "postcode") {
                    postalCodeString += '\n' + res.value;
                }

                if(value.startsWith("http://")){
                    value = (<a href={value} target="_blank" rel = "noreferrer noopener">{value}</a>);
                }

                return (<tr key = {res.key + res.value}>
                    <td>{res.key}</td>
                    <td>{value}</td>
                </tr>)
            });

            tableRest = (
                <table className="attributeSectionObjectScreen">
                    <tbody>
                    {attributes}
                    </tbody>
                </table>
            )
        }

        const graph = {
            nodes: [
                { id: 1, font: { multi: true }, label: '<b>Woning</b>' },
                { id: 2, font: { multi: true }, label: '<b>Verblijfs Object</b>' },
                { id: 3, font: { multi: true }, label: houseNumberString },
                { id: 4, font: { multi: true }, label: 'Toevoeging huisnummer' },
                { id: 5, font: { multi: true }, label: '<b>Oppervlakte</b>' },
                { id: 6, font: { multi: true }, label: streetNameString },
                { id: 7, font: { multi: true }, label: postalCodeString },
                { id: 8, font: { multi: true }, label: 'Bouwjaar' },
                { id: 9, font: { multi: true }, label: '<b>Adres</b>' }
            ],
            edges: [
                { from: 9, to: 3 },
                { from: 1, to: 2 },
                { from: 3, to: 4 },
                { from: 1, to: 6 },
                { from: 1, to: 5 },
                { from: 9, to: 7 },
                { from: 7, to: 3 },
                { from: 1, to: 8 },
                { from: 1, to: 9},
            ]
        };

        const options = {
            physics: false,
            nodes: {
                shape: 'box',

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

        const events = {
            select: function(event) {
                var { nodes, edges } = event;
                console.log("Selected nodes:");
                console.log(nodes);
                console.log("Selected edges:");
                console.log(edges);
            }
        };

        return (
            <div className="objectScreen">
                <Graph graph={graph} options={options} events={events} style={{ height: "250px", width: "30vw" }} />
                {naam}
                {type}
                {tableNamen}
                {tableRest}
            </div>
        )
    }
}

export default ObjectScreen;