async function drawScatter() {
  //* Step 1: Access data
  const rawData = await d3.csv("../data/penguins.csv");

  const data = rawData.filter(
    (item) => item["bill_length_mm"] !== "NA" && item["bill_depth_mm"] !== "NA"
  );

  //? The original graph compares flipper length vs. bill length
  // const xAccessor = (d) => parseFloat(d["flipper_length_mm"]);
  // const yAccessor = (d) => parseFloat(d["bill_length_mm"]);

  const xAccessor = (d) => parseFloat(d["bill_length_mm"]);
  const yAccessor = (d) => parseFloat(d["bill_depth_mm"]);
  const colorAccessor = (d) => d["species"];

  //* Step 2: Create chart dimensions
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
    .scaleOrdinal()
    //TODO: Find a nicer way to get the species names
    .domain(Array.from(d3.group(data, colorAccessor)).map((d) => d[0]))
    .range(d3.schemeSet1);

  //* Step 5. Draw Data
  const dots = bounds.selectAll("circle").data(data);

  dots
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
    .text("Bill length (mm)");

  const yAxisGenerator = d3.axisLeft().scale(yScale);
  const yAxis = bounds.append("g").call(yAxisGenerator);

  const yAxisLabel = yAxis
    .append("text")
    .attr("x", -dimensions.boundedHeight / 2)
    .attr("y", -dimensions.margin.left + 10)
    .attr("transform", "rotate(-90)")
    .attr("fill", "black")
    .style("font-size", "1.4em")
    .style("text-anchor", "middle")
    .text("Bill depth (mm)");
}

drawScatter();
