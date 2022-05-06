async function drawLineChart() {
  //* Step 1. Access data
  let dataset = await d3.json("../data/my_weather_data.json");

  const yAccessor = (d) => d.humidity;

  const dateParser = d3.timeParse("%Y-%m-%d");
  const dateFormatter = d3.timeFormat("%Y-%m-%d");
  const xAccessor = (d) => dateParser(d.date);

  dataset = dataset.sort((a, b) => xAccessor(a) - xAccessor(b));
  //! Let's downsample the data to one point per week
  //? We have a `downsampleData()` function at the bottom of the file
  //? that we can pass our dataset, xAccessor, and yAccessor
  //? and receive a downsampled dataset with weekly values.
  const downsampledData = downsampleData(dataset, xAccessor, yAccessor);

  const weeks = d3.timeWeeks(
    xAccessor(dataset[0]),
    xAccessor(dataset[dataset.length - 1])
  );

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

  const defs = bounds.append("defs");

  //* Step 4. Create scales
  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(dataset, yAccessor))
    .range([dimensions.boundedHeight, 0])
    .nice(5);

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(dataset, xAccessor))
    .range([0, dimensions.boundedWidth]);

  //! Let's simplify a bit and take out the grid marks and chart background.
  // const yAxisGeneratorGridMarks = d3
  //   .axisLeft(yScale)
  //   .ticks()
  //   .tickSize(-dimensions.boundedWidth)
  //   .tickFormat("");

  // const yAxisGridMarks = bounds
  //   .append("g")
  //   .attr("class", "y-axis-grid-marks")
  //   .call(yAxisGeneratorGridMarks);

  //* Step 5. Draw data
  //! We want to focus on trends based on the time of year.
  //? We're showing the months on our x axis, but we can do some work for the reader
  //? and highlight the different seasons.
  const seasonBoundaries = ["3-20", "6-21", "9-21", "12-21"];
  const seasonNames = ["Spring", "Summer", "Fall", "Winter"];

  let seasonsData = [];
  const startDate = xAccessor(dataset[0]);
  const endDate = xAccessor(dataset[dataset.length - 1]);
  const years = d3.timeYears(d3.timeMonth.offset(startDate, -13), endDate);

  years.forEach((yearDate) => {
    const year = +d3.timeFormat("%Y")(yearDate);

    seasonBoundaries.forEach((boundary, index) => {
      const seasonStart = dateParser(`${year}-${boundary}`);
      const seasonEnd = seasonBoundaries[index + 1]
        ? dateParser(`${year}-${seasonBoundaries[index + 1]}`)
        : dateParser(`${year + 1}-${seasonBoundaries[0]}`);

      const boundaryStart = d3.max([startDate, seasonStart]);
      const boundaryEnd = d3.min([endDate, seasonEnd]);

      const days = dataset.filter(
        (d) => xAccessor(d) > boundaryStart && xAccessor(d) <= boundaryEnd
      );

      if (!days.length) return;

      seasonsData.push({
        start: boundaryStart,
        end: boundaryEnd,
        name: seasonNames[index],
        mean: d3.mean(days, yAccessor),
      });
    });
  });

  //! Let's block out each season with a <rect> underneath our main data elements.
  const seasonOffset = 10;
  const seasons = bounds
    .selectAll(".season")
    .data(seasonsData)
    .join("rect")
    .attr("x", (d) => xScale(d.start))
    .attr("width", (d) => xScale(d.end) - xScale(d.start))
    .attr("y", seasonOffset)
    .attr("height", dimensions.boundedHeight - seasonOffset)
    .attr("class", (d) => `season ${d.name}`);

  const lineGenerator = d3
    .area()
    .x((d) => xScale(xAccessor(d)))
    .y((d) => yScale(yAccessor(d)))
    .curve(d3.curveBasis);

  const line = bounds
    .append("path")
    .attr("class", "line")
    .attr("d", lineGenerator(downsampledData));

  //! Let's add the original points back in, in the form of small circles.
  //? We don't want to lose the granularity of the original data,
  //? even when we're getting the basic trend with the downsampled line.
  const dots = bounds
    .selectAll(".dot")
    .data(dataset)
    .join("circle")
    .attr("cx", (d) => xScale(xAccessor(d)))
    .attr("cy", (d) => yScale(yAccessor(d)))
    .attr("r", 2)
    .attr("class", "dot");

  //* Step 6. Draw peripherals
  //! While we've made it easier to compare trends across seasons,
  //! it's not easy to conclude how the seasons compare in general.
  //? Let's add seasonal means as lines, which should enhance the chart
  //? but not take away from the main picture.
  const seasonMeans = bounds
    .selectAll(".season-mean")
    .data(seasonsData)
    .join("line")
    .attr("x1", (d) => xScale(d.start))
    .attr("x2", (d) => xScale(d.end))
    .attr("y1", (d) => yScale(d.mean))
    .attr("y2", (d) => yScale(d.mean))
    .attr("class", "season-mean");
  const seasonMeanLabel = bounds
    .append("text")
    .attr("x", -15)
    .attr("y", yScale(seasonsData[0].mean))
    .attr("class", "season-mean-label")
    .text("Season mean");

  const yAxisGenerator = d3.axisLeft().scale(yScale).ticks(3);

  const yAxis = bounds.append("g").attr("class", "y-axis").call(yAxisGenerator);

  const yAxisLabel = yAxis
    .append("text")
    .attr("y", -dimensions.margin.left + 10)
    .attr("x", -dimensions.boundedHeight / 2)
    .attr("class", "y-axis-label")
    .text("relative humidity");

  //! Let's signify the units of our y axis by incorporating it
  //! into a phrase with our top y tick value.
  //? Human-readable labels can do some of the digesting work
  //? a reader has to do, hinting at how to interpret a number.
  const yAxisLabelSuffix = bounds
    .append("text")
    .attr("y", 5.5)
    .text("relative humidity")
    .attr("class", "y-axis-label y-axis-label-suffix");

  //! Let's label the seasons directly on the chart instead of having an x axis
  // const xAxisGenerator = d3.axisBottom().scale(xScale).ticks();

  // const xAxis = bounds
  //   .append("g")
  //   .attr("class", "x-axis")
  //   .style("transform", `translateY(${dimensions.boundedHeight}px)`)
  //   .call(xAxisGenerator);

  const seasonLabels = bounds
    .selectAll(".season-label")
    .data(seasonsData)
    .join("text")
    .filter((d) => xScale(d.end) - xScale(d.start) > 60)
    .attr("x", (d) => xScale(d.start) + (xScale(d.end) - xScale(d.start)) / 2)
    .attr("y", dimensions.boundedHeight + 30)
    .text((d) => d.name)
    .attr("class", "season-label");
}
drawLineChart();

function downsampleData(data, xAccessor, yAccessor) {
  const weeks = d3.timeWeeks(
    xAccessor(data[0]),
    xAccessor(data[data.length - 1])
  );

  return weeks.map((week, index) => {
    const weekEnd = weeks[index + 1] || new Date();
    const days = data.filter(
      (d) => xAccessor(d) > week && xAccessor(d) <= weekEnd
    );
    return {
      date: d3.timeFormat("%Y-%m-%d")(week),
      humidity: d3.mean(days, yAccessor),
    };
  });
}
