var lock_preview = false,
	current_category,
    current_indicator,
	main_data;

// Карта предпросмотра с областями и Минском
var preview_map_projection = d3.geoMercator()
                   .center([27.9, 53.7])
                   .scale(2200);
var preview_map_path = d3.geoPath()
    .projection(preview_map_projection);

// Меню графика: селектор регионов и индикаторов
var grafik_subject_selector = d3.select("#grafik")
	.append("select")
	.attr("id", "subjects")
	.on("change", function() {
		var selected_subject = d3.select(this).node().value;
		lock_preview = (selected_subject == "375" ?  false : selected_subject);
		// Индикатор всегда берется из глобального контекста
		redraw_graph(selected_subject, current_indicator);
	});
var grafik_indicator_selector = d3.select("#grafik")
	.append("select")
	.attr("id", "indicators")
	.on("change", function() {
		var selected_indicator = d3.select(this).node().value;
		// Переназначаем текущий индикатор
		current_indicator = selected_indicator;
		var selected_subject = d3.select("#subjects")
            .selectAll("option")
            .filter(function(d) {
                return this.selected == true
            })
            ._groups[0][0]
            .__data__;
		redraw_graph(selected_subject, current_indicator);
	});

var preview_map_color = d3.scaleQuantize()
              .range(['#f2f0f7','#cbc9e2','#9e9ac8','#6a51a3']);

// Шкалы для графика
var x_scale = d3.scaleBand()
                .range([0, 950])
                .round(true);
var y_scale = d3.scaleLinear()
				.range([280, 10]);
var formatter = d3.format(",.1f");

var y_axis = d3.axisLeft(y_scale)
				.ticks(5)
			.tickFormat(function(d) { return formatter(d); });

var x_axis = d3.axisBottom(x_scale);

var line = d3.line()
			.x(function(d) {
                return x_scale(d.year) + 60 + x_scale.bandwidth() / 2;
            })
			.y(function(d) { return y_scale(+d.amt); });

var area = d3.area()
			.x(function(d) {
                return x_scale(d.year) + 60 + x_scale.bandwidth() / 2;
            })
			.y0(280)
			.y1(function(d) { return y_scale(+d.amt); });

	// Функции для передвижения бегунка и изменения карты
function dragging() {
	d3.select(this).attr("cx", function() {
		if (d3.event.x <= 0) {
			return 0;
		} else if (d3.event.x > 950) {
			return 950;
		} else {
			return d3.event.x;          
		}
	});
}
function dragended(d) {
	var year_selected = x_scale.domain()[Math.round((d3.event.x) /
		x_scale.step() )];
	d3.select(this)
		.attr("cx", Math.round(x_scale(x_scale.domain()
			[Math.round((d3.event.x) / x_scale.step() )]) +
				x_scale.step() / 2)
		);
	redraw_preview_map(year_selected, current_indicator)
}

