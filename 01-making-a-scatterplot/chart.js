async function drawScatter() {
  //* Step 1: Access data
  const data = await d3.json("../data/my_weather_data.json");

  const xAccessor = (d) => d.dewPoint;
  const yAccessor = (d) => d.humidity;
  const colorAccessor = (d) => d.cloudCover;

  //* Step 2: Create chart dimensions
  //? Typically, scatterplots are square, with the x axis as wide
  //? as the y axis is tall. We also want to keep our chart as large as possible
  //? while still fitting on the screen, so we want to get the smaller dimension.
  const chartSize = d3.min([window.innerWidth * 0.9, window.innerHeight * 0.9]);

  const dimensions = {
    width: chartSize,
    height: chartSize,
    margin: {
      top: 10,
      right: 10,
      bottom: 50,
      left: 50,
    },
  };

  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.right - dimensions.margin.left;
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
    .domain(d3.extent(data, xAccessor))
    .range([0, dimensions.boundedWidth])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(data, yAccessor))
    .range([dimensions.boundedHeight, 0])
    .nice();

  const colorScale = d3
    .scaleLinear()
    .domain(d3.extent(data, colorAccessor))
    .range(["skyblue", "darkslategrey"]);

  //* Step 5. Draw Data
  const dots = bounds.selectAll("circle").data(data);

  dots
    //? .join("circle") = shorthand for .enter.append("circle").merge(dots)
    .join("circle")
    .attr("cx", (d) => xScale(xAccessor(d)))
    .attr("cy", (d) => yScale(yAccessor(d)))
    .attr("fill", (d) => colorScale(colorAccessor(d)))
    .attr("r", 5);

  //* Step 6. Draw peripherals
  const xAxisGenerator = d3.axisBottom().scale(xScale);
  const xAxis = bounds
    .append("g")
    .call(xAxisGenerator)
    .style("transform", `translateY(${dimensions.boundedHeight}px)`);
  const xAxisLabel = xAxis
    .append("text")
    .attr("x", dimensions.boundedWidth / 2)
    .attr("y", dimensions.margin.bottom - 10)
    .attr("fill", "black")
    .style("font-size", "1.4em")
    .style("text-anchor", "middle")
    .html("Dew point (&deg;F)");

  const yAxisGenerator = d3.axisLeft().scale(yScale).ticks(4);
  const yAxis = bounds.append("g").call(yAxisGenerator);

  const yAxisLabel = yAxis
    .append("text")
    .attr("x", -dimensions.boundedHeight / 2)
    .attr("y", -dimensions.margin.left + 10)
    .attr("transform", "rotate(-90)")
    .attr("fill", "black")
    .style("font-size", "1.4em")
    .style("text-anchor", "middle")
    .text("Relative Humidity");
}

drawScatter();
