var width = 1000,
    height = 200;


var today = new Date();
var selection = [];
var timeScale = d3.time.scale()
                .domain([new Date("2016-01-01"), new Date("2016-12-31")])
                .rangeRound([25, 1175])
                .nice(d3.time.day);

// Бегунок
var svg = d3.select("#slider")
          .append("svg")
          .attr({
            width: 1200,
            height: height
          });
    
svg.append("line")
  .attr({
    x1: 25,
    y1: height / 2,
    x2: 1175,
    y2: height / 2,
  });

var circle = svg.append("circle")
              .attr({
                cx: timeScale(today),
                cy: height / 2,
                r: 10,
                fill: "#555"
              });
svg.append("text")
  .text(convertDate(today))
  .attr({
    x: timeScale(today) - 23,
    y: height / 2 - 17
    });

// Список районов и карта
var projection = d3.geo.mercator()
                      .center([27.9, 53.7])
                      .scale(4000)
                      .translate([330, 300]);

var path = d3.geo.path()
              .projection(projection);

var svg_map = d3.select("#map")
      .append("svg")
      .attr("width", width)
      .attr("height", 700);

function convertDate(d) {
    var months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    var month = d.getMonth();
    var date = d.getDate();
    return date + " " + months[month];
}


d3.csv("data/data.csv", function(error, data) {
    d3.json("data/rajony.geojson", function(json) {  
          d3.csv("data/goroda.csv", function(goroda) {

          function selectData(value) {
                selection = [];
                for (var i = 0; i < data.length; i++) {
                var newData = new Date(data[i].date);
                  if (newData.toDateString() == value.toDateString()) {
                    selection.push(data[i]);
                  }
                };
              return selection;
            }
                      
        var header = d3.select("#list")
                      .append("text");

        var rajony = d3.select("#list").append("g")
              .attr("class", "rajony")
              .attr("transform", "translate(" + 20 + ", " + 20 + ")")
              .append("ul");

          function dragListener(d) {
            var cx = +d3.select(this).attr("cx");
                      
        d3.select(this)
                  .attr({
                    cx: function(d) {
                      if (cx < 25) {
                        return 25;
                        } else if (cx > 1175) {
                        return 1175;
                      } else {
                        return cx + d3.event.dx;
                      }
                    }

        })
        
      var draggedDate = timeScale.invert(cx);
            
            selectData(draggedDate);
            
            map.attr("fill", function(d) { 
                    var color = "green";
                    d.properties.period = "";
                    for (var q = 0; q < selection.length; q++) {
                      if (d.properties.rajon == selection[q].district) {
                          color = "red";
                          d.properties.period = selection[q].period;
                        } else {
                          continue;
                      };
                    };
                    return color;
                    })
            .on("mouseover", function(d) {
                    var xPos = d3.event.pageX + "px";
                    var yPos = d3.event.pageY + "px";
                    d3.select("#tooltip")
                      .style("left", xPos)
                      .style("top", yPos)
                      .classed("hidden", false);
                    d3.select("#rajon")
                      .text(d.properties.rajon + " район");
                    if (d.properties.period != "") {
                    d3.select("#period")
                      .text("Продажа ограничена с " + d.properties.period);
                    } else {
                      d3.select("#period")
                      .text("Обычный режим продажи.");
                    };
                    })
                    .on("mouseout", function(d) {
                      d3.select("#tooltip")
                        .classed("hidden", true)
                      });
            
            cities.attr("fill", function(d) { 
                      var color = "green";
                      d.period = "";
                      for (var b = 0; b < selection.length; b++) {
                        if (d.city == selection[b].district) {
                            color = "red";
                            d.period = selection[b].period;
                          } else {
                            continue;
                        };
                      };
                      return color;
                      })
                  .on("mouseover", function(d) {
                    var xPos = d3.event.pageX + "px";
                    var yPos = d3.event.pageY + "px";
                    d3.select("#tooltip")
                      .style("left", xPos)
                      .style("top", yPos)
                      .classed("hidden", false);
                    d3.select("#rajon")
                      .text(d.city);
                      
                    if (d.period != "") {
                    d3.select("#period")
                      .text("Продажа ограничена с " + d.period);
                    } else {
                      d3.select("#period")
                      .text("Обычный режим продажи.");
                    };
                    })
                    .on("mouseout", function(d) {
                      d3.select("#tooltip")
                        .classed("hidden", true)
                      });
                      

            svg.select("text")
              .text(convertDate(draggedDate))
                .attr({
                  x: timeScale(draggedDate) - 23
                  });
            
            rajony.selectAll("li")
                .remove()
            
                if (selection.length > 0) {
              header.text("Продажа алкоголя ограничена в " + selection.length + " районах (городах):");
            } else {
              header.text("По всей республике действует обычный режим продажи.");
            };
            rajonyFiltered = selection.map(function(d) { return d.district; }).sort();
            rajony.selectAll("li")
                .data(rajonyFiltered)
                .enter()
                .append("li")
                .text(function(d) { return d });
          }
          
            var drag = d3.behavior.drag()
                        .on("drag", dragListener);
                    
            selectData(today);
            
            if (selection.length > 0) {
              header.text("Продажа алкоголя ограничена в " + selection.length + " районах (городах):");
            } else {
              header.text("По всей республике действует обычный режим продажи.");
            };
            rajonyFiltered = selection.map(function(d) { return d.district; }).sort();
            rajony.selectAll("li")
                .data(rajonyFiltered.sort())
                .enter()
                .append("li")
                .text(function(d) { return d });

            var map = svg_map.selectAll("path")
                .data(json.features);
                
                map.enter()
                  .append("path")
                  .attr("d", path)
                  .attr("fill", function(d) {
                      var color = "green";
                      for (var q = 0; q < selection.length; q++) {
                        if (d.properties.rajon == selection[q].district) {
                            color = "red";
                            d.properties.period = selection[q].period;
                          } else {
                            continue;
                        };
                      };
                      return color;
                      })
                  .on("mouseover", function(d) {
                    var xPos = d3.event.pageX + "px";
                    var yPos = d3.event.pageY + "px";
                    d3.select("#tooltip")
                      .style("left", xPos)
                      .style("top", yPos)
                      .classed("hidden", false);
                    d3.select("#rajon")
                      .text(d.properties.rajon + " район.");
                    if (d.properties.period) {
                      d3.select("#period")
                      .text("Продажа ограничена с " + d.properties.period);
                    } else {
                      d3.select("#period")
                      .text("Обычный режим продажи.");
                    };
                    })
                    .on("mouseout", function(d) {
                      d3.select("#tooltip")
                        .classed("hidden", true)
                      });
          
            var cities = svg_map.selectAll("circle")
                          .data(goroda);
                    
                    cities.enter()
                       .append("circle")
                       .attr("class", "city")
                       .attr("cx", function(d) {
                         return projection([d.lon, d.lat])[0];
                       })
                       .attr("cy", function(d) {
                         return projection([d.lon, d.lat])[1];
                       })
                       .attr("r", function(d) {
                         if (d.city == "Минск") {
                           return 8;
                         } else {
                           return 6;
                         };})
                       .attr("fill", function(d) { 
                                var color = "green";
                                for (var q = 0; q < selection.length; q++) {
                                  if (d.city == selection[q].district) {
                                      color = "red";
                                      d.period = selection[q].period
                                    } else {
                                      continue;
                                  };
                                };
                                return color;
                                })               
                       .style("stroke", "white")
                       .style("stroke-width", "2px")
                  .on("mouseover", function(d) {
                    var xPos = d3.event.pageX + "px";
                    var yPos = d3.event.pageY + "px";
                    d3.select("#tooltip")
                      .style("left", xPos)
                      .style("top", yPos)
                      .classed("hidden", false);
                    d3.select("#rajon")
                      .text(d.city );
                    if (d.period) {
                      d3.select("#period")
                      .text("Продажа ограничена с " + d.period);
                    } else {
                      d3.select("#period")
                      .text("Обычный режим продажи.");
                    };
                      })
                    .on("mouseout", function(d) {
                      d3.select("#tooltip")
                        .classed("hidden", true)
                      });
                  
          circle.call(drag);
  });
  });

});
