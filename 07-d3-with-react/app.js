//? For this section, I'm using React via a <script> tag added to my HTML file
//? so that I can seamlessly combine this section with the other sections
//? that use pure HTML+CSS+JS, into the same repo already hosted via Github Pages.
//? I'll also be keeping every single React component into this one file.
//? Normally you might want something like create-react-app/vite/etc instead.
//! DO NOT TRY THIS AT HOME

//#region App Utils
function randomAroundMean(mean, deviation) {
  return mean + boxMullerRandom() * deviation;
}
function boxMullerRandom() {
  return (
    Math.sqrt(-2.0 * Math.log(Math.random())) *
    Math.cos(2.0 * Math.PI * Math.random())
  );
}

const today = new Date();
const formatDate = d3.timeFormat("%m/%d/%Y");
function getTimelineData(length = 100) {
  let lastTemperature = randomAroundMean(70, 20);
  const firstTemperature = d3.timeDay.offset(today, -length);

  return new Array(length).fill(0).map((d, i) => {
    lastTemperature += randomAroundMean(0, 2);
    return {
      date: formatDate(d3.timeDay.offset(firstTemperature, i)),
      temperature: lastTemperature,
    };
  });
}

function getScatterData(count = 100) {
  return new Array(count).fill(0).map((d, i) => ({
    temperature: randomAroundMean(70, 20),
    humidity: randomAroundMean(0.5, 0.1),
  }));
}
//#endregion App Utils

//#region Chart Utils
function callAccessor(accessor, d, i) {
  return typeof accessor === "function" ? accessor(d, i) : accessor;
}

function combineChartDimensions(dimensions) {
  let parsedDimensions = {
    marginTop: 40,
    marginRight: 30,
    marginBottom: 40,
    marginLeft: 75,
    ...dimensions,
  };

  return {
    ...parsedDimensions,
    boundedHeight: Math.max(
      parsedDimensions.height -
        parsedDimensions.marginTop -
        parsedDimensions.marginBottom,
      0
    ),
    boundedWidth: Math.max(
      parsedDimensions.width -
        parsedDimensions.marginLeft -
        parsedDimensions.marginRight,
      0
    ),
  };
}

function useChartDimensions(passedSettings) {
  const ref = React.useRef();
  const dimensions = combineChartDimensions(passedSettings);

  const [width, changeWidth] = React.useState(0);
  const [height, changeHeight] = React.useState(0);

  React.useEffect(() => {
    if (dimensions.width && dimensions.height) return [ref, dimensions];

    const element = ref.current;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!Array.isArray(entries)) return;
      if (!entries.length) return;

      const entry = entries[0];

      if (width !== entry.contentRect.width)
        changeWidth(entry.contentRect.width);
      if (height !== entry.contentRect.height)
        changeHeight(entry.contentRect.height);
    });

    resizeObserver.observe(element);

    return () => resizeObserver.unobserve(element);
  }, [passedSettings, height, width, dimensions]);

  const newSettings = combineChartDimensions({
    ...dimensions,
    width: dimensions.width || width,
    height: dimensions.height || height,
  });

  return [ref, newSettings];
}

let _lastId = 0;
function useUniqueId(prefix = "") {
  _lastId++;
  return [prefix, _lastId].join("-");
}
//#endregion Chart Utils

//#region Chart Fragments
//#region Chart
const ChartContext = React.createContext();

function useDimensionsContext() {
  return React.useContext(ChartContext);
}

function Chart({ dimensions = {}, children }) {
  return (
    <ChartContext.Provider value={dimensions}>
      <svg
        className="Chart"
        width={dimensions.width}
        height={dimensions.height}
      >
        <g
          transform={`translate(${dimensions.marginLeft}, ${dimensions.marginTop})`}
        >
          {children}
        </g>
      </svg>
    </ChartContext.Provider>
  );
}
//#endregion Chart

