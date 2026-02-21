import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import worldMapBg from '../../assets/worldmap.jpeg';

// --- Types ---
interface MapNode {
    id: number;
    x: number;
    y: number;
    isActive?: boolean;
    pulse?: number;
    size?: number;
    isLand?: boolean;
    intensity: number; // For detailed shoreline density
}

interface Connection {
    start: MapNode;
    end: MapNode;
    life: number;
    maxLife: number;
    color: string;
    width: number;
}

// --- Constants ---
const CONNECTION_RATE = 0.4; 
const ASPECT_RATIO = 2.1; 

// --- Projection Math ---
// Calibrated for the specific aspect ratio and projection of worldmap.jpeg
const getCoords = (lat: number, lon: number) => {
    // Manual offset calibration for the specific image "worldmap.jpeg"
    const x = ((lon + 180) / 360) * 100;
    // Mercator-like projection tweak
    const latRad = lat * Math.PI / 180;
    const mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
    const y = (1 - (mercN / Math.PI + 1) / 2) * 100;
    
    // Fine-tuning offsets for alignment
    return { 
        x: x + 1.5, // Slight horizontal shift
        y: y * 0.85 + 10 // Vertical compression and shift to match image projection
    };
};

// --- Detailed Geodata (Approximated) ---
// Using tighter bounding boxes with specific densities to mimic a detailed map
const REGIONS = [
    // NA Density
    { lat: [25, 70], lon: [-165, -55], density: 0.8 },
    // SA Density
    { lat: [-55, 12], lon: [-85, -35], density: 0.7 },
    // Europe
    { lat: [35, 70], lon: [-10, 45], density: 0.9 },
    // Africa
    { lat: [-35, 36], lon: [-18, 52], density: 0.6 },
    // Asia
    { lat: [10, 75], lon: [60, 150], density: 0.8 },
    // Aus
    { lat: [-40, -10], lon: [112, 154], density: 0.7 }
];