d3.json("data/preview_data.json", function(data) {
	d3.json("data/preview_map.geojson", function(map_data) {
		main_data = data;
		preview_map_data = map_data;
		
		
		// Собираем список категорий и создаем основное меню
		var categories = d3.map(main_data["categories"]).keys();
		d3.select("#categories")
			.append("ul")
			.selectAll("li")
			.data(categories)
			.enter()
			.append("li")
			.text(function(d) { return main_data["categories"][d]; })
			.attr("id", function(d) { return d; })
			.on("click", function(d) {
				d3.selectAll("#categories li")
					.classed("active", false);
				d3.select(this).classed("active", true);
				var selected_category = d3.select(this).attr("id");
				draw_by_category(selected_category);
			});
		d3.select("#categories")
			.select("li")
			.classed("active", true);
		current_category = categories[0];
		//// Создаем элементы графика
		svg = d3.select("#grafik")
				.append("svg")
				.attr("viewBox", "0 0 1500 350")
				.attr("preserveAspectRatio", "xMidYMid meet")
				.attr("width", "100%")
				.attr("height", 250);
		// Бегунок
		slider_group = svg.append("g")
					.attr("transform", "translate(60, 310)")
					.attr("id", "slider");
		// Карта предпросмотра
		preview_map_group = svg.append("g")
					.attr("id", "preview_map")
					.attr("transform", "translate(750, -80)");
		var preview_map = d3.select("#preview_map")
								.selectAll("path")
		// Вставляем карту
		preview_map.data(preview_map_data.features)
			.enter()
			.append("path")
			.attr("id", function(d) {
				return d.properties.subject; 
			}) 
			.attr("d", preview_map_path)
			.attr("stroke", "black")
			.attr("fill", "white")
			.on("mouseover", function(d) {
				var xPos = d3.event.pageX + "px";
				var yPos = d3.event.pageY + "px";
				d3.select("#preview_tooltip")
					.style("left", xPos)
					.style("top", yPos)
					//.classed("hidden", false);  
				d3.select("#region")    
					.text(d.properties.region_name); 
				d3.select("#amount")
					.text(d.properties.amount);
								})
			.on("mouseout", function(d) {
				d3.select("#preview_tooltip")
					.classed("hidden", true)
			});
		// Добавляем Минск
		preview_map_group.append("circle")
                .attr("cx", function(d) {
					return preview_map_projection([27.5666, 53.9])[0];
				})
                .attr("cy", function(d) {
					return preview_map_projection([27.5666, 53.9])[1]; 
					})
                .attr("r", 25)
                .attr("fill", "white")
                .attr("stroke", "black")
				.attr("opacity", "1")
				.on("mouseover", function(d) {
									var xPos = d3.event.pageX + "px";
									var yPos = d3.event.pageY + "px";
									d3.select("#preview_tooltip")
										.style("left", xPos)
										.style("top", yPos)
										.classed("hidden", false)  
									d3.select("#region")    
										.text("г. Минск")     
									d3.select("#amount")
										.text(formatter(d));
								})
								.on("mouseout", function(d) {
									d3.select("#preview_tooltip")
										.classed("hidden", true)
												  });

		var circles = svg.selectAll("circle");

			x_axis_group = d3.select("svg").append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(60, 280)");
			y_axis_group = d3.select("svg").append("g")
						.attr("class", "y axis")
						.attr("transform", "translate(60, 0)");

			area_graph = svg.append("path")
									.attr("class", "area_graph");

			line_graph = d3.select("svg")
				.append("path");

			slider_group.append("line")
				.attr("class", "slider")
				.attr("x1", x_scale.range()[0])
				.attr("x2", x_scale.range()[1])
				.attr("y1", "10")
				.attr("y2", "10");
			d3.select("#slider")
				.append("circle")
				.attr("id", "slider_handle")
				.call(d3.drag()
					.on("drag", dragging)
					.on("end", dragended)
				);
	draw_by_category(current_category);
	})
});

function draw_by_category(category) {
	// Очищаем lock_preview, чтобы при смене категории карта показывала всю республику 
	lock_preview = false;
	// Фильтруем данные по выбранной категории
	data_grafik = main_data["preview_data"].filter(function(d) {
			return d.cat == category;
			});
	// Создаем график
	data_grafik.sort(function(a, b) {return d3.descending(a.sub, b.sub)});
	// Задаем текущий индикатор - первый из списка
	current_indicator = data_grafik[0].ind;

	// Создаем селектор индикаторов. Селектор регионов будем создавать в функции redraw_graph
	var grafik_indicator_options = Array.from(new Set(
					data_grafik.map(function(d) {
												return d.ind;
												})));
	var grafik_indicators = grafik_indicator_selector.selectAll("option")
			.data(grafik_indicator_options);
			
	grafik_indicators.enter()
			.append("option")
			.attr("value", function(d) { return d; })
			.text(function(d) { return main_data["indicators"][d]; });
	grafik_indicators
		.transition()
		.duration(500)
		.attr("value", function(d) { return d; })
			.text(function(d) { return main_data["indicators"][d]; });
	grafik_indicators.exit()
		.remove();
	// Рисуем график
	redraw_graph(data_grafik[0].sub, data_grafik[0].ind);
	// Выводим первый селектор индикаторов наверх
	d3.select("#indicators")
		.selectAll("option")
		._groups[0][0]
		.selected = true;
	// Выводим первый селектор регионов наверх
	d3.select("#subjects")
		.selectAll("option")
		._groups[0][0]
		.selected = true;

}

