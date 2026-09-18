"use client";
/*
Design choice: with 144 animals, one bar per animal makes every name illegible. The chart therefore shows the
top N fastest animals per diet (default 10), grouped carnivore -> herbivore -> omnivore and sorted by speed inside
each group, so names stay readable and the groups compare at a glance. The diet filter, the "top N" select, the
hover tooltip and the table view expose everything the default view leaves out.
*/
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { max } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { csv } from "d3-fetch";
import { scaleBand, scaleLinear, scaleOrdinal } from "d3-scale";
import { pointer, select } from "d3-selection";
import { BarChart3, Table2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

interface AnimalDatum {
  name: string;
  speed: number;
  diet: "herbivore" | "omnivore" | "carnivore";
}

// Fixed diet order: it sets both the group order on the x axis and the colour slot of each diet
const diets = z.enum(["carnivore", "herbivore", "omnivore"]);
type Diet = z.infer<typeof diets>;

// Validates each raw CSV row; rows with an unknown diet or a blank or non-numeric speed are dropped (the speed is
// checked as text first because coercing an empty cell would silently give 0)
const animalSchema = z.object({
  name: z.string().trim().min(1),
  speed: z.string().trim().min(1).pipe(z.coerce.number().finite().nonnegative()),
  diet: diets,
});

const dietFilters = z.enum(["all", "carnivore", "herbivore", "omnivore"]);
type DietFilter = z.infer<typeof dietFilters>;
const topNOptions = z.enum(["5", "10", "15", "all"]);
type TopN = z.infer<typeof topNOptions>;

// Colours are CSS custom properties set on the wrapper (light and dark values), so bars follow the theme
const dietColor = scaleOrdinal<Diet, string>()
  .domain(diets.options)
  .range(diets.options.map((diet) => `var(--c-${diet})`));

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const rowKey = (d: AnimalDatum) => `${d.diet}:${d.name}`;

const height = 480;
const margin = { top: 44, right: 8, bottom: 136, left: 56 };
const labelFontSize = 11;
const labelRotation = 40;

interface HoverInfo {
  datum: AnimalDatum;
  x: number;
  y: number;
}

// Top N per diet, in fixed diet order, fastest first inside each group
function selectRows(data: AnimalDatum[], dietFilter: DietFilter, topN: TopN): AnimalDatum[] {
  return diets.options
    .filter((diet) => dietFilter === "all" || diet === dietFilter)
    .flatMap((diet) =>
      data
        .filter((d) => d.diet === diet)
        .sort((a, b) => b.speed - a.speed)
        .slice(0, topN === "all" ? Infinity : Number(topN)),
    );
}

// Arrow keys step through the bars and Home/End jump to the ends; any other key is left to the browser
function keyboardTarget(key: string, index: number, count: number): number | undefined {
  const targets: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: count - 1 };
  const target = targets[key];
  return target !== undefined && target >= 0 && target < count ? target : undefined;
}

