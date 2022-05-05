async function drawScatter() {
  //* Step 1. Access data
  let dataset = await d3.json("../data/my_weather_data.json");

  const xAccessor = (d) => d.dewPoint;
  const yAccessor = (d) => d.humidity;

  //* Step 2. Create chart dimensions
  const width = d3.min([window.innerWidth * 0.9, window.innerHeight * 0.9]);
  let dimensions = {
    width: width,
    height: width,
    margin: {
      top: 10,
      right: 10,
      bottom: 50,
      left: 50,
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
  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(dataset, xAccessor))
    .range([0, dimensions.boundedWidth])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(dataset, yAccessor))
    .range([dimensions.boundedHeight, 0])
    .nice();

  //* Step 5. Draw data
  const dots = bounds
    .selectAll("circle")
    .data(dataset)
    .join("circle")
    .attr("cx", (d) => xScale(xAccessor(d)))
    .attr("cy", (d) => yScale(yAccessor(d)))
    .attr("r", 4)
    .attr("tabindex", "0");

  //* Step 6. Draw peripherals
  const xAxisGenerator = d3.axisBottom().scale(xScale);
  const xAxis = bounds
    .append("g")
    .call(xAxisGenerator)
    .style("transform", `translateY(${dimensions.boundedHeight}px)`);
  const xAxisLabel = xAxis
    .append("text")
    .attr("class", "x-axis-label")
    .attr("x", dimensions.boundedWidth / 2)
    .attr("y", dimensions.margin.bottom - 10)
    .html("Dew point (&deg;F)");

  const yAxisGenerator = d3.axisLeft().scale(yScale).ticks(4);
  const yAxis = bounds.append("g").call(yAxisGenerator);
  const yAxisLabel = yAxis
    .append("text")
    .attr("class", "y-axis-label")
    .attr("x", -dimensions.boundedHeight / 2)
    .attr("y", -dimensions.margin.left + 10)
    .text("Relative humidity");

  //* Step 7. Create interactions
  const tooltip = d3.select("#tooltip");

  //? Let's create a Voronoi diagram from our data points!
  //? https://en.wikipedia.org/wiki/Voronoi_diagram
  //? Each voronoi cell will serve as our hover target
  //? so the user can hover on a much larger surface area than our small dots.
  const delaunay = d3.Delaunay.from(
    dataset,
    (d) => xScale(xAccessor(d)),
    (d) => yScale(yAccessor(d))
  );
  const voronoi = delaunay.voronoi();
  voronoi.xmax = dimensions.boundedWidth;
  voronoi.ymax = dimensions.boundedHeight;

  const voronoiCell = bounds
    .selectAll(".voronoi")
    .data(dataset)
    .join("path")
    .attr("class", "voronoi")
    .attr("d", (d, i) => voronoi.renderCell(i));

  function onMouseEnter(event, d) {
    const dateParser = d3.timeParse("%Y-%m-%d");
    const formatDate = d3.timeFormat("%A, %B %-d, %Y");
    tooltip.select("#date").text(formatDate(dateParser(d.date)));
    tooltip.select("#dew-point").text(xAccessor(d));
    tooltip.select("#humidity").text(yAccessor(d));

    const x = xScale(xAccessor(d)) + dimensions.margin.left;
    const y = yScale(yAccessor(d)) + dimensions.margin.top;

    tooltip
      .style("transform", `translate(calc(${x}px - 50%), calc(${y}px - 100%))`)
      .style("opacity", 1);

    //? Since we can't apply a z-index to an svg element,
    //? we'll just create a temporary fake dot to display
    //? on top of the currently "hovered" dot
    const dayDot = bounds
      .append("circle")
      .attr("class", "tooltip-dot")
      .attr("cx", xScale(xAccessor(d)))
      .attr("cy", yScale(yAccessor(d)))
      .attr("fill", "hsl(259deg 98% 67%)") //"#8d58fd"
      .style("pointer-events", "none")
      .transition()
      .duration(250)
      .attr("r", 7);
  }
  function onMouseLeave(event, d) {
    tooltip.style("opacity", 0);
    d3.selectAll(".tooltip-dot")
      .transition()
      .duration(500)
      .attr("r", 0)
      .remove();
  }

  voronoiCell.on("mouseenter", onMouseEnter).on("mouseleave", onMouseLeave);
}
drawScatter();