function redraw_graph(subject, indicator) {
	// Список регионов собирается по индикатору.
	var grafik_subject_selectors = Array.from(new Set(
		main_data["preview_data"].filter(function(d) {
			return d.ind == indicator;
		})
					.map(function(d) {
						return d.sub;
					})));

	// Сортировка регионов, чтобы РБ была сверху
	grafik_subject_selectors.sort(function(a, b) {
		return d3.descending(a, b);
		})
	// Проверяем, есть ли переданный из меню селекторов регион в списке регионов для текущего индикатора
	if (grafik_subject_selectors.indexOf(+subject) < 0) {
		subject = general_subject_selectors[0];
		d3.select("#subjects")
			.selectAll("option")
			._groups[0][0]
			.selected = true;
		// Переназначаем lock_preview 
		lock_preview = (subject == "375" ?  false : subject);
		}

	// Создаем селектор регионов
	var annual_subjects = grafik_subject_selector.selectAll("option")
			.data(grafik_subject_selectors);
	annual_subjects.enter()
			.append("option")
			.attr("value", function(d) { return d; })
			.text(function(d) { return main_data["subjects"][d]; });
			
	annual_subjects.transition().duration(500)
		.attr("value", function(d) { return d; })
			.text(function(d) { return main_data["subjects"][d]; });
	annual_subjects.exit()
		.remove();

	// Ставим регион на место, на случай если порядок регионов изменился
	var subjects_list = d3.select("#subjects")
			.selectAll("option")
			.filter(function(d) {
				return d == subject;
				}
			);
	subjects_list._groups[0][0]
			.selected = true;

	// Собираем данные для текущей пары регион-индикатор
	var selected_data = main_data["preview_data"].filter(function(d) {
		return d.sub == subject && d.ind == indicator;
		});
	selected_data.sort(function(a, b) {
		return d3.ascending(a.year, b.year)
	});

	var values = selected_data.map(function(d) {
			return d.amt;
			});
	var data_extent = d3.extent(values, function(d) {
		return +d;
		});
	data_extent.sort(function(a, b) {
		return d3.ascending(a, b);
	});
	var max = d3.max(data_extent, function(d) { return d; });
	var min = d3.min(data_extent, function(d) { return d; });
	// Проверяем, есть ли в данных отрицательные значения. Если есть, то задаем минусовой диапазон по оси Y 
	if (min < 0) {
		y_scale.domain([min, max]);
	} else {
		y_scale.domain([0, max ]);
	}

	var years = selected_data.map(function(d) {
			return d.year;
			});
	years.sort(function(a, b) {
		return d3.ascending(+a, +b);
	});

	y_axis_group
			.transition().duration(500)
			.call(y_axis);

	x_scale.domain(years);
	x_axis_group
		.transition().duration(500)
		.call(x_axis);

	area_graph
		.transition().duration(500)
		.attr("d", area(selected_data));

	line_graph.transition().duration(500)
		.attr("d", line(selected_data))
		.attr("class", "line_graph");

	var circles = svg.selectAll(".graph_circle")
		.data(selected_data);

	circles.exit().remove();

	circles.enter()
		.append("circle")
		.attr("class", "graph_circle")
		.on("mouseover", function(d) {
			var xPos = d3.event.pageX - 20 + "px";
			var yPos = d3.event.pageY - 35 + "px";
			d3.select("#general_tooltip")
				.style("left", xPos)
				.style("top", yPos)
			    .classed("hidden", false);
			d3.select("#datum")
				.text(formatter(d.amt));
				})
		.on("mouseout", function(d) {
			d3.select("#general_tooltip")
			    .classed("hidden", true)
		})
		.attr("cx", function(d) {
				return x_scale(d.year) + 60 + x_scale.bandwidth() / 2;
				})
			.attr("cy", function(d) {
				return y_scale(+d.amt);
				})
			.attr("r", 5);

	circles.transition().duration(500)
		.attr("cx", function(d) {
			return x_scale(d.year) + 60 + x_scale.bandwidth() / 2;
			})
		.attr("cy", function(d) {
			return y_scale(+d.amt);
			})
		.attr("r", 5);

// Вешаем бегунок
	d3.select("#slider>circle")
		.transition().duration(500)
		.attr("cx", x_scale(years[years.length - 1]) + x_scale.step() / 2)
			.attr("cy", 10)
			.attr("r", 8);

	// Рисуем карту по последнему году и текущему индикатору
	redraw_preview_map(years[years.length - 1], indicator);

}