function drawChart(
  host: HTMLDivElement,
  rows: AnimalDatum[],
  width: number,
  onHover: (info: HoverInfo | null) => void,
) {
  const plotWidth = width - margin.left - margin.right;

  // One band scale over composite keys; a spacer slot between diet groups gives the visible gap
  const x = scaleBand()
    .domain(
      rows.flatMap((d, i) => {
        const previous = rows[i - 1];
        return previous && previous.diet !== d.diet ? [`gap:${d.diet}`, rowKey(d)] : [rowKey(d)];
      }),
    )
    .range([margin.left, width - margin.right])
    .paddingInner(0.2)
    .paddingOuter(0.1);
  const y = scaleLinear()
    .domain([0, max(rows, (d) => d.speed) ?? 0])
    .nice()
    .range([height - margin.bottom, margin.top]);
  const barWidth = Math.min(x.bandwidth(), 24);
  const barX = (d: AnimalDatum) => (x(rowKey(d)) ?? 0) + (x.bandwidth() - barWidth) / 2;
  // Thin the x labels once the spacing between the rotated labels, measured across the text, drops below a line
  const labelStep = Math.max(
    1,
    Math.ceil((labelFontSize * 1.3) / (x.step() * Math.sin((labelRotation * Math.PI) / 180))),
  );

  const svg = select(host)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "overflow-visible")
    .attr("role", "group")
    .attr("aria-label", "Bar chart of animal speed by diet");

  // Clip at the baseline so the bars' rounded bottom corners are cut off and only the tops stay rounded
  svg
    .append("defs")
    .append("clipPath")
    .attr("id", "speed-plot-clip")
    .append("rect")
    .attr("x", margin.left)
    .attr("y", 0)
    .attr("width", plotWidth)
    .attr("height", y(0));

  svg
    .append("g")
    .attr("class", "text-muted-foreground")
    .attr("stroke", "currentColor")
    .attr("stroke-opacity", 0.25)
    .selectAll("line")
    .data(y.ticks(6))
    .join("line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", (tick) => y(tick))
    .attr("y2", (tick) => y(tick));

  svg
    .append("g")
    .attr("class", "text-muted-foreground")
    .attr("transform", `translate(0,${y(0)})`)
    .call(
      axisBottom(x)
        .tickValues(rows.filter((_, i) => i % labelStep === 0).map(rowKey))
        .tickFormat((key) => key.slice(key.indexOf(":") + 1))
        .tickSizeOuter(0),
    )
    .attr("font-family", null)
    .attr("font-size", labelFontSize)
    .selectAll("text")
    .attr("transform", `rotate(-${labelRotation})`)
    .attr("text-anchor", "end")
    .attr("dx", "-0.8em")
    .attr("dy", "0.15em");

  svg
    .append("g")
    .attr("class", "text-muted-foreground")
    .attr("transform", `translate(${margin.left},0)`)
    .call(axisLeft(y).ticks(6).tickSizeOuter(0))
    .attr("font-family", null)
    .attr("font-size", labelFontSize);

  const axisTitle = (transform: string, text: string) =>
    svg
      .append("text")
      .attr("transform", transform)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", 12)
      .text(text);
  axisTitle(`translate(${margin.left + plotWidth / 2},${height - 6})`, "Animal");
  axisTitle(`translate(14,${(margin.top + height - margin.bottom) / 2}) rotate(-90)`, "Speed (km/h)");

  const bars = svg
    .append("g")
    .attr("clip-path", "url(#speed-plot-clip)")
    .selectAll<SVGRectElement, AnimalDatum>("rect")
    .data(rows)
    .join("rect")
    .attr("x", barX)
    .attr("y", (d) => y(d.speed))
    .attr("width", barWidth)
    .attr("height", (d) => y(0) - y(d.speed) + 4)
    .attr("rx", 4)
    // The chart is one tab stop: only the active bar is tabbable and the arrow keys move between bars
    .attr("tabindex", (_, i) => (i === 0 ? 0 : -1))
    .attr("role", "img")
    .attr("aria-label", (d) => `${d.name}, ${d.diet}, ${d.speed} km/h`)
    .style("fill", (d) => dietColor(d.diet));
  const barNodes = bars.nodes();

  // Hover or keyboard focus highlights one bar and reports it for the tooltip
  const show = (d: AnimalDatum, [px, py]: [number, number]) => {
    bars.attr("opacity", (bar) => (bar === d ? 1 : 0.35));
    onHover({ datum: d, x: px, y: py });
  };
  const hide = () => {
    bars.attr("opacity", 1);
    onHover(null);
  };
  bars
    .on("pointermove", (event: PointerEvent, d) => show(d, pointer(event, host)))
    .on("pointerleave", hide)
    .on("focus", (_event, d) => show(d, [barX(d) + barWidth / 2, y(d.speed)]))
    .on("blur", hide)
    .on("keydown", (event: KeyboardEvent, d) => {
      const target = keyboardTarget(event.key, rows.indexOf(d), rows.length);
      if (target === undefined) return;
      event.preventDefault();
      bars.attr("tabindex", (_, i) => (i === target ? 0 : -1));
      barNodes[target]?.focus();
    });

  // Legend sits in the top margin, right-aligned, so it never covers bars
  let cursor = 0;
  const legendItems = diets.options.map((diet) => {
    const item = { diet, x: cursor };
    cursor += 34 + diet.length * 7;
    return item;
  });
  const legend = svg
    .append("g")
    .attr("font-size", 12)
    .attr("transform", `translate(${width - margin.right - cursor + 12},10)`)
    .selectAll("g")
    .data(legendItems)
    .join("g")
    .attr("transform", (item) => `translate(${item.x},0)`);
  legend
    .append("rect")
    .attr("width", 10)
    .attr("height", 10)
    .attr("rx", 2)
    .style("fill", (item) => dietColor(item.diet));
  legend
    .append("text")
    .attr("x", 15)
    .attr("y", 9)
    .attr("fill", "currentColor")
    .text((item) => capitalize(item.diet));
}

