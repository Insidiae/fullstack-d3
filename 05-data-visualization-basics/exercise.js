async function drawScatter() {
  //* Step 1: Access data
  const rawData = await d3.csv("../data/penguins.csv");

  const data = rawData.filter(
    (item) => item["bill_length_mm"] !== "NA" && item["bill_depth_mm"] !== "NA"
  );

  const xAccessor = (d) => parseFloat(d["flipper_length_mm"]);
  const yAccessor = (d) => parseFloat(d["bill_length_mm"]);
  const colorAccessor = (d) => d["species"];

  const speciesGroups = Array.from(d3.group(data, colorAccessor));

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

  const clipPath = bounds
    .append("defs")
    .append("clipPath")
    .attr("id", "bounds-clip-path")
    .append("rect")
    .attr("width", dimensions.boundedWidth)
    .attr("height", dimensions.boundedHeight);

  const clip = bounds.append("g").attr("clip-path", "url(#bounds-clip-path)");

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
    .domain(speciesGroups.map((d) => d[0]))
    // .range(d3.schemeSet1);
    .range(["#f28e2c", "#1b9e77", "#7570b3"]);

  const symbolScale = d3
    .scaleOrdinal()
    .domain(speciesGroups.map((d) => d[0]))
    .range([d3.symbolCircle, d3.symbolSquare, d3.symbolTriangle]);

  //* Step 5. Draw Data
  const dots = clip.selectAll("circle").data(data);

  dots
    .enter()
    .append("path")
    //#region new dots
    .style(
      "transform",
      (d) =>
        `translate(${xScale(xAccessor(d))}px, ${
          dimensions.boundedHeight + 20
        }px) scale(0)`
    )
    .attr(
      "d",
      d3.symbol().type((d) => symbolScale(colorAccessor(d)))
    )
    .attr("fill", (d) => colorScale(colorAccessor(d)))
    //#endregion
    .merge(dots)
    //#region update transition
    .transition()
    .duration(1000)
    //* You can use the index of each item to delay their transition one by one
    .delay((d, i) => i * 5)
    .ease(d3.easeCubicOut)
    .style(
      "transform",
      (d) =>
        `translate(${xScale(xAccessor(d))}px, ${yScale(
          yAccessor(d)
        )}px) scale(1)`
    );
  //#endregion

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
    .text("Flipper length (mm)");

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
    .text("Bill length (mm)");

  const linearRegression = d3
    .regressionLinear()
    .x((d) => xScale(xAccessor(d)))
    .y((d) => yScale(yAccessor(d)));

  // Add a linear regression line for each species group
  speciesGroups.forEach((species, idx) => {
    bounds
      .append("line")
      .attr("stroke", colorScale(species[0]))
      .attr("stroke-width", 3)
      .attr("opacity", 0)
      .datum(linearRegression(species[1]))
      //#region linear-regression
      .attr("x1", (d) => d[0][0])
      .attr("x2", (d) => d[1][0])
      .attr("y1", (d) => d[0][1])
      .attr("y2", (d) => d[1][1])
      //#endregion
      .transition()
      //#region linear-regression-transition
      .duration(1000)
      .delay(1000 + idx * 500)
      //#endregion
      .attr("opacity", 1);
  });

  // Add a legend for the species groups
  const legendWidth = 200;
  const legendHeight = 113;
  const legend = bounds
    .append("g")
    .style(
      "transform",
      `translate(${dimensions.boundedWidth - legendWidth}px, ${
        dimensions.boundedHeight - legendHeight
      }px)`
    );

  legend
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("class", "legend");

  legend
    .append("text")
    .attr("x", 20)
    .attr("y", 25)
    .style("font-weight", "bold")
    .text("Penguin Species");

  speciesGroups.forEach((species, idx) => {
    legend
      .append("path")
      .attr("d", d3.symbol().type(symbolScale(species[0])))
      .style("transform", `translate(${25}px, ${45 + idx * 25}px)`)
      .attr("fill", colorScale(species[0]));

    legend
      .append("text")
      .attr("x", 40)
      .attr("y", 50 + idx * 25)
      .attr("fill", colorScale(species[0]))
      .style("font-weight", 500)
      .text(species[0]);
  });
}

drawScatter();
