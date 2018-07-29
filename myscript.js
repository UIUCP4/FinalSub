const height = 1000,
    width = 1000;

var svg = d3.select("svg");


svg.attr('height', height).attr('width', width);

const
    margin = {top: 20, left: 30, right: 50},
    dim = {
        barChart: {
            y: margin.top,
            height: height / 3 - margin.top,
            width: width - margin.left - margin.right,
        },
        bubbleChart: {
            y: height / 3 + margin.top,
            height: height / 3 - margin.top,
            width: width - margin.left - margin.right,
        }
    },
    barChart = svg.append("g").classed("barChart", true).attr('transform', `translate(${margin.left} ,${dim.barChart.y} )`)
    bubbleChart = svg.append("g").classed("bubbleChart", true).attr('transform', `translate(${margin.left} ,${dim.bubbleChart.y} )`);
    barTooltipDiv = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

const bubbleTooltipDiv = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);



// x0 and x1
/*
We have 3 dimension:
1: value of import/export (Y Axis)
2. Country (X -> Group of columns. They move across X axis as groups. What drives? the country Index or the group index)
3. Country's Import/Export (X -> The individual columns. Driven by: if its a import or export. (0 or 1)

*
*/
var x0 = d3.scaleBand()
// rangeRound works exactly like range but rounds of the value
    .rangeRound([0, dim.barChart.width])
    // Account for padding
    .paddingInner(0.1);

var x1 = d3.scaleBand()
    .padding(0.05);

var y = d3.scaleLinear()
    .range([dim.barChart.height, 0]);

var colors = d3.scaleOrdinal()
    .range(["pink", "#8a89a6"]);


const xAxis = d3.axisBottom(x0),
    yAxis = d3.axisRight(y);

barChart.append('g').classed("x-axis", true).attr('transform', `translate(0,${dim.barChart.height} )`).call(xAxis);
svg.append("text") 
.attr("x", 500 )
        .attr("y", 370 )
        .attr("font-family", "Calibri")
        .attr("font-size", "14")
        .attr("font-weight", "bold")
        .style("text-anchor", "middle")
        .style("fill", "red")
.text("Country");

barChart.append('g').classed("y-axis", true).attr('transform', `translate(${dim.barChart.width},0 )`).call(yAxis)
svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 980)
        .attr("x",0 - (height / 6))
        .attr("dy", "1em")
        .attr("font-family", "Calibri")
        .attr("font-size", "16")
        .attr("font-weight", "bold")
        .style("text-anchor", "middle")
        .style("fill", "red")
        .text("Export/Import quantity (in 1000 tonnes)");

const columns = ["Area", "Element", "Item", "Y2013"];
let dataStash = [];
const Items = []
d3.csv('data.csv', function(error, data) {
        data.forEach(d => {
            if (!d.Area) return;
            let elm = dataStash.filter(v => v.Area === d.Area);
            if (elm.length === 0) {elm = {"Area": d.Area, "Export Quantity":{}, "Import Quantity": {}}; dataStash.push(elm) }
            else {elm = elm[0]}
            elm[d.Element][d.Item] = {
                "2009": d["Y2009"], "2010": d["Y2010"], "2011": d["Y2011"], "2012": d["Y2012"], "2013": d["Y2013"]
            }
            if (!Items.includes(d.Item)){
                Items.push(d.Item)
            }
        })
    console.log(dataStash[0])
    draw()

    }
);

function getButtons() {
    d3.select("div#buttons")
        .selectAll("buttons")
        .data(Items)
        .enter()
        .append("button")
        .html(d => d)
        .on("click", function (d) {
            const years = document.getElementById('years');
            let year;
            for(let i = 0; i < years.length; i++){
                if(years[i].checked){
                    year = years[i].value;
                }
            }
            console.log(year)
            draw(year, d)
        })
}
let currentItem = "Total";

function draw(year=null, item=null, area=null) {
    if (!item) {item = currentItem}
    currentItem = item;
    if (!year){
        year = getYear()
    }
    d3.select("body").select("h2.bar").html(item + "(" + year + ")")
    const data = getChart(year, item);
    updateAxis(data, item);
    drawBars(data);


}
function getYear() {
    const years = document.getElementById('years');
    let year;
    for(let i = 0; i < years.length; i++){
        if(years[i].checked){
            year = years[i].value;
        }
    }
    return year
}

function getChart(year, item) {
    console.log(year, item)
    return dataStash.map(d => {
        return {
            country: d.Area,
            imports: d["Import Quantity"][item] ? d["Import Quantity"][item][year] : 0,
            exports: d["Export Quantity"][item] ? d["Export Quantity"][item][year] : 0,
        }
    })
}

function getItems(area, isImport) {
    const items = [];
    const year = getYear();
    const element = isImport ? "Import Quantity" : "Export Quantity";
    dataStash.map(d => {
        if (d.Area === area){
            for (let item in d[element]){
                if (item !== "Total")
                items.push(
                    {item:item, value:d[element][item][year]}
                )
            }
        }
    })
    d3.select("body").select("h2.bubble").html(area + "(" + element + ")")
    drawBubbles({children:items})
}

function updateAxis(data, item) {
    const countries = data.map(d => d.country);
    x0.domain(
        countries
    );

    x1.domain(['imports', 'exports']).rangeRound([0, x0.bandwidth()]);

    y.domain(yearsTotalYDomain(item)).nice();

    barChart.select("g.x-axis").transition().call(xAxis)
    barChart.select("g.y-axis").transition().call(yAxis)
}

