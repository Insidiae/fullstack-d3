async function drawLineChart() {
  //* Step 1. Access data
  const dataset = await d3.json("../data/my_weather_data.json");

  const yAccessor = (d) => d.temperatureMax;
  const dateParser = d3.timeParse("%Y-%m-%d");
  const xAccessor = (d) => dateParser(d.date);

  //* Step 2. Create chart dimensions
  let dimensions = {
    width: window.innerWidth * 0.9,
    height: 400,
    margin: {
      top: 15,
      right: 15,
      bottom: 40,
      left: 60,
    },
  };

  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right;
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

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
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
    );

  //* Step 4. Create scales
  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(dataset, yAccessor))
    .range([dimensions.boundedHeight, 0]);

  const freezingTemperaturePlacement = yScale(32);
  const freezingTemperatures = bounds
    .append("rect")
    .attr("x", 0)
    .attr("width", dimensions.boundedWidth)
    .attr("y", freezingTemperaturePlacement)
    .attr("height", dimensions.boundedHeight - freezingTemperaturePlacement)
    .attr("fill", "#e0f3f3");

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(dataset, xAccessor))
    .range([0, dimensions.boundedWidth]);

  //* Step 5. Draw data
  const lineGenerator = d3
    .line()
    .x((d) => xScale(xAccessor(d)))
    .y((d) => yScale(yAccessor(d)));

  const line = bounds
    .append("path")
    .attr("d", lineGenerator(dataset))
    .attr("fill", "none")
    .attr("stroke", "#af9358")
    .attr("stroke-width", 2);

  //* Step 6. Draw peripherals
  const yAxisGenerator = d3.axisLeft().scale(yScale);
  const yAxis = bounds.append("g").call(yAxisGenerator);
  const yAxisLabel = yAxis
    .append("text")
    .attr("class", "y-axis-label")
    .attr("x", -dimensions.boundedHeight / 2)
    .attr("y", -dimensions.margin.left + 10)
    .html("Maximum Temperature (&deg;F)");

  const xAxisGenerator = d3.axisBottom().scale(xScale);
  const xAxis = bounds
    .append("g")
    .call(xAxisGenerator)
    .style("transform", `translateY(${dimensions.boundedHeight}px)`);

  //* Step 7. Set up interactions
  const tooltip = d3.select("#tooltip");
  const tooltipLine = bounds.append("line").attr("class", "tooltip-line");
  const tooltipDot = bounds
    .append("circle")
    .attr("class", "tooltip-dot")
    .attr("r", 4);

  function getDistanceFromHoveredDate(d, hoveredDate) {
    return Math.abs(xAccessor(d) - hoveredDate);
  }

  function onMouseMove(event) {
    const [mouseXPosition, mouseYPosition] = d3.pointer(event);
    const hoveredDate = xScale.invert(mouseXPosition);

    const closestIndex = d3.leastIndex(dataset, (current, next) => {
      return (
        getDistanceFromHoveredDate(current, hoveredDate) -
        getDistanceFromHoveredDate(next, hoveredDate)
      );
    });
    const closestDataPoint = dataset[closestIndex];

    const formatDate = d3.timeFormat("%A, %B %-d, %Y");
    const formatTemperature = (d) => `${d3.format(".1f")(d)} &deg;F`;

    tooltip.select("#date").text(formatDate(xAccessor(closestDataPoint)));
    tooltip
      .select("#temperature")
      .html(formatTemperature(yAccessor(closestDataPoint)));

    const x = xScale(xAccessor(closestDataPoint)) + dimensions.margin.left;
    const y = yScale(yAccessor(closestDataPoint)) + dimensions.margin.top - 8;

    tooltipDot
      .style("opacity", 1)
      .attr("cx", xScale(xAccessor(closestDataPoint)))
      .attr("cy", yScale(yAccessor(closestDataPoint)));
    //? Replace the cx and cy attributes above with this style
    //? if you want to smoothly animate the tooltip dot's movement
    // .style(
    //   "transform",
    //   `translate(${xScale(xAccessor(closestDataPoint))}px, ${yScale(
    //     yAccessor(closestDataPoint)
    //   )}px)`
    // );

    tooltipLine
      .style("opacity", 1)
      .attr("x1", xScale(xAccessor(closestDataPoint)))
      .attr("y1", dimensions.boundedHeight)
      .attr("x2", xScale(xAccessor(closestDataPoint)))
      .attr("y2", yScale(yAccessor(closestDataPoint)));
    //? If you want to smoothly animate the line's position, use these instead:
    // .attr("x1", 0)
    // .attr("y1", dimensions.boundedHeight)
    // .attr("x2", 0)
    // .attr("y2", yScale(yAccessor(closestDataPoint)))
    // .style(
    //   "transform",
    //   `translateX(${xScale(xAccessor(closestDataPoint))}px)`
    // );
    tooltip
      .style("transform", `translate(calc(${x}px - 50%), calc(${y}px - 100%))`)
      .style("opacity", 1);
  }

  function onMouseLeave() {
    tooltipDot.style("opacity", 0);
    tooltipLine.style("opacity", 0);
    tooltip.style("opacity", 0);
  }

  const listenerRect = bounds
    .append("rect")
    .attr("class", "listener-rect")
    .attr("width", dimensions.boundedWidth)
    .attr("height", dimensions.boundedHeight)
    .on("mousemove", onMouseMove)
    .on("mouseleave", onMouseLeave);
}
drawLineChart();
