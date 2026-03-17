// export const ChannelCode = () => {
//     /* -----------------------------
//      Shared player UI
//   ----------------------------- */
//   const playerContent = (
//     <div className="relative flex h-full w-full gap-4 bg-white p-4">
//       {/* Controls */}
//       <div className="flex flex-col gap-2">
//         <button onClick={togglePlayPause}>
//           {isPlaying ? (
//             <Pause className="size-5" />
//           ) : (
//             <Play className="size-5" />
//           )}
//         </button>

//         <button onClick={() => videoRef.current?.stop()}>
//           <CircleStop className="-ml-1 size-7 fill-black text-white" />
//         </button>

//         <button onClick={toggleMute}>
//           {isMuted ? (
//             <VolumeX className="size-5" />
//           ) : (
//             <Volume2 className="size-5" />
//           )}
//         </button>

//         {!audioUnlocked && !loadingPlayer && (
//           <button
//             onClick={handleUnmute}
//             className="absolute inset-0 left-12 z-30 flex items-center justify-center text-lg text-white"
//           ></button>
//         )}

//         {!audioUnlocked && !loadingPlayer && (
//           <button
//             onClick={handleUnmute}
//             className="absolute bottom-6 left-14 z-30 flex items-center gap-1 text-xs text-white"
//           >
//             {isMuted ? (
//               <>
//                 <VolumeX className="size-5" /> Tap to unmute
//               </>
//             ) : (
//               <Volume2 className="size-5" />
//             )}
//           </button>
//         )}

//         <button
//           onClick={() => setOpenPlaylist(prev => !prev)}
//           className="relative"
//         >
//           <FastForward className="size-5" />

//           {openPlaylist && (
//             <div className="absolute z-50 mt-2 flex w-40 flex-col gap-1 rounded-md border shadow-md">
//               {channels.map(channel => (
//                 <div
//                   key={channel.id}
//                   className="cursor-pointer bg-black/70 px-3 py-2 text-sm text-white"
//                 >
//                   {channel.title}
//                 </div>
//               ))}
//             </div>
//           )}
//         </button>

//         <button
//           onClick={async () => {
//             if (!fullscreenRef.current) return;

//             // ❌ Block fullscreen in portrait
//             if (!isLandscape()) return;

//             if (document.fullscreenElement) {
//               await exitLandscapeFullscreen();
//               onToggleFullscreen(false);
//             } else {
//               await enterLandscapeFullscreen(fullscreenRef.current);
//               onToggleFullscreen(true);
//             }
//           }}
//         >
//           <Maximize className="size-5" />
//         </button>
//         <button
//           onClick={() => {
//             const params = new URLSearchParams(searchParams.toString());

//             if (isFullscreen) {
//               // EXIT channel view
//               params.delete("frame");
//               router.replace(`?${params.toString()}`, { scroll: false });
//               onToggleFullscreen(false);
//             } else {
//               // ENTER channel view
//               openFullscreen();
//             }
//           }}
//         >
//           <ArrowLeftRight className="size-5" />
//         </button>
//       </div>

//       {/* Video */}
//       <div className="z-0 flex flex-1 items-center justify-center">
//         {loadingPlayer && (
//           <div className="flex h-64 w-full items-center justify-center bg-gray-200">
//             <span className="animate-pulse text-gray-500">
//               Loading video...
//             </span>
//           </div>
//         )}
//         {playerReady && !loadingPlayer && (
//           <VideoPlayer
//             key={`${playerKey}-${forceReload}`}
//             ref={videoRef}
//             // videoUrl={autoPlayUrl}
//             videoUrl={channels[currentChannelIndex].url}
//             className="h-full w-full object-cover"
//           />
//         )}
//       </div>
//     </div>
//   );

//   /* -----------------------------
//      FULLSCREEN (PORTAL)
//   ----------------------------- */
//   if (isFullscreen && mounted && playerReady) {
//     return createPortal(
//       <div
//         className={`} fixed inset-0 z-[999999] bg-black`}
//         style={
//           landscape
//             ? undefined
//             : {
//                 top: 0,
//                 bottom: "238px",
//               }
//         }
//       >
//         <div className="flex h-full w-full flex-col bg-white">
//           <div className="flex items-center justify-between px-4 pt-2">
//             <Pin className="fill-primary size-5 rotate-45" />
//             {/* {user ? (
//               <span className="text-xs font-medium">
//                 Logged in: {user.username}
//               </span>
//             ) : (
//               <span className="text-xs font-medium">You are not logged in</span>
//             )} */}
//             <div className="text-xs font-medium">
//               <span className="text-black">Host: {fullName.split(" ")[0]}</span>{" "}
//               <span className="text-primary text-xs opacity-50">
//                 (@{username})
//               </span>
//             </div>