function yearsTotalYDomain(item) {
    let maxVal = 0;
    dataStash.map(d => {
        for(let year in d["Import Quantity"][item]){
            let imp = parseInt(d["Import Quantity"][item][year]);
            let exp = parseInt(d["Export Quantity"][item][year]);
            if (imp > maxVal) {maxVal = imp}
            if (exp > maxVal) {maxVal = exp}
        }

    });
    return [0, maxVal]
}

function showBarTooltip(d, type) {
    let mouse = [d3.event.pageX, d3.event.pageY]
    barTooltipDiv
        .html(() => {
            let text = " for " + d.country + " observe the <br> food items in the bubble chart below based on<br>" + type 

            return text.trim()
        })
        .transition()
        .duration(1000)
        .style("opacity", 1)
        .style('left', (mouse[0] + 20) + 'px')
        .style('top', mouse[1] + 'px')
}

function drawBars(data) {

    const bar = barChart
        .selectAll('g.bar')
        .data(
            data
        );
    barChart.exit().remove();

    const barEnter = bar
        .enter()
        .append('g')
        .classed("bar", true)
        .attr('transform', d => `translate(${x0(d.country)}, 0)`)


    barEnter
        .each(function (d, i) {
            const selection = d3.select(this);
            ["imports", "exports"].forEach((type) => {
                selection
                .append("rect")
                .classed(type, true)
                .attr('x', x1(type))
                .attr('y', dim.barChart.height)
                .attr('height', 0)
                .attr('width', x1.bandwidth())
                .attr('fill', colors(d[type]))
                .style("cursor", "pointer")
                .append("title")
                .text(currentItem + "(" + type + "): " + d[type]);
        })
        });

    const barUpdate = barEnter.merge(bar);

    barUpdate
        .each(function (d, i) {
            const selection = d3.select(this);
            ["imports", "exports"].forEach((type) => {
                selection
                    .select("rect." + type)
                    .on("click", function (datum) {
                        getItems(d.country, type === "imports")
                        draw(null, "Total")
                        xBar = x0(d.country)
                        barChart.selectAll("rect").classed("clicked", false)
                        bubbleChart.selectAll("circle").classed("clicked", false)
                        d3.select(this).classed("clicked", true);
                        showBarTooltip(d, type)
                    })
                    .transition()
                    .duration(500)
                    .attr('x', x1(type))
                    .attr('y', y(d[type]))
                    .attr('height', dim.barChart.height - y(d[type]))
                    .attr('width', x1.bandwidth())
                    .attr('fill', colors(d[type]))
                    .select("title")
                    .text(currentItem + "(" + type + "): " + d[type]);
            })
        });


    console.log( `translate(0,${height})`);

    console.log('>>>', data)
}

function showBubbleTooltip(d) {

        let mouse = [d3.event.pageX, d3.event.pageY]
        bubbleTooltipDiv
            .html(() => {
                let text =" bar chart above showing<br> comparison of all countries based on food item<br> " + d.data.item

                return text.trim()
            })
            .transition()
            .duration(1000)
            .style("opacity", 1)
            .style('left', (mouse[0] + 20) + 'px')
            .style('top', mouse[1] + 'px')
}

function drawBubbles(dataset) {

    var diameter = 600;
    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var bubble = d3.pack(dataset)
        .size([diameter, diameter])
        .padding(1.5);


    var nodes = d3.hierarchy(dataset)
        .sum(function(d) { return d.value; });

    const data = bubble(nodes).descendants().filter(d => !d.children)

    var node = bubbleChart.selectAll("g.node")
        .data(data);

    node.exit().remove();

    let nodeEnter = node
        .enter()
        .append("g")
        .attr("class", "node")

    nodeEnter.append("title")


    nodeEnter.append("circle");


    nodeEnter.append("text")
        .classed("name", true)

    nodeEnter.append("text")
        .classed("value", true)


    const nodeUpdate = node.merge(nodeEnter);

    nodeUpdate
        .transition()
        .duration(700)
        .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

    nodeUpdate
        .select("title")
        .text(function(d) {
            return d.data.item + ": " + d.value;
        });

    nodeUpdate
        .select("circle")
        .on("click", function (d) {
            draw(null, d.data.item);
            barChart.selectAll("rect").classed("clicked", false)
            bubbleChart.selectAll("circle").classed("clicked", false)
            d3.select(this).classed("clicked", true)
            showBubbleTooltip(d)
        })
        .transition()
        .duration(700)
        .attr("r", function(d, i) {
            return d.r;
        })
        .style("fill", function(d,i) {
            return color(i);
        })

    nodeUpdate
        .select("text.name")
        .attr("dy", ".2em")
        .style("text-anchor", "middle")
        .text(function(d) {
            return d.data.item.substring(0, d.r / 3);
        })
        .attr("font-size", function(d){
            return d.r/5;
        })
        .attr("font-family", "sans-serif")
        .attr("fill", "white");

    nodeEnter
        .select("text.value")
        .attr("dy", "1.3em")
        .style("text-anchor", "middle")
        .text(function(d) {
            return d.data.value;
        })
        .attr("font-size", function(d){
            return d.r/5;
        })
        .attr("font-family", "sans-serif")
        .attr("fill", "white");

    d3.select(self.frameElement)
        .style("height", diameter + "px");
}

