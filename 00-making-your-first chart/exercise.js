async function drawLineChart() {
  const data = await d3.csv("../data/bob_ross_paintings.csv");

  //? Ordered by Season + Episode number
  const xAccessor = (d) => parseInt(d[""]);
  const yAccessor = (d) => parseInt(d["num_colors"]);

  // console.log(
  //   data.map((item) => ({
  //     idx: item[""],
  //     season: item.season,
  //     episode: item.episode,
  //     num_colors: item.num_colors,
  //   }))
  // );

  // console.log(data);

  let dimensions = {
    width: window.innerWidth * 0.9,
    height: 475,
    margins: {
      top: 60,
      right: 15,
      bottom: 60,
      left: 60,
    },
  };

  dimensions.boundedWidth =
    dimensions.width - dimensions.margins.left - dimensions.margins.right;
  dimensions.boundedHeight =
    dimensions.height - dimensions.margins.top - dimensions.margins.bottom;

  const wrapper = d3
    .select("#wrapper")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height);

  const bounds = wrapper
    .append("g")
    .style(
      "transform",
      `translate(${dimensions.margins.left}px, ${dimensions.margins.top}px)`
    );

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(data, yAccessor))
    .range([dimensions.boundedHeight, 0]);

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(data, xAccessor))
    .range([0, dimensions.boundedWidth]);

  const lineGenerator = d3
    .line()
    .x((d) => xScale(xAccessor(d)))
    .y((d) => yScale(yAccessor(d)));

  const line = bounds
    .append("path")
    .attr("d", lineGenerator(data))
    .attr("fill", "none")
    .attr("stroke", "hsl(41deg 35% 52%)") // "#af9358"
    .attr("stroke-width", 2);

  const yAxisGenerator = d3.axisLeft().scale(yScale);

  const yAxis = bounds.append("g").call(yAxisGenerator);

  const xAxisGenerator = d3.axisBottom().scale(xScale);
  const xAxis = bounds
    .append("g")
    .style("transform", `translateY(${dimensions.boundedHeight}px)`)
    .call(xAxisGenerator);

  wrapper
    .append("text")
    .attr("x", dimensions.margins.left + dimensions.boundedWidth / 2)
    .attr("dy", dimensions.margins.top / 2)
    .style("text-anchor", "middle")
    .style("font-size", "1.5rem")
    .style("font-weight", "bold")
    .text("Number of Colors in Bob Ross Paintings");

  wrapper
    .append("text")
    .attr("x", dimensions.margins.left + dimensions.boundedWidth / 2)
    .attr("y", dimensions.margins.top + dimensions.boundedHeight)
    .attr("dy", (2 * dimensions.margins.bottom) / 3)
    .style("text-anchor", "middle")
    .text(
      `Episode of "The Joy of Painting" in which the painting was featured`
    );

  wrapper
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -dimensions.height / 2)
    .attr("dy", dimensions.margins.left / 2)
    .style("text-anchor", "middle")
    .text("Unique colors used in the painting");
}

drawLineChart();