function redraw_preview_map(year, indicator) {
	// Если не выбрана конкретная область
		var map_filtered_data = main_data["preview_data"].filter(function(d) {
			return d.ind == indicator && d.year == year && d.sub != 375;
		});
	if (!lock_preview) {

	// Фильтруем данные для карты
	// Собираем доступные регионы
	var available_regions = map_filtered_data.map(function(d) {
		return d.sub;
	});

		preview_map_extent = d3.extent(map_filtered_data, function(d) {
			//if (d.subject != "375") { // Можно обойтись без проверки
			return +d.amt;
			//}
			});

		preview_map_color.domain([preview_map_extent[0], preview_map_extent[1]]);

		preview_map_data.features.forEach(function(a) {
		   map_filtered_data.forEach(function(b) {
			if (+a.properties.subject == b.sub) {
				a.properties.amount = b.amt;
			} else if (available_regions.indexOf(+a.properties.subject) < 0) {
				a.properties.amount = null;
			}
		   });
		});

		d3.select("#preview_map")
			.selectAll("path")
			.data(preview_map_data);
		d3.select("#preview_map")
			.selectAll("path")
			.transition().duration(500)
			.attr("fill", function(d) {
				if (d.properties.amount != null) {
				return preview_map_color(+d.properties.amount);
			} else {
				return "white";
			}
			});
		// Раскрашиваем Минск
		var minsk_amount = map_filtered_data.filter(function(d) {
			return d.sub == "170";
			});
		if (minsk_amount.length > 0) {
			minsk_amount = minsk_amount[0].amt;
		} else {
			minsk_amount = null;
		}
		
		d3.select("#preview_map")
			.select("circle")
			.data([minsk_amount])
			.transition().duration(500)
			.attr("fill", function(d) {
				if (d != null) {
				return preview_map_color(d);
			} else {
				return "white";
			}
			})
	} else {

	var current_datum = map_filtered_data.filter(function(d) {
		return d.year == year && d.sub == lock_preview;
		})[0].amt;

	preview_map_data.features.forEach(function(a) {

			if (+a.properties.subject == lock_preview) {
				a.properties.amount = current_datum;
			} else {
				a.properties.amount = null;
			}

		});
	d3.select("#preview_map")
			.selectAll("path")
			.data(preview_map_data);
		d3.select("#preview_map")
			.selectAll("path")
			.transition().duration(500)
			.attr("fill", function(d) {
				if (d.properties.amount != null) {
				return preview_map_color(+d.properties.amount);
			} else {
				return "white";
			}
			});
	// Если выбран Минск
	if (lock_preview == "170") {
		// Раскрашиваем Минск
		var minsk_amount = map_filtered_data.filter(function(d) {
			return d.sub == "170";
			});
		if (minsk_amount.length > 0) {
			minsk_amount = minsk_amount[0].amt;
		} else {
			minsk_amount = null;
		}
		
		d3.select("#preview_map")
			.select("circle")
			.data([minsk_amount])
			.transition().duration(500)
			.attr("fill", function(d) {
				if (d != null) {
				return preview_map_color(d);
			} else {
				return "white";
			}
			})
	} else {
		d3.select("#preview_map")
			.select("circle")
			.data([minsk_amount])
			.transition().duration(500)
			.attr("fill", "white");
	}
	
	
		d3.select("#preview_map")
		.selectAll("path")
		.transition().duration(500)
		.attr("fill", function(d) {
			if (d.properties.subject == lock_preview) {
				return "orange";
			} else {
				return "white";
			}
		});
		// Раскрашиваем Минск
		d3.select("preview_map")
			.select("circle")
			.transition().duration(500)
			.attr("fill", function(d) {
				return (lock_preview == "170" ? "orange" : "white");
			})
	}
}