//#region Axis-Naive
// const formatNumber = d3.format(",");

// const axisGeneratorsByDimension = {
//   x: "axisBottom",
//   y: "axisLeft",
// };

// function Axis({ dimension = "x", scale, ...props }) {
//   const dimensions = useDimensionsContext();
//   const ref = React.useRef();

//   const axisGenerator = d3[axisGeneratorsByDimension[dimension]]().scale(scale);
//   if (ref.current) {
//     d3.select(ref.current).transition().call(axisGenerator);
//   }

//   return (
//     <g
//       {...props}
//       className="Axis"
//       ref={ref}
//       transform={
//         dimension === "x" ? `translate(0, ${dimensions.boundedHeight})` : null
//       }
//     />
//   );
// }
//#endregion Axis-Naive

//#region Axis
const formatNumber = d3.format(",");
const axisComponentsByDimension = {
  x: AxisHorizontal,
  y: AxisVertical,
};

function Axis({
  dimension = "x",
  scale = null,
  formatTick = formatNumber,
  ...props
}) {
  const dimensions = useDimensionsContext();
  const Component = axisComponentsByDimension[dimension];
  if (!Component) {
    return null;
  }

  return (
    <Component
      {...props}
      scale={scale}
      formatTick={formatTick}
      dimensions={dimensions}
    />
  );
}

