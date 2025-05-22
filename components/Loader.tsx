"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(DrawSVGPlugin);

export default function Loader() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const mid = gsap.utils.toArray("#mid *").reverse();

    const fatTl = gsap.timeline();
    fatTl.fromTo(
      "#fat *",
      {
        drawSVG: "0% 20%",
      },
      {
        drawSVG: "40% 69%",
        stagger: {
          each: 0.05,
          repeat: -1,
          yoyo: true,
        },
        duration: 0.75,
        ease: "sine.inOut",
      }
    );

    const midTl = gsap.timeline();
    midTl.fromTo(
      mid,
      {
        drawSVG: "0% 20%",
      },
      {
        drawSVG: "56% 86%",
        stagger: {
          each: 0.08,
          repeat: -1,
          yoyo: true,
        },
        duration: 0.81,
        ease: "sine.inOut",
      }
    );

    const thinTl = gsap.timeline();
    thinTl.fromTo(
      "#thin *",
      {
        drawSVG: "20% 51%",
      },
      {
        drawSVG: "40% 80%",
        stagger: {
          each: 0.092,
          repeat: -1,
          yoyo: true,
        },
        duration: 1.4,
        ease: "sine.inOut",
      }
    );

    const mainTl = gsap.timeline();
    mainTl.add([fatTl, midTl, thinTl], 0);

    return () => {
      mainTl.kill();
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        ref={svgRef}
        id="mainSVG"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 600"
        className="w-100 h-100"
        role="img"
        aria-label="Loading animation"
      >
        <title>Loading animation</title>
        <linearGradient
          id="grad1"
          x1="393.05"
          y1="400"
          x2="393.05"
          y2="200"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#3D28F7" />
          <stop offset="1" stopColor="#FF3C20" />
        </linearGradient>

        <linearGradient
          id="grad2"
          x1="393.05"
          y1="391.01"
          x2="393.05"
          y2="247.71"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#F72785" />
          <stop offset="1" stopColor="#FFEE2A" />
        </linearGradient>

        <linearGradient
          id="grad3"
          x1="393.05"
          y1="400"
          x2="393.05"
          y2="200"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FF6820" />
          <stop offset="1" stopColor="#D1FE21" />
        </linearGradient>

        <linearGradient
          id="grad4"
          x1="393.05"
          y1="400"
          x2="393.05"
          y2="250"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#35AAF9" />
          <stop offset="1" stopColor="#993BDC" />
        </linearGradient>

        <g>
          <g
            id="bg"
            stroke="url(#grad3)"
            fill="none"
            strokeLinecap="round"
            strokeMiterlimit="10"
          >
            <path d="M594.5,250v-.29L594.6,350" />
            <line x1="580.5" y1="390" x2="580.32" y2="210" />
            <line x1="565.5" y1="415" x2="565.28" y2="185" />
            <line x1="550.5" y1="434" x2="550.24" y2="166" />
            <line x1="535.5" y1="449" x2="535.22" y2="151" />
            <line x1="520.5" y1="462" x2="520.2" y2="138" />
            <line x1="505.5" y1="472" x2="505.18" y2="128" />
            <line x1="490.5" y1="480" x2="490.16" y2="120" />
            <line x1="475.5" y1="487" x2="475.14" y2="113" />
            <line x1="460.5" y1="492" x2="460.14" y2="108" />
            <line x1="445.5" y1="496" x2="445.12" y2="104" />
            <line x1="430.5" y1="499" x2="430.12" y2="101" />
            <line x1="415.5" y1="501" x2="415.12" y2="99" />
            <line x1="400.5" y1="501" x2="400.12" y2="99" />
            <line x1="385.5" y1="501" x2="385.12" y2="99" />
            <line x1="370.5" y1="499" x2="370.12" y2="101" />
            <line x1="355.5" y1="496" x2="355.12" y2="104" />
            <line x1="340.5" y1="492" x2="340.14" y2="108" />
            <line x1="325.5" y1="487" x2="325.14" y2="113" />
            <line x1="310.5" y1="480" x2="310.16" y2="120" />
            <line x1="295.5" y1="472" x2="295.18" y2="128" />
            <line x1="280.5" y1="462" x2="280.2" y2="138" />
            <line x1="265.5" y1="449" x2="265.22" y2="151" />
            <line x1="250.5" y1="434" x2="250.24" y2="166" />
            <line x1="235.5" y1="415" x2="235.28" y2="185" />
            <line x1="220.5" y1="390" x2="220.32" y2="210" />
            <polyline points="204.5 250 204.5 350.29 204.5 350" />
          </g>
          <g
            id="thin"
            stroke="url(#grad1)"
            fill="none"
            strokeLinecap="round"
            strokeMiterlimit="10"
            strokeWidth="2"
          >
            <path d="M594.6,350l-.1-100.29V250" />
            <line x1="580.5" y1="390" x2="580.32" y2="210" />
            <line x1="565.5" y1="415" x2="565.28" y2="185" />
            <line x1="550.5" y1="434" x2="550.24" y2="166" />
            <line x1="535.5" y1="449" x2="535.22" y2="151" />
            <line x1="520.5" y1="462" x2="520.2" y2="138" />
            <line x1="505.5" y1="472" x2="505.18" y2="128" />
            <line x1="490.5" y1="480" x2="490.16" y2="120" />
            <line x1="475.5" y1="487" x2="475.14" y2="113" />
            <line x1="460.5" y1="492" x2="460.14" y2="108" />
            <line x1="445.5" y1="496" x2="445.12" y2="104" />
            <line x1="430.5" y1="499" x2="430.12" y2="101" />
            <line x1="415.5" y1="501" x2="415.12" y2="99" />
            <line x1="400.5" y1="501" x2="400.12" y2="99" />
            <line x1="385.5" y1="501" x2="385.12" y2="99" />
            <line x1="370.5" y1="499" x2="370.12" y2="101" />
            <line x1="355.5" y1="496" x2="355.12" y2="104" />
            <line x1="340.5" y1="492" x2="340.14" y2="108" />
            <line x1="325.5" y1="487" x2="325.14" y2="113" />
            <line x1="310.5" y1="480" x2="310.16" y2="120" />
            <line x1="295.5" y1="472" x2="295.18" y2="128" />
            <line x1="280.5" y1="462" x2="280.2" y2="138" />
            <line x1="265.5" y1="449" x2="265.22" y2="151" />
            <line x1="250.5" y1="434" x2="250.24" y2="166" />
            <line x1="235.5" y1="415" x2="235.28" y2="185" />
            <line x1="220.5" y1="390" x2="220.32" y2="210" />
            <polyline points="204.5 350 204.5 350.29 204.5 250" />
          </g>
          <g
            id="mid"
            stroke="url(#grad2)"
            fill="none"
            strokeLinecap="round"
            strokeMiterlimit="10"
            strokeWidth="4"
          >
            <path d="M594.6,350l-.1-100.29V250" />
            <line x1="580.5" y1="390" x2="580.32" y2="210" />
            <line x1="565.5" y1="415" x2="565.28" y2="185" />
            <line x1="550.5" y1="434" x2="550.24" y2="166" />
            <line x1="535.5" y1="449" x2="535.22" y2="151" />
            <line x1="520.5" y1="462" x2="520.2" y2="138" />
            <line x1="505.5" y1="472" x2="505.18" y2="128" />
            <line x1="490.5" y1="480" x2="490.16" y2="120" />
            <line x1="475.5" y1="487" x2="475.14" y2="113" />
            <line x1="460.5" y1="492" x2="460.14" y2="108" />
            <line x1="445.5" y1="496" x2="445.12" y2="104" />
            <line x1="430.5" y1="499" x2="430.12" y2="101" />
            <line x1="415.5" y1="501" x2="415.12" y2="99" />
            <line x1="400.5" y1="501" x2="400.12" y2="99" />
            <line x1="385.5" y1="501" x2="385.12" y2="99" />
            <line x1="370.5" y1="499" x2="370.12" y2="101" />
            <line x1="355.5" y1="496" x2="355.12" y2="104" />
            <line x1="340.5" y1="492" x2="340.14" y2="108" />
            <line x1="325.5" y1="487" x2="325.14" y2="113" />
            <line x1="310.5" y1="480" x2="310.16" y2="120" />
            <line x1="295.5" y1="472" x2="295.18" y2="128" />
            <line x1="280.5" y1="462" x2="280.2" y2="138" />
            <line x1="265.5" y1="449" x2="265.22" y2="151" />
            <line x1="250.5" y1="434" x2="250.24" y2="166" />
            <line x1="235.5" y1="415" x2="235.28" y2="185" />
            <line x1="220.5" y1="390" x2="220.32" y2="210" />
            <polyline points="204.5 350 204.5 350.29 204.5 250" />
          </g>
          <g
            id="fat"
            stroke="url(#grad4)"
            fill="none"
            strokeLinecap="round"
            strokeMiterlimit="10"
            strokeWidth="7"
          >
            <path d="M594.6,350l-.1-100.29V250" />
            <line x1="580.5" y1="390" x2="580.32" y2="210" />
            <line x1="565.5" y1="415" x2="565.28" y2="185" />
            <line x1="550.5" y1="434" x2="550.24" y2="166" />
            <line x1="535.5" y1="449" x2="535.22" y2="151" />
            <line x1="520.5" y1="462" x2="520.2" y2="138" />
            <line x1="505.5" y1="472" x2="505.18" y2="128" />
            <line x1="490.5" y1="480" x2="490.16" y2="120" />
            <line x1="475.5" y1="487" x2="475.14" y2="113" />
            <line x1="460.5" y1="492" x2="460.14" y2="108" />
            <line x1="445.5" y1="496" x2="445.12" y2="104" />
            <line x1="430.5" y1="499" x2="430.12" y2="101" />
            <line x1="415.5" y1="501" x2="415.12" y2="99" />
            <line x1="400.5" y1="501" x2="400.12" y2="99" />
            <line x1="385.5" y1="501" x2="385.12" y2="99" />
            <line x1="370.5" y1="499" x2="370.12" y2="101" />
            <line x1="355.5" y1="496" x2="355.12" y2="104" />
            <line x1="340.5" y1="492" x2="340.14" y2="108" />
            <line x1="325.5" y1="487" x2="325.14" y2="113" />
            <line x1="310.5" y1="480" x2="310.16" y2="120" />
            <line x1="295.5" y1="472" x2="295.18" y2="128" />
            <line x1="280.5" y1="462" x2="280.2" y2="138" />
            <line x1="265.5" y1="449" x2="265.22" y2="151" />
            <line x1="250.5" y1="434" x2="250.24" y2="166" />
            <line x1="235.5" y1="415" x2="235.28" y2="185" />
            <line x1="220.5" y1="390" x2="220.32" y2="210" />
            <polyline points="204.5 350 204.5 350.29 204.5 250" />
          </g>
        </g>
      </svg>
    </div>
  );
}