const getRegionDensity = (lat: number, lon: number) => {
    const region = REGIONS.find(r => 
        lat >= r.lat[0] && lat <= r.lat[1] &&
        lon >= r.lon[0] && lon <= r.lon[1]
    );
    return region ? region.density : 0;
};

    // --- Active Hubs (Major Cities) ---
    const HUBS = [
        { n: "NY", lat: 40.7, lon: -74 },
        { n: "LDN", lat: 51.5, lon: -0.1 },
        { n: "TYO", lat: 35.6, lon: 139.7 },
        { n: "SGP", lat: 1.3, lon: 103.8 },
        { n: "DXB", lat: 25.2, lon: 55.3 },
        { n: "SYD", lat: -33.8, lon: 151.2 },
        { n: "SAO", lat: -23.5, lon: -46.6 },
        { n: "JNB", lat: -26.2, lon: 28 },
        { n: "LAX", lat: 34, lon: -118 },
        { n: "FRA", lat: 50, lon: 8.6 },
        { n: "SEA", lat: 47.6, lon: -122.3 }, // Added Seattle/West Coast point
        { n: "MOS", lat: 55.7, lon: 37.6 }    // Added Moscow for balance
    ];

    export const LiveMap = () => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);

        // --- Generate Map Points (Just Active Hubs now) ---
        const mapPoints = useMemo(() => {
            const pts: MapNode[] = [];
            let idCounter = 0;

            // ONLY ACTIVE HUBS
            HUBS.forEach(city => {
                const { x, y } = getCoords(city.lat, city.lon);
                pts.push({
                    id: idCounter++,
                    x, y, 
                    isActive: true,
                    isLand: false,
                    size: 3,
                    pulse: Math.random() * Math.PI,
                    intensity: 1
                });
            });

            return pts;
        }, []);

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            let connections: Connection[] = [];
            let rAF: number;
            let time = 0;

            // Resize Handler
            const handleResize = () => {
                if (containerRef.current && canvas) {
                    const rect = containerRef.current.getBoundingClientRect();
                    canvas.width = rect.width;
                    canvas.height = rect.height;
                }
            };
            window.addEventListener('resize', handleResize);
            handleResize();

            const render = () => {
                if (!containerRef.current) return;
                const width = canvas.width;
                const height = canvas.height;

                // Fit Logic: COVER (Fill components)
                // Standard Equirectangular Map is 2:1
                const IMAGE_ASPECT = 2;
                const canvasAspect = width / height;
                
                let mapW, mapH;

                if (canvasAspect > IMAGE_ASPECT) {
                    // Canvas is wider than map -> Match Width, Crop Height
                    mapW = width;
                    mapH = width / IMAGE_ASPECT;
                } else {
                    // Canvas is taller/narrower -> Match Height, Crop Width (or Match Width if we want to force full width fill?)
                    // Usually "Fit" means no black bars.
                    // Let's use standard Cover logic:
                    mapH = height;
                    mapW = height * IMAGE_ASPECT;
                }

                // If user specifically wants to "Fit image" into the box fully visible, that's CONTAIN.
                // If they want it to FILL the box, that's COVER.
                // Given "picture is not fitted", usually implies empty space is bad. 
                // Let's force COVER logic.
                
                const scale = Math.max(width / (100 * IMAGE_ASPECT), height / 100); 
                // Actually easier: just calculate calcW/calcH logic above.
                
                const offX = (width - mapW) / 2;
                const offY = (height - mapH) / 2;

                ctx.clearRect(0, 0, width, height);
                time += 0.01;

                // --- 1. RENDER HUBS & CONNECTIONS (Overlay on Image) ---
                mapPoints.forEach(p => {
                    const px = offX + (p.x / 100) * mapW;
                    const py = offY + (p.y / 100) * mapH;

                    if (p.isActive) {
                        // Active Hub Glow
                        ctx.fillStyle = '#22d3ee'; // Cyan-400
                        ctx.shadowColor = '#22d3ee';
                        ctx.shadowBlur = 15;
                        ctx.beginPath();
                        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 0;

                        // Expanding Ring (Radar Ping)
                        p.pulse = (p.pulse! + 0.05) % (Math.PI * 1.5);
                        if (p.pulse < Math.PI) {
                            ctx.strokeStyle = `rgba(34, 211, 238, ${1 - (p.pulse!/Math.PI)})`;
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.arc(px, py, 3 + (p.pulse! * 8), 0, Math.PI * 2);
                            ctx.stroke();
                        }
                    }
                });

                // Connections
                if (Math.random() < CONNECTION_RATE) {
                    const hubs = mapPoints; // All points are hubs now
                    const start = hubs[Math.floor(Math.random() * hubs.length)];
                    const end = hubs[Math.floor(Math.random() * hubs.length)];
                    if (start.id !== end.id) {
                        connections.push({
                            start, end, 
                            life: 0, 
                            maxLife: 60 + Math.random() * 30, 
                            color: Math.random() > 0.5 ? '#22d3ee' : '#ffffff',
                            width: Math.random() > 0.8 ? 2 : 1
                        });
                    }
                }

                connections.forEach((conn, i) => {
                    conn.life++;
                    if (conn.life > conn.maxLife) {
                        connections.splice(i, 1);
                        return;
                    }

                    const px1 = offX + (conn.start.x / 100) * mapW;
                    const py1 = offY + (conn.start.y / 100) * mapH;
                    const px2 = offX + (conn.end.x / 100) * mapW;
                    const py2 = offY + (conn.end.y / 100) * mapH;

                    // Bezier Arc
                    const mx = (px1 + px2) / 2;
                    const my = (py1 + py2) / 2;
                    const dist = Math.sqrt(Math.pow(px2-px1, 2) + Math.pow(py2-py1, 2));
                    const cx = mx;
                    const cy = my - (dist * 0.4); 

                    const t = conn.life / conn.maxLife; 
                    
                    ctx.beginPath();
                    ctx.moveTo(px1, py1);
                    ctx.quadraticCurveTo(cx, cy, px2, py2);
                    
                    ctx.strokeStyle = conn.color;
                    ctx.lineWidth = conn.width;
                    ctx.lineCap = 'round';
                    const alpha = Math.sin(t * Math.PI); 
                    ctx.globalAlpha = alpha * 0.6;
                    ctx.stroke();
                    ctx.globalAlpha = 1;

                    const tt = t;
                    const tx = (1-tt)*(1-tt)*px1 + 2*(1-tt)*tt*cx + tt*tt*px2;
                    const ty = (1-tt)*(1-tt)*py1 + 2*(1-tt)*tt*cy + tt*tt*py2;

                    ctx.fillStyle = '#fff';
                    ctx.shadowColor = conn.color;
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(tx, ty, conn.width * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                });

                rAF = requestAnimationFrame(render);
            };

            render();
            return () => {
                window.removeEventListener('resize', handleResize);
                cancelAnimationFrame(rAF);
            };
        }, [mapPoints]);

        return (
            <div ref={containerRef} className="relative w-full h-[360px] bg-[#020408] rounded-[24px] border border-white/10 overflow-hidden shadow-2xl">
                {/* 1. BACKGROUND IMAGE LAYER */}
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 mix-blend-screen"
                    style={{ backgroundImage: `url(${worldMapBg})` }}
                />

                {/* 2. Vignette/Grid */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020408_100%)] opacity-40 pointer-events-none" />

                {/* 3. The Canvas Rendering Layer (Connections & Hubs) */}
                <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

                {/* 4. Left HUD Cluster (Circle Visuals) */}
                <div className="absolute top-8 left-8 flex flex-col gap-6 pointer-events-none">
                    {/* Title Block */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee] animate-pulse" />
                            <h3 className="text-sm font-black text-cyan-400 tracking-[0.2em] uppercase">Global_Intel</h3>
                        </div>
                        <p className="text-[10px] text-cyan-500/50 font-mono pl-4">SECURE CONNECTION ESTABLISHED</p>
                    </div>

                    {/* Decorative Spinners */}
                    <div className="relative w-24 h-24 border border-cyan-500/10 rounded-full flex items-center justify-center">
                        <div className="absolute inset-0 border-t border-cyan-500/40 rounded-full animate-[spin_4s_linear_infinite]" />
                        <div className="absolute inset-2 border-r border-cyan-500/30 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
                        <div className="w-16 h-16 bg-cyan-500/5 rounded-full backdrop-blur-sm flex items-center justify-center border border-cyan-500/20">
                             <div className="text-[9px] text-cyan-500 font-mono">SCANNING</div>
                        </div>
                    </div>

                     {/* Activity List */}
                    <div className="flex flex-col gap-2 opacity-60">
                         <div className="h-px w-32 bg-gradient-to-r from-cyan-500/50 to-transparent" />
                         <div className="text-[9px] font-mono text-cyan-300">
                            <div>0x4F...2A &gt;&gt; SYNC NODE</div>
                            <div>0x91...B3 &gt;&gt; UPLINK OK</div>
                         </div>
                    </div>
                </div>

                {/* 5. Bottom Left Stats */}
                <div className="absolute bottom-8 left-8 flex items-end gap-8 z-10">
                     <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Hubs</div>
                        <div className="text-3xl font-black text-white leading-none">12<span className="text-lg text-cyan-500/50">/12</span></div>
                     </div>
                     <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data Stream</div>
                        <div className="text-3xl font-black text-white leading-none">4.2 <span className="text-sm text-slate-500">PB/s</span></div>
                     </div>
                </div>

                {/* 6. Right Side - Code Rain / Vertical Info */}
                <div className="absolute top-8 right-8 flex flex-col items-end gap-1 opacity-50 pointer-events-none">
                     <div className="text-[9px] font-mono text-cyan-500/60 text-right">
                        sys.init(0x1)<br/>
                        net.connect(GLOBAL)<br/>
                        auth.verify(TRUE)<br/>
                     </div>
                     <div className="h-32 w-0.5 bg-gradient-to-b from-cyan-500/0 via-cyan-500/40 to-cyan-500/0 my-4" />
                </div>

                {/* 7. Bottom Right Status Pill */}
                 <div className="absolute bottom-8 right-8">
                    <div className="flex items-center gap-2 px-4 py-2 bg-cyan-950/40 border border-cyan-500/30 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live Traffic</span>
                    </div>
                 </div>

            </div>
        );
    };