function AxisHorizontal({ dimensions, label, formatTick, scale, ...props }) {
  //? Let's aim for one tick per 100 pixels for small screens
  //? and one tick per 250 pixels for wider screens
  const numberOfTicks =
    dimensions.boundedWidth < 600
      ? dimensions.boundedWidth / 100
      : dimensions.boundedWidth / 250;
  const ticks = scale.ticks(numberOfTicks);

  return (
    <g
      className="Axis AxisHorizontal"
      {...props}
      transform={`translate(0, ${dimensions.boundedHeight})`}
    >
      <line className="Axis__line" x2={dimensions.boundedWidth} />
      {ticks.map((tick, i) => (
        <text
          key={i}
          className="Axis__tick"
          transform={`translate(${scale(tick)}, 25)`}
        >
          {formatTick(tick)}
        </text>
      ))}
      {label ? (
        <text
          className="Axis__label"
          transform={`translate(${dimensions.boundedWidth / 2}, 50)`}
          textAnchor="middle"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

function AxisVertical({ dimensions, label, formatTick, scale, ...props }) {
  const numberOfTicks = dimensions.boundedHeight / 70;
  const ticks = scale.ticks(numberOfTicks);

  return (
    <g className="Axis AxisVertical" {...props}>
      <line className="Axis__line" y2={dimensions.boundedHeight} />
      {ticks.map((tick, i) => (
        <text
          key={i}
          className="Axis__tick"
          transform={`translate(-16, ${scale(tick)})`}
        >
          {formatTick(tick)}
        </text>
      ))}
      {label ? (
        <text
          className="Axis__label"
          transform={`translate(-56, ${
            dimensions.boundedHeight / 2
          }) rotate(-90)`}
          textAnchor="middle"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}
//#endregion Chart

//#region Bars
function Bars({
  data,
  keyAccessor,
  xAccessor,
  yAccessor,
  widthAccessor,
  heightAccessor,
  ...props
}) {
  return (
    <>
      {data.map((d, i) => (
        <rect
          {...props}
          className="Bars__rect"
          key={keyAccessor(d, i)}
          x={callAccessor(xAccessor, d, i)}
          y={callAccessor(yAccessor, d, i)}
          width={d3.max([callAccessor(widthAccessor, d, i), 0])}
          height={d3.max([callAccessor(heightAccessor, d, i), 0])}
        />
      ))}
    </>
  );
}
//#endregion Bars

//#region Circles
function Circles({ data, keyAccessor, xAccessor, yAccessor, radius = 5 }) {
  return (
    <>
      {data.map((d, i) => (
        <circle
          className="Circles__circle"
          key={keyAccessor(d, i)}
          cx={xAccessor(d, i)}
          cy={yAccessor(d, i)}
          r={typeof radius == "function" ? radius(d) : radius}
        />
      ))}
    </>
  );
}
//#endregion Circles

//#region Gradient
function Gradient({ id = "Gradient", colors = [], ...props }) {
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      spreadMethod="pad"
      {...props}
    >
      {colors.map((color, i) => (
        <stop
          key={`gradient-stop-${i}`}
          offset={`${(i * 100) / (colors.length - 1)}%`}
          stopColor={color}
        />
      ))}
    </linearGradient>
  );
}
//#endregion Gradient

//#region Line
function Line({
  type = "line",
  data,
  xAccessor,
  yAccessor,
  y0Accessor = 0,
  interpolation = d3.curveMonotoneX,
  ...props
}) {
  const lineGenerator = d3[type]()
    .x(xAccessor)
    .y(yAccessor)
    .curve(interpolation);

  if (type == "area") {
    lineGenerator.y0(y0Accessor).y1(yAccessor);
  }

  const line = lineGenerator(data);

  return <path {...props} className={`Line Line--type-${type}`} d={line} />;
}
//#endregion Line
//#endregion Chart Fragments

//#region Timeline Chart
const formatTimelineDate = d3.timeFormat("%-b %-d");
// const timelineGradientColors = ["rgb(226, 222, 243)", "#f8f9fa"];
const timelineGradientColors = ["hsl(251deg 47% 91%)", "hsl(210deg 17% 98%)"];

function Timeline({
  data,
  xAccessor = (d) => d.x,
  yAccessor = (d) => d.y,
  label,
}) {
  const [ref, dimensions] = useChartDimensions();
  const gradientId = useUniqueId("Timeline-gradient");

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(data, xAccessor))
    .range([0, dimensions.boundedWidth]);

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(data, yAccessor))
    .range([dimensions.boundedHeight, 0])
    .nice();

  const xAccessorScaled = (d) => xScale(xAccessor(d));
  const yAccessorScaled = (d) => yScale(yAccessor(d));
  const y0AccessorScaled = yScale(yScale.domain()[0]);

  return (
    <div className="Timeline" ref={ref}>
      <Chart dimensions={dimensions}>
        <defs>
          <Gradient
            id={gradientId}
            colors={timelineGradientColors}
            x2="0"
            y2="100%"
          />
        </defs>
        <Axis dimension="x" scale={xScale} formatTick={formatTimelineDate} />
        <Axis dimension="y" scale={yScale} label={label} />
        <Line
          type="area"
          data={data}
          xAccessor={xAccessorScaled}
          yAccessor={yAccessorScaled}
          y0Accessor={y0AccessorScaled}
          style={{ fill: `url(#${gradientId})` }}
        />
        <Line
          data={data}
          xAccessor={xAccessorScaled}
          yAccessor={yAccessorScaled}
        />
      </Chart>
    </div>
  );
}
//#endregion Timeline Chart

//#region Scatter Plot Chart
function ScatterPlot({
  data,
  xAccessor = (d) => d.x,
  yAccessor = (d) => d.y,
  xLabel,
  yLabel,
}) {
  const [ref, dimensions] = useChartDimensions({
    marginBottom: 77,
  });

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

  const xAccessorScaled = (d) => xScale(xAccessor(d));
  const yAccessorScaled = (d) => yScale(yAccessor(d));
  const keyAccessor = (d, i) => `scatter-dot-${i}`;

  return (
    <div className="ScatterPlot" ref={ref}>
      <Chart dimensions={dimensions}>
        <Axis
          dimensions={dimensions}
          dimension="x"
          scale={xScale}
          label={xLabel}
        />
        <Axis
          dimensions={dimensions}
          dimension="y"
          scale={yScale}
          label={yLabel}
        />
        <Circles
          data={data}
          keyAccessor={keyAccessor}
          xAccessor={xAccessorScaled}
          yAccessor={yAccessorScaled}
        />
      </Chart>
    </div>
  );
}
//#endregion Scatter Plot Chart

//#region Histogram Chart
// const histogramGradientColors = ["#9980FA", "rgb(226, 222, 243)"];
const histogramGradientColors = ["hsl(252deg 92% 74%)", "hsl(251deg 47% 91%)"];
function Histogram({ data, xAccessor = (d) => d.x, label }) {
  const gradientId = useUniqueId("Histogram-gradient");
  const [ref, dimensions] = useChartDimensions({
    marginBottom: 77,
  });

  const numberOfThresholds = 9;

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(data, xAccessor))
    .range([0, dimensions.boundedWidth])
    .nice(numberOfThresholds);

  const binsGenerator = d3
    .histogram()
    .domain(xScale.domain())
    .value(xAccessor)
    .thresholds(xScale.ticks(numberOfThresholds));

  const bins = binsGenerator(data);

  const yAccessor = (d) => d.length;
  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(bins, yAccessor)])
    .range([dimensions.boundedHeight, 0])
    .nice();

  const barPadding = 2;

  const xAccessorScaled = (d) => xScale(d.x0) + barPadding;
  const yAccessorScaled = (d) => yScale(yAccessor(d));
  const widthAccessorScaled = (d) => xScale(d.x1) - xScale(d.x0) - barPadding;
  const heightAccessorScaled = (d) =>
    dimensions.boundedHeight - yScale(yAccessor(d));
  const keyAccessor = (d, i) => `histogram-bin-${i}`;

  return (
    <div className="Histogram" ref={ref}>
      <Chart dimensions={dimensions}>
        <defs>
          <Gradient
            id={gradientId}
            colors={histogramGradientColors}
            x2="0"
            y2="100%"
          />
        </defs>
        <Axis
          dimensions={dimensions}
          dimension="x"
          scale={xScale}
          label={label}
        />
        <Axis
          dimensions={dimensions}
          dimension="y"
          scale={yScale}
          label="Count"
        />
        <Bars
          data={bins}
          keyAccessor={keyAccessor}
          xAccessor={xAccessorScaled}
          yAccessor={yAccessorScaled}
          widthAccessor={widthAccessorScaled}
          heightAccessor={heightAccessorScaled}
          style={{ fill: `url(#${gradientId})` }}
        />
      </Chart>
    </div>
  );
}
//#endregion Histogram Chart

//#region Main App
const parseDate = d3.timeParse("%m/%d/%Y");
const dateAccessor = (d) => parseDate(d.date);
const temperatureAccessor = (d) => d.temperature;
const humidityAccessor = (d) => d.humidity;

function getData() {
  return {
    timeline: getTimelineData(),
    scatter: getScatterData(),
  };
}
function App() {
  const [data, setData] = React.useState(getData());

  useInterval(() => {
    setData(getData());
  }, 4000);

  return (
    <div className="App">
      <h1>Weather Dashboard</h1>
      <div className="App__charts">
        <Timeline
          data={data.timeline}
          xAccessor={dateAccessor}
          yAccessor={temperatureAccessor}
          label="Temperature"
        />
        <ScatterPlot
          data={data.scatter}
          xAccessor={humidityAccessor}
          yAccessor={temperatureAccessor}
          xLabel="Humidity"
          yLabel="Temperature"
        />
        <Histogram
          data={data.scatter}
          xAccessor={humidityAccessor}
          label="Humidity"
        />
      </div>
    </div>
  );
}

function useInterval(callback, delay) {
  const savedCallback = React.useRef();

  // Remember the latest callback.
  React.useEffect(() => {
    savedCallback.current = callback;
  });

  // Set up the interval.
  React.useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
//#endregion Main App

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
