// "use client";

// import {useState, useCallback, useRef} from "react";

// interface BurstParticle {
//     id: string;
//     url: string;
//     x: number;
//     y: number;
//     size: number;
//     velocityX: number;
//     velocityY: number;
//     rotation: number;
//     rotationSpeed: number;
//     opacity: number;
//     scale: number;
//     gravity: number;
//     life: number;
//     maxLife: number;
// }

// interface BurstOptions {
//     particleCount?: number;
//     size?: number | {min: number, max: number};
//     speed?: number | {min: number, max: number};
//     spread?: number;
//     gravity?: number;
//     rotation?: boolean;
//     fadeOut?: boolean;
//     duration?: number;
//     colors?: string[];
//     icons?: string[];
// }

// export const useBurstAnimation = () => {
//     const [particles, setParticles] =  useState<BurstParticle[]>([]);
//     const containerRef = useRef<HTMLDivElement>(null);

//     const createBurst = useCallback((iconUrls: string[], options: BurstOptions = {}, event?: React.MouseEvent | {x: number; y: number}) => {
//         const {particleCount = 20,
//             size={min: 20, max: 40},
//             speed={min: 2, max: 8},
//             spread=360,
//             gravity=0.1,
//             rotation=true,
//             fadeOut=true,
//             duration=1000,
//             colors,
//             icons,
//         } = options;

//         // Get burst origin
//         let originX = window.innerWidth / 2;
//         let originY = window.innerHeight / 2;

//         if (event) {
//             if ('clientX' in event) {
//                 originX = event.clientX;
//                 originY = event.clientY;
//             } else {
//                 originX = event.x;
//                 originY = event.y;
//             }
//         }  else if (containerRef.current) {
//             const rect = containerRef.current.getBoundingClientRect();
//             originX = rect.left + rect.width / 2;
//             originY = rect.top + rect.height / 2;
//         }

//         const newParticles: BurstParticle[] = [];
//         const articleParticleCount = Array.isArray(iconUrls) && iconUrls.length > 0 ? Math.min(particleCount, iconUrls.length * 3): particleCount;

//         for (let i = 0; i < articleParticleCount; i++) {
//             const angle = (Math.PI * 2 * i) / articleParticleCount;
//             const randomSpread = (Math.random() - 0.5) * (spread / 180) * Math.PI;
//             const totalAngle = angle + randomSpread;

//             const speedValue = typeof speed === "number" ? speed : Math.random() * (speed.max - speed.min) + speed.min;

//             const sizeValue = typeof size === "number" ? size : Math.random() * (size.max - size.min) + size.min;

//             const useIcon = iconUrls.length > 0  && Math.random() * 0.3;

//             let url = "";

//             if (useIcon && iconUrls.length > 0) {
//                 url = iconUrls[i % iconUrls.length];
//             }

//             newParticles.push({
//                 id: `particle-${Date.now()}-${i}`,
//                 url,
//                 x: originX,
//                 y: originY,
//                 size: sizeValue,
//                 velocityX: Math.cos(totalAngle) * speedValue,
//                 velocityY: Math.sin(totalAngle) * speedValue,
//                 rotation: rotation ? Math.random() * 360: 0,
//                 rotationSpeed: rotation ? (Math.random() - 0.5) * 10: 0,
//                 opacity: 1,
//                 scale: 1,
//                 gravity,
//                 life: 0,
//                 maxLife: duration,
//             });

//             setParticles(newParticles);

//             // Animate particles
//             const startTime = Date.now();
//             const animate = () => {
//                 const elapsed = Date.now() - startTime;

//                 setParticles(prev => {
//                     const updated = prev.map(particle => {
//                         const progress = elapsed / particle.maxLife;

//                         if (progress >= 1) {
//                             return null;
//                         }

//                         // Apply gravity
//                         const velocityY = particle.velocityY + particle.gravity;

//                         // Calculate new position
//                         const x = particle.x + particle.velocityX;
//                         const y = particle.y + velocityY;

//                         // Calculate opacity and scale
//                         let opacity = particle.opacity;
//                         let scale = particle.scale;

//                         if (fadeOut) {
//                             opacity = 1 - progress;
//                             scale = 1 - progress * 0.5;
//                         }

//                         return {
//                             ...particle,
//                             x,
//                             y,
//                             velocityY,
//                             rotation: particle.rotation + particle.rotationSpeed,
//                             opacity,
//                             scale,
//                             life: elapsed,
//                         }
//                     }).filter(Boolean) as BurstParticle[];

//                     return updated;
//                 });

//                 if (elapsed < duration) {
//                     requestAnimationFrame(animate);
//                 } else {
//                     setParticles([]);
//                 }
//             };

//             requestAnimationFrame(animate);
//         }
//     })
// }