// Основная карта
var width = 800,
  height = 150;

var today = new Date();
var selection = [];
var timeScale = d3.scaleTime()
              .domain([new Date("2018-01-01"), new Date("2018-12-31")])
              .rangeRound([10, 800])
              .nice(d3.timeDay);

var main_map = d3.select("#main_map")
    .append("svg")
    .attr("viewBox", "0 0 800 450")
    .attr("width", width)
    .attr("height", 560);
// Бегунок
var main_slider_svg = main_map.append("g")
 						.attr("class", "main_map_slider"); 
main_slider_svg.append("line")
    .attr("x1", 10)
    .attr("y1", -30)
    .attr("x2", 800)
    .attr("y2", -30);


var circle = main_slider_svg.append("circle")
            .attr("cx", timeScale(today))
            .attr("cy", -30)
            .attr("r", 10)
            .attr("fill", "#DF5757");
            
main_slider_svg.append("text")
    .text(convertDate(today))
    .attr("x", timeScale(today) - 23)
    .attr("y", -43);

// Список районов и карта
var projection = d3.geoMercator()
                    .center([27.9, 53.7])
                    .scale(3400)
                    .translate([330, 250]);

var path = d3.geoPath()
            .projection(projection);


function convertDate(d) {
  var months = ["января", "февраля", "марта", "апреля", "мая", "июня",
	"июля", "августа", "сентября", "октября", "ноября", "декабря"];
  var month = d.getMonth();
  var date = d.getDate();
  return date + " " + months[month];
}

