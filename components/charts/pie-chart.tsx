"use client";

import {
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useEffect, useState } from "react";

interface PieChartProps {
  data: Array<{ name: string; value: number }>;
}

// Define useWindowSize hook inline
function useWindowSize() {
  const [windowSize, setWindowSize] = useState<{
    width: number | undefined;
    height: number | undefined;
  }>({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    // Add event listener
    window.addEventListener("resize", handleResize);
    
    // Call handler right away so state gets updated with initial window size
    handleResize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount and unmount
  
  return windowSize;
}

const COLORS = [
  "#FF6384", // pink
  "#36A2EB", // blue
  "#FFCE56", // yellow
  "#4BC0C0", // teal
  "#9966FF", // purple
  "#FF9F40", // orange
];

export default function PieChart({ data }: PieChartProps) {
  const { width } = useWindowSize();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(width ? width < 768 : false);
  }, [width]);

  // Transform data to match expected format
  const chartData = data.map((item, index) => ({
    name: item.name,
    value: item.value,
    fill: COLORS[index % COLORS.length],
  }));

  // Create config based on data
  const chartConfig: ChartConfig = {
    value: {
      label: "Value",
    },
  };

  // Add each item to the config
  data.forEach((item, index) => {
    const key = item.name.toLowerCase().replace(/\s+/g, "");
    chartConfig[key] = {
      label: item.name,
      color: COLORS[index % COLORS.length],
    };
  });

  return (
    <div className="flex flex-col md:py-4">
      <ChartContainer
        config={chartConfig}
        className="w-full mx-auto h-[200px] sm:h-[300px] md:h-[400px] [&_.recharts-text]:fill-background md:w-full md:flex-1"
      >
        <ResponsiveContainer width="100%" height={isMobile ? 350 : 450}>
          <RechartsPieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="name" hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              label={({ name, percent, ...props }) => {
                const shouldShowLabel = true;
                const labelText = `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`;
                
                return shouldShowLabel ? (
                  <text
                    x={props.x}
                    y={props.y}
                    fill="hsla(var(--foreground))"
                    textAnchor={props.textAnchor}
                    dominantBaseline="central"
                    fontSize={isMobile ? 10 : 13}
                    fontWeight={500}
                  >
                    {labelText}
                  </text>
                ) : null;
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
