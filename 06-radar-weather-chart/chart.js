async function drawChart() {
  //* Step 1. Access data
  let dataset = await d3.json("../data/my_weather_data.json");

  const temperatureMinAccessor = (d) => d.temperatureMin;
  const temperatureMaxAccessor = (d) => d.temperatureMax;
  const uvIndexAccessor = (d) => d.uvIndex;
  const precipProbabilityAccessor = (d) => d.precipProbability;
  const precipTypeAccessor = (d) => d.precipType;
  const cloudCoverAccessor = (d) => d.cloudCover;
  const dateParser = d3.timeParse("%Y-%m-%d");
  const dateAccessor = (d) => dateParser(d.date);

  //* Step 2. Create chart dimensions
  const diameter = 600;
  let dimensions = {
    width: diameter,
    height: diameter,
    radius: diameter / 2,
    margin: {
      top: 120,
      right: 120,
      bottom: 120,
      left: 120,
    },
  };

  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right;
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom;
  dimensions.boundedRadius =
    dimensions.radius - (dimensions.margin.left + dimensions.margin.right) / 2;

  //* Step 3. Draw canvas
  const wrapper = d3
    .select("#wrapper")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height);

  const bounds = wrapper
    .append("g")
    .style(
      "transform",
      `translate(${dimensions.margin.left + dimensions.boundedRadius}px, ${
        dimensions.margin.top + dimensions.boundedRadius
      }px)`
    );

  const defs = wrapper.append("defs");

  const gradientId = "temperature-gradient";
  const gradient = defs.append("radialGradient").attr("id", gradientId);

  const numberOfStops = 10;
  const gradientColorScale = d3.interpolateYlOrRd;
  d3.range(numberOfStops).forEach((i) => {
    gradient
      .append("stop")
      .attr("offset", `${(i * 100) / (numberOfStops - 1)}%`)
      .attr("stop-color", gradientColorScale(i / (numberOfStops - 1)));
  });

  //* Step 4. Create scales
  //? We use radians for the angleScale because
  //? it's easier to do calculations with radians.
  const angleScale = d3
    .scaleTime()
    .domain(d3.extent(dataset, dateAccessor))
    .range([0, Math.PI * 2]);

  const radiusScale = d3
    .scaleLinear()
    //? We want to scale both temperatureMin and temperatureMax for the radius
    .domain(
      d3.extent([
        ...dataset.map(temperatureMinAccessor),
        ...dataset.map(temperatureMaxAccessor),
      ])
    )
    .range([0, dimensions.boundedRadius])
    .nice();

  const temperatureColorScale = d3
    .scaleSequential()
    .domain(radiusScale.domain())
    .interpolator(gradientColorScale);

  const cloudRadiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(dataset, cloudCoverAccessor))
    .range([1, 10]);

  const precipRadiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(dataset, precipProbabilityAccessor))
    .range([0, 8]);

  const precipTypes = ["rain", "sleet", "snow"];
  const precipColorScale = d3
    .scaleOrdinal()
    .domain(precipTypes)
    .range([
      "hsl(213deg 100% 66%)",
      "hsl(196deg 7% 42%)",
      "hsl(198deg 12% 73%)",
    ]); // ["#54a0ff", "#636e72", "#b2bec3"]

  function getCoordinatesForAngle(angle, offset = 1) {
    return [
      Math.cos(angle - Math.PI / 2) * dimensions.boundedRadius * offset,
      Math.sin(angle - Math.PI / 2) * dimensions.boundedRadius * offset,
    ];
  }

  function getXFromDataPoint(d, offset = 1.4) {
    return getCoordinatesForAngle(angleScale(dateAccessor(d)), offset)[0];
  }
  function getYFromDataPoint(d, offset = 1.4) {
    return getCoordinatesForAngle(angleScale(dateAccessor(d)), offset)[1];
  }

  //? For this type of chart that we're building, it would be
  //? more helpful to draw the peripherals before we draw the data.
  //* Step 5. Draw peripherals
  const peripheralGroup = bounds.append("g");

  const months = d3.timeMonth.range(...angleScale.domain());
  months.forEach((month) => {
    const angle = angleScale(month);
    const [x2, y2] = getCoordinatesForAngle(angle, 1);
    peripheralGroup
      .append("line")
      .attr("class", "grid-line")
      .attr("x2", x2)
      .attr("y2", y2);

    const [labelX, labelY] = getCoordinatesForAngle(angle, 1.38);
    peripheralGroup
      .append("text")
      .attr("class", "tick-label")
      .attr("x", labelX)
      .attr("y", labelY)
      .attr(
        "text-anchor",
        Math.abs(labelX) < 5 ? "middle" : labelX > 0 ? "start" : "end"
      )
      .text(d3.timeFormat("%b")(month));
  });

  const temperatureTicks = radiusScale.ticks(4);
  const gridCircles = temperatureTicks.map((tick) => {
    return peripheralGroup
      .append("circle")
      .attr("class", "grid-line")
      .attr("r", radiusScale(tick));
  });
  const gridLabelBackgrounds = temperatureTicks.map((tick) => {
    if (tick < 1) {
      return;
    }

    return peripheralGroup
      .append("rect")
      .attr("y", -10 - radiusScale(tick))
      .attr("width", 40)
      .attr("height", 20)
      .attr("fill", "hsl(210deg 17% 98%)");
  });
  const gridLabels = temperatureTicks.map((tick) => {
    if (tick < 1) {
      return;
    }

    return peripheralGroup
      .append("text")
      .attr("class", "grid-label")
      .attr("x", 4)
      .attr("y", 2 - radiusScale(tick))
      .html(`${d3.format(".0f")(tick)}&deg;F`);
  });

  const freezingCircle = bounds
    .append("circle")
    .attr("class", "freezing-circle")
    .attr("r", radiusScale(32));

  //* Step 6. Draw data
  const areaGenerator = d3
    .areaRadial()
    .angle((d) => angleScale(dateAccessor(d)))
    .innerRadius((d) => radiusScale(temperatureMinAccessor(d)))
    .outerRadius((d) => radiusScale(temperatureMaxAccessor(d)));

  const area = bounds
    .append("path")
    .attr("d", areaGenerator(dataset))
    .style("fill", `url(#${gradientId})`);

  const uvIndexThreshold = 8;
  const uvIndexGroup = bounds.append("g");
  const uvIndexOffset = 0.95;
  const highUvDays = uvIndexGroup
    .selectAll("line")
    .data(dataset.filter((d) => uvIndexAccessor(d) >= uvIndexThreshold))
    .join("line")
    .attr("class", "uv-index-line")
    .attr("x1", (d) => getXFromDataPoint(d, uvIndexOffset))
    .attr("y1", (d) => getYFromDataPoint(d, uvIndexOffset))
    .attr("x2", (d) => getXFromDataPoint(d, uvIndexOffset + 0.1))
    .attr("y2", (d) => getYFromDataPoint(d, uvIndexOffset + 0.1));

  const cloudCoverGroup = bounds.append("g");
  const cloudCoverOffset = 1.27;
  const cloudCoverDots = cloudCoverGroup
    .selectAll("circle")
    .data(dataset)
    .join("circle")
    .attr("class", "cloud-cover-dot")
    .attr("cx", (d) => getXFromDataPoint(d, cloudCoverOffset))
    .attr("cy", (d) => getYFromDataPoint(d, cloudCoverOffset))
    .attr("r", (d) => cloudRadiusScale(cloudCoverAccessor(d)));

  const precipGroup = bounds.append("g");
  const precipOffset = 1.14;
  const precipDots = precipGroup
    .selectAll("circle")
    .data(dataset)
    .join("circle")
    .attr("class", "precip-dot")
    .attr("cx", (d) => getXFromDataPoint(d, precipOffset))
    .attr("cy", (d) => getYFromDataPoint(d, precipOffset))
    .attr("r", (d) => precipRadiusScale(precipProbabilityAccessor(d)))
    .attr("fill", (d) => precipColorScale(precipTypeAccessor(d)));

  const annotationGroup = bounds.append("g");
  function drawAnnotation(angle, offset, text) {
    const [x1, y1] = getCoordinatesForAngle(angle, offset);
    const [x2, y2] = getCoordinatesForAngle(angle, 1.6);

    annotationGroup
      .append("line")
      .attr("class", "annotation-line")
      .attr("x1", x1)
      .attr("x2", x2)
      .attr("y1", y1)
      .attr("y2", y2);

    annotationGroup
      .append("text")
      .attr("class", "annotation-text")
      .attr("x", x2 + 6)
      .attr("y", y2)
      .text(text);
  }

  drawAnnotation(Math.PI * 0.23, cloudCoverOffset, "Cloud Cover");
  drawAnnotation(Math.PI * 0.26, precipOffset, "Precipitation");

  drawAnnotation(
    Math.PI * 0.734,
    uvIndexOffset,
    `UV Index over ${uvIndexThreshold}`
  );
  drawAnnotation(Math.PI * 0.7, 0.5, "Temperature");
  drawAnnotation(
    Math.PI * 0.9,
    radiusScale(32) / dimensions.boundedRadius,
    "Freezing Temperature"
  );

  precipTypes.forEach((precipType, index) => {
    const [labelX, labelY] = getCoordinatesForAngle(Math.PI * 0.26, 1.6);

    annotationGroup
      .append("circle")
      .attr("class", "precip-dot")
      .attr("cx", labelX + 15)
      .attr("cy", labelY + 16 * (index + 1))
      .attr("r", 4)
      .attr("fill", precipColorScale(precipType));

    annotationGroup
      .append("text")
      .attr("class", "annotation-text")
      .attr("x", labelX + 25)
      .attr("y", labelY + 16 * (index + 1))
      .style("fill", precipColorScale(precipType))
      .text(precipType);
  });

  //* Step 7. Set up interactions
  const tooltip = d3.select("#tooltip");
  const tooltipLine = bounds.append("path").attr("class", "tooltip-line");

  function getAngleFromCoordinates(x, y) {
    const angle = Math.atan2(y, x) + Math.PI / 2;
    return angle > 0 ? angle : angle + Math.PI * 2;
  }

  const tooltipArcGenerator = d3
    .arc()
    .innerRadius(0)
    .outerRadius(dimensions.boundedRadius * 1.6)
    .startAngle((angle) => angle - 0.015)
    .endAngle((angle) => angle + 0.015);

  function onMouseMove(event) {
    const [x, y] = d3.pointer(event);

    const angle = getAngleFromCoordinates(x, y);

    const date = angleScale.invert(angle);
    const dateString = d3.timeFormat("%Y-%m-%d")(date);
    const dataPoint = dataset.find((d) => d.date === dateString);
    if (!dataPoint) {
      return;
    }

    tooltip.select("#tooltip-date").text(d3.timeFormat("%B %-d")(date));
    tooltip
      .select("#tooltip-temperature-min")
      .style("color", temperatureColorScale(temperatureMinAccessor(dataPoint)))
      .html(`${d3.format(".1f")(temperatureMinAccessor(dataPoint))}&deg;F`);
    tooltip
      .select("#tooltip-temperature-max")
      .style("color", temperatureColorScale(temperatureMaxAccessor(dataPoint)))
      .html(`${d3.format(".1f")(temperatureMaxAccessor(dataPoint))}&deg;F`);
    tooltip.select("#tooltip-uv").text(uvIndexAccessor(dataPoint));
    tooltip.select("#tooltip-cloud").text(cloudCoverAccessor(dataPoint));
    tooltip
      .select("#tooltip-precipitation")
      .text(d3.format(".0%")(precipProbabilityAccessor(dataPoint)));
    tooltip
      .select("#tooltip-precipitation-type")
      .text(precipTypeAccessor(dataPoint));
    tooltip
      .select(".tooltip-precipitation-type")
      .style(
        "color",
        precipTypeAccessor(dataPoint)
          ? precipColorScale(precipTypeAccessor(dataPoint))
          : "hsl(210deg 4% 86%)"
      );

    tooltipLine.attr("d", tooltipArcGenerator(angle)).style("opacity", 1);

    const [tooltipX, tooltipY] = getCoordinatesForAngle(angle, 1.6);
    tooltip
      .style(
        "transform",
        `translate(calc(${
          tooltipX + dimensions.margin.left + dimensions.boundedRadius
        }px + ${
          tooltipX < -50 ? "40px - 100" : tooltipX > 50 ? "-40px + 0" : "-50"
        }%), calc(${
          tooltipY + dimensions.margin.top + dimensions.boundedRadius
        }px + ${
          tooltipY < -50 ? "40px - 100" : tooltipY > 50 ? "-40px + 0" : "-50"
        }%))`
      )
      .style("opacity", 1);
  }

  function onMouseLeave() {
    tooltipLine.style("opacity", 0);
    tooltip.style("opacity", 0);
  }

  const listenerCircle = bounds
    .append("circle")
    .attr("class", "listener-circle")
    .attr("r", dimensions.radius)
    .on("mousemove", onMouseMove)
    .on("mouseleave", onMouseLeave);
}

drawChart();