d3.csv("data/data_2018.csv", function(error, data) {
  d3.json("data/rajony.geojson", function(json) {
        d3.csv("data/goroda.csv", function(goroda) {


var alko_map = main_map.append("g")
			.attr("class", "alko_map")
	alko_map.selectAll("path")
            .data(json.features)
            .enter()
			.append("path")
			.attr("d", path)
            .on("mouseover", function(d) {
                var xPos = d3.event.pageX + "px";
                var yPos = d3.event.pageY + "px";
                d3.select("#main_tooltip")
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
                    d3.select("#main_tooltip")
                      .classed("hidden", true)
                    });
        
          var cities = alko_map.selectAll("circle")
                        .data(goroda)
                        .enter()
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
                .on("mouseover", function(d) {
                  var xPos = d3.event.pageX + "px";
                  var yPos = d3.event.pageY + "px";
                  d3.select("#main_tooltip")
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
                    d3.select("#main_tooltip")
                      .classed("hidden", true)
                    });

    // Сбор данных об ограничениях на заданную дату
function selectData(value) {
	selection = [];
    data.forEach(function(d) {
	var newData = new Date(d.date);
	//newData.toDateString() == value.toDateString() ? selection.push(d) : void 0;
			if (newData.toDateString() == value.toDateString()) {
					selection.push(d);
                };
	});
    return selection;
}
                    
var header = d3.select("#list")
				.append("p");

var rajony = d3.select("#list").append("ul")
            .attr("class", "rajony")

function redraw_main_map(draggedDate) {
	
	selection = selectData(draggedDate);
          rajonyFiltered = selection.map(function(d) { return d.district; }).sort();
    alko_map.selectAll("path").attr("fill", function(d) {
        if (rajonyFiltered.indexOf(d.properties.rajon) >= 0) {
            d.properties.period = selection[rajonyFiltered.indexOf(d.properties.rajon)].period;
            return "red";
        } else {
            //d.properties.period = "Обычный режим продажи.";
            return "green";
        };
    });
    main_slider_svg.select("text")
        .text(convertDate(draggedDate))
        .attr("x", timeScale(draggedDate) - 23);     
        rajony.selectAll("li")
              .remove()
          
        if (selection.length > 0) {
            header.text("Продажа алкоголя ограничена в " +
				selection.length + " районах (городах):");
        } else {
			header.text("По всей республике действует обычный режим продажи.");
        };
        rajony.selectAll("li")
			.data(rajonyFiltered)
            .enter()
            .append("li")
            .text(function(d) { return d });
    cities.attr("fill", function(d) {
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
						  }
                )
}


    function dragListener(d) {
          var cx = +d3.select(this).attr("cx");
                    
          d3.select(this)
            .attr("cx", function(d) {
                if (cx < 25) {
                    return 25;
                } else if (cx > 1175) {
                    return 1175;
                } else {
                    return cx + d3.event.dx;
                }
            });
      
    var draggedDate = timeScale.invert(cx);
          


redraw_main_map(draggedDate)
          
          //map.attr("fill", function(d) {
          //        var color = "green";
          //        d.properties.period = "";
          //        for (var q = 0; q < selection.length; q++) {
          //          if (d.properties.rajon == selection[q].district) {
          //              color = "red";
          //              d.properties.period = selection[q].period;
          //            } else {
          //              continue;
          //          };
          //        };
          //        return color;
          //        })
          //.on("mouseover", function(d) {
                  //var xPos = d3.event.pageX + "px";
                  //var yPos = d3.event.pageY + "px";
                  //d3.select("#main_tooltip")
                    //.style("left", xPos)
                    //.style("top", yPos)
                    //.classed("hidden", false);
                  //d3.select("#rajon")
                    //.text(d.properties.rajon + " район");
                  //if (d.properties.period != "") {
                  //d3.select("#period")
                    //.text("Продажа ограничена с " + d.properties.period);
                  //} else {
                    //d3.select("#period")
                    //.text("Обычный режим продажи.");
                  //};
                  //})
                  //.on("mouseout", function(d) {
                    //d3.select("#main_tooltip")
                      //.classed("hidden", true)
                    //});
          
          //cities.attr("fill", function(d) {
                    //var color = "green";
                    //d.period = "";
                    //for (var b = 0; b < selection.length; b++) {
                      //if (d.city == selection[b].district) {
                          //color = "red";
                          //d.period = selection[b].period;
                        //} else {
                          //continue;
                      //};
                    //};
                    //return color;
                    //})
                //.on("mouseover", function(d) {
                  //var xPos = d3.event.pageX + "px";
                  //var yPos = d3.event.pageY + "px";
                  //d3.select("#main_tooltip")
                    //.style("left", xPos)
                    //.style("top", yPos)
                    //.classed("hidden", false);
                  //d3.select("#rajon")
                    //.text(d.city);
                    
                  //if (d.period != "") {
                  //d3.select("#period")
                    //.text("Продажа ограничена с " + d.period);
                  //} else {
                    //d3.select("#period")
                    //.text("Обычный режим продажи.");
                  //};
                  //})
                  //.on("mouseout", function(d) {
                    //d3.select("#main_tooltip")
                      //.classed("hidden", true)
                    //});
                    


        }
        
         //var drag = d3.behavior.drag()
                      //.on("drag", dragListener);
                  
          //selectData(today);
          
          //if (selection.length > 0) {
            //header.text("Продажа алкоголя ограничена в " + selection.length + " районах (городах):");
          //} else {
            //header.text("По всей республике действует обычный режим продажи.");
          //};
          //rajonyFiltered = selection.map(function(d) { return d.district; }).sort();
          //rajony.selectAll("li")
              //.data(rajonyFiltered.sort())
              //.enter()
              //.append("li")
              //.text(function(d) { return d });

        redraw_main_map(today);
                
        //circle.call(drag);
        circle.call(d3.drag()
					.on("drag", dragListener)
					//.on("end", dragended)
				);
        
});
});

});