function SpeedTable({ rows }: { rows: AnimalDatum[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Animal</TableHead>
          <TableHead>Diet</TableHead>
          <TableHead className="text-right">Speed (km/h)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={rowKey(row)}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{capitalize(row.diet)}</TableCell>
            <TableCell className="text-right tabular-nums">{row.speed}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AnimalSpeedGraph() {
  const graphRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<AnimalDatum[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [dietFilter, setDietFilter] = useState<DietFilter>("all");
  const [topN, setTopN] = useState<TopN>("10");
  const [showTable, setShowTable] = useState(false);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const rows = useMemo(() => selectRows(data ?? [], dietFilter, topN), [data, dietFilter, topN]);

  // Load and validate the CSV once; ignore the result if the component unmounted meanwhile
  useEffect(() => {
    let active = true;
    csv("/sample_animals.csv", (row) => {
      const parsed = animalSchema.safeParse(row);
      return parsed.success ? parsed.data : null;
    })
      .then((loaded) => {
        if (active) setData(loaded);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Track the container width so the chart redraws on resize
  useEffect(() => {
    const host = graphRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = graphRef.current;
    if (!host) return;
    // Clear the previous SVG before every redraw
    select(host).selectAll("*").remove();
    setHover(null);
    if (width > 0 && rows.length > 0) drawChart(host, rows, width, setHover);
  }, [rows, width]);

  return (
    <div className="text-foreground [--c-carnivore:#2a78d6] [--c-herbivore:#eb6834] [--c-omnivore:#149d6d] [:is(.dark,[data-theme=dark])_&]:[--c-carnivore:#3987e5] [:is(.dark,[data-theme=dark])_&]:[--c-herbivore:#d95926] [:is(.dark,[data-theme=dark])_&]:[--c-omnivore:#199e70]">
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <span id="diet-filter-label" className="text-sm font-medium leading-none">
            Diet
          </span>
          <div role="group" aria-labelledby="diet-filter-label" className="flex flex-wrap gap-1">
            {dietFilters.options.map((filter) => (
              <Button
                key={filter}
                variant={filter === dietFilter ? "default" : "outline"}
                aria-pressed={filter === dietFilter}
                onClick={() => setDietFilter(filter)}
              >
                {capitalize(filter)}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="top-n">Show top N per diet</Label>
          <Select value={topN} onValueChange={(value) => setTopN(topNOptions.parse(value))}>
            <SelectTrigger id="top-n" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topNOptions.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {capitalize(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="sm:ml-auto" onClick={() => setShowTable((value) => !value)}>
          {showTable ? <BarChart3 className="mr-2 h-4 w-4" /> : <Table2 className="mr-2 h-4 w-4" />}
          {showTable ? "View as chart" : "View as table"}
        </Button>
      </div>
      {loadFailed && <p className="text-sm text-destructive">Could not load the animal speed data.</p>}
      {!data && !loadFailed && <p className="text-sm text-muted-foreground">Loading animal speeds...</p>}
      {data && rows.length === 0 && <p className="text-sm text-muted-foreground">No animals match this filter.</p>}
      <div hidden={showTable || !data} className="relative w-full">
        <div ref={graphRef} className="h-[480px] w-full" />
        {hover && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            style={
              hover.x < width / 2
                ? { left: hover.x + 12, top: hover.y - 12 }
                : { right: width - hover.x + 12, top: hover.y - 12 }
            }
          >
            <p className="font-medium">{hover.datum.name}</p>
            <p className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: dietColor(hover.datum.diet) }}
              />
              {capitalize(hover.datum.diet)}
              <span className="font-semibold">{hover.datum.speed} km/h</span>
            </p>
          </div>
        )}
      </div>
      {showTable && data && <SpeedTable rows={rows} />}
    </div>
  );
}