//             <div className="flex items-center gap-1">
//               <span className="bg-moonstone-blue size-[14px] rounded-full sm:size-4"></span>{" "}
//               <span className="text-xs font-medium sm:text-sm">
//                 {active_users || 0} online
//               </span>
//             </div>
//           </div>

//           <div className="relative h-full w-full">
//             {playerContent}

//             <div className="absolute right-4 bottom-4 z-[1000] flex flex-col items-center gap-2">
//               <span className="rounded bg-black/70 p-1 text-white">0 tips</span>
//               <div className="relative flex items-center gap-2 rounded bg-black/70 p-1">
//                 <CircleAlert
//                   onClick={() => {
//                     setShowInfo(prev => !prev);
//                     setShowShare(false);
//                   }}
//                   className="size54 cursor-pointer text-white"
//                 />
//                 {showInfo && (
//                   <div className="absolute top-1/2 left-full z-[100] mt-2 h-[50px] w-[100px] -translate-y-1/2 rounded-md border bg-white p-1 shadow-md">
//                     <div className="relative">
//                       <p className="text-[10px] font-semibold">{eventName}</p>
//                       <p className="text-muted-foreground text-[10px]">
//                         By: {organizationName}
//                       </p>
//                       <span
//                         className="absolute -top-2 -right-1"
//                         onClick={() => setShowInfo(prev => !prev)}
//                       >
//                         x
//                       </span>
//                     </div>
//                   </div>
//                 )}
//               </div>
//               <span className="rounded bg-black/70 p-1">
//                 <Share2 className="size-5 text-white" />
//               </span>
//               <button
//                 type="button"
//                 onClick={() => {
//                   console.log("set profile open");
//                   setProfileOpen(true);
//                 }}
//                 className="pointer-events-auto rounded bg-black/70 p-1 text-white"
//               >
//                 <UserRound className="size-5" />
//               </button>

//               <button
//                 type="button"
//                 onClick={() => setSaveOpen(true)}
//                 className="pointer-events-auto rounded bg-black/70 p-1 text-white"
//               >
//                 <Bookmark className="size-5" />
//               </button>
//             </div>
//           </div>

//           {/* Title */}
//           {!landscape && (
//             <h4 className="px-4 text-xs">
//               <span className="font-medium">Now playing:</span> {videoTitle}
//             </h4>
//           )}

//           {/* Scrubber */}
//           <div className="w-full px-4 pb-3">
//             <input
//               type="range"
//               min={0}
//               max={duration || 0}
//               value={currentTime}
//               step={0.1}
//               onChange={e => {
//                 const seekTo = parseFloat(e.target.value);
//                 videoRef.current?.seekTo(seekTo);
//                 setCurrentTime(seekTo);
//               }}
//               className="accent-primary h-2 w-full rounded-full bg-black"
//             />
//             <div className="-mt-1 flex justify-between px-1 text-xs">
//               <span>{formatTime(currentTime)}</span>
//               <span>{formatTime(duration)}</span>
//             </div>
//           </div>

//           {landscape && (
//             <div className="-mt-5 grid grid-cols-3 gap-4 px-4 py-2">
//               {/* Left */}
//               <h4 className="text-xs font-medium">
//                 <span>{eventName}</span>
//               </h4>

//               {/* Middle */}
//               <Button
//                 size="lg"
//                 onClick={() => {}}
//                 className="flex h-4 w-fit justify-center rounded-tl-2xl rounded-tr-2xl bg-transparent text-xs text-black"
//               >
//                 <ChevronsUp className="text-primary" /> Tip or Donate{" "}
//                 <ChevronsUp className="text-primary" />
//                 <span
//                   style={{
//                     transform: "scaleX(1)",
//                   }}
//                   className="absolute right-18 -bottom-0.5 left-18 h-0.5 origin-left rounded-full bg-black"
//                 ></span>
//               </Button>

//               {/* Right */}
//               <div className="flex items-center gap-2 text-xs">
//                 <span>0 tips</span>
//                 <Share2 className="size-5" />
//                 <UserRound className="size-5" />
//                 <Bookmark className="size-5" />
//               </div>
//             </div>
//           )}
//         </div>
//       </div>,
//       document.body
//     );
//   }
// }
