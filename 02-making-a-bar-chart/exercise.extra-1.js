function drawHistogram(
  rawData,
  filterColumn,
  filterValue,
  metric,
  fillColor = "hsl(221deg 98% 67%)"
) {
  //* Step 1. Access data
  const data = rawData.filter(
    (d) => d[filterColumn] === filterValue && d[metric] !== "NA"
  );

  console.log(data);

  const xAccessor = (d) => d[metric];

  //? For histograms, the y values represent the number of items within each bin
  const yAccessor = (bin) => bin.length;

  //* Step 2. Create chart dimensions
  const width = 600;

  const dimensions = {
    width,
    //? Histograms are easiest to read when they are wider than they are tall!
    height: width * 0.6,
    margin: {
      top: 30,
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

  wrapper
    .attr("role", "figure")
    .attr("tabindex", 0)
    .append("title")
    .text(
      `Histogram looking at the distribution of ${metric} values for ${filterValue} penguins`
    );

  //* Step 4. Create scales
  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(data, xAccessor))
    .range([0, dimensions.boundedWidth])
    .nice();

  const binGenerator = d3
    .bin()
    .domain(xScale.domain())
    .value(xAccessor)
    .thresholds(12);

  const bins = binGenerator(data);

  const yScale = d3
    .scaleLinear()
    //? For histograms, we want the y axis to always start at 0
    .domain([0, d3.max(bins, yAccessor)])
    .range([dimensions.boundedHeight, 0])
    .nice();

  //* Step 5. Draw Data
  const allBinsGroup = bounds
    .append("g")
    .attr("role", "list")
    .attr("tabindex", "0")
    .attr("aria-label", "histogram bars");

  const binGroups = allBinsGroup
    .selectAll("g")
    .data(bins)
    .join("g")
    .attr("role", "listitem")
    .attr("tabindex", "0")
    .attr(
      "aria-label",
      (bin) =>
        `There were ${yAccessor(
          bin
        )} ${filterValue} penguins with ${metric} between ${bin.x0} and ${
          bin.x1
        }.`
    );

  const barPadding = 1;
  const barRects = binGroups
    .append("rect")
    .attr("x", (d) => xScale(d.x0) + barPadding / 2)
    .attr("y", (bin) => yScale(yAccessor(bin)))
    .attr("width", (d) =>
      //! Make sure we ain't getting any negative widths
      d3.max([0, xScale(d.x1) - xScale(d.x0) - barPadding / 2])
    )
    .attr("height", (bin) => dimensions.boundedHeight - yScale(yAccessor(bin)))
    .attr("fill", fillColor); // "#588dfd"

  const barText = binGroups
    //? We only want the bins with values higher than 0
    .filter(yAccessor)
    .append("text")
    .attr("x", (d) => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
    .attr("y", (bin) => yScale(yAccessor(bin)) - 5)
    .attr("text-anchor", "middle")
    .style("fill", "hsl(0deg 0% 40%)")
    .style("font-size", "12px")
    //? Just display the values directly into the text
    .text(yAccessor);

  //* Step 6. Draw peripherals
  const mean = d3.mean(data, xAccessor);

  const meanLine = bounds
    .append("line")
    .attr("x1", xScale(mean))
    .attr("x2", xScale(mean))
    .attr("y1", -15)
    .attr("y2", dimensions.boundedHeight)
    .attr("stroke", "maroon")
    .attr("stroke-dasharray", "2px 4px");

  const meanLabel = bounds
    .append("text")
    .attr("x", xScale(mean))
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("fill", "maroon")
    .style("font-size", "12px")
    .attr("role", "presentation")
    .attr("aria-hidden", true)
    .text("mean");

  const xAxisGenerator = d3.axisBottom().scale(xScale);

  const xAxis = bounds
    .append("g")
    .call(xAxisGenerator)
    .style("transform", `translateY(${dimensions.boundedHeight}px)`)
    .attr("role", "presentation")
    .attr("aria-hidden", true);

  const xAxisLabel = xAxis
    .append("text")
    .attr("x", dimensions.boundedWidth / 2)
    .attr("y", dimensions.margin.bottom - 10)
    .attr("fill", "black")
    .style("font-size", "1.4em")
    .style("text-anchor", "middle")
    .text(`${metric} for ${filterValue} penguins`);
}

async function drawBars() {
  const rawData = await d3.csv("../data/penguins.csv");

  //* Extra Credit: Draw multiple histograms, one for each species
  const speciesList = ["Adelie", "Gentoo", "Chinstrap"];
  const fillColors = ["#e6ab02", "#1b9e77", "#7570b3"];

  speciesList.forEach((species, idx) =>
    drawHistogram(rawData, "species", species, "body_mass_g", fillColors[idx])
  );
}
drawBars();
