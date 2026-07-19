# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-url-sync-journeys.spec.ts >> explore URL sync journeys >> browser back and forward restore sub-tab and URL
- Location: e2e\explore-url-sync-journeys.spec.ts:163:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "tv"
Received: "saves"

Call Log:
- Timeout 12000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - region "Notification messages"
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7]:
      - img [ref=e8]
    - generic [ref=e11]:
      - button "Open issues overlay" [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: "4"
          - generic [ref=e15]: "5"
        - generic [ref=e16]:
          - text: Issue
          - generic [ref=e17]: s
      - button "Collapse issues badge" [ref=e18]:
        - img [ref=e19]
  - alert [ref=e21]
  - generic [ref=e22]:
    - banner [ref=e23]:
      - heading "Tipmanna TV — Explore and discover community media" [level=1] [ref=e24]
      - generic [ref=e25]:
        - link "tipmanna" [ref=e26] [cursor=pointer]:
          - /url: /explore
        - button [ref=e27] [cursor=pointer]:
          - img [ref=e28]
      - generic [ref=e31]:
        - button "Open discover search" [ref=e32]:
          - textbox "Search videos..." [ref=e33]
          - img [ref=e34]
        - generic [ref=e39]: 0 watching live
    - generic [ref=e41]:
      - generic [ref=e42]:
        - button [ref=e43]:
          - img [ref=e44]
        - generic [ref=e45]: Create
      - button "Feed" [ref=e46]
      - button "Start Community" [ref=e47]
      - button "1 Not signed in" [ref=e48]:
        - generic [ref=e49]:
          - img [ref=e50]
          - generic [ref=e53]: "1"
        - generic [ref=e54]: Not signed in
    - generic [ref=e55]:
      - generic [ref=e57]:
        - generic [ref=e58]:
          - generic [ref=e59]:
            - button "Trends" [ref=e60]
            - button "Saves" [ref=e61]
            - button "TV" [active] [ref=e62]
            - button "Community" [ref=e63]
          - button "My Communities" [ref=e65] [cursor=pointer]:
            - generic [ref=e66]: My Communities
        - button "Open filters" [ref=e67]:
          - img [ref=e68]
      - generic [ref=e71]:
        - generic [ref=e72]:
          - heading "TV on Explore" [level=2] [ref=e73]
          - button "Sync" [ref=e74] [cursor=pointer]:
            - img
            - text: Sync
        - generic [ref=e75]:
          - paragraph [ref=e76]: TV schedule source
          - combobox [ref=e77] [cursor=pointer]:
            - generic: Tipmanna TV (global)
            - img
        - generic [ref=e78]:
          - heading "Ongoing schedule (Batch B)" [level=3] [ref=e79]
          - generic [ref=e80]:
            - generic [ref=e81]:
              - generic [ref=e83]: 01:00 AM
              - generic [ref=e84]:
                - paragraph [ref=e85]: Live Stream
                - paragraph [ref=e86]: Emediong Udoh · 0 tips
                - generic [ref=e87]:
                  - button "Watch in Explore" [ref=e88] [cursor=pointer]
                  - button "Tip" [ref=e89] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e90]:
              - generic [ref=e92]: 01:09 AM
              - generic [ref=e93]:
                - paragraph [ref=e94]: THE GREATEST FINAL EVER?
                - paragraph [ref=e95]: Caleb Parker · 22 tips
                - generic [ref=e96]:
                  - button "Watch in Explore" [ref=e97] [cursor=pointer]
                  - button "Tip" [ref=e98] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e99]:
              - generic [ref=e101]: 01:13 AM
              - generic [ref=e102]:
                - paragraph [ref=e103]: Live Stream
                - paragraph [ref=e104]: Emediong Udoh · 2 tips
                - generic [ref=e105]:
                  - button "Watch in Explore" [ref=e106] [cursor=pointer]
                  - button "Tip" [ref=e107] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e108]:
              - generic [ref=e110]: 01:18 AM
              - generic [ref=e111]:
                - paragraph [ref=e112]: The Painting
                - paragraph [ref=e113]: Sophia Carter · 0 tips
                - generic [ref=e114]:
                  - button "Watch in Explore" [ref=e115] [cursor=pointer]
                  - button "Tip" [ref=e116] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e117]:
              - generic [ref=e119]: 02:01 AM
              - generic [ref=e120]:
                - paragraph [ref=e121]: Saka sends arsenal to the champions league final
                - paragraph [ref=e122]: Caleb Parker · 22 tips
                - generic [ref=e123]:
                  - button "Watch in Explore" [ref=e124] [cursor=pointer]
                  - button "Tip" [ref=e125] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e126]:
              - generic [ref=e128]: 02:03 AM
              - generic [ref=e129]:
                - paragraph [ref=e130]: "Dana White: UFC Freedom 250 will be the Biggest Fight in History | KMP Ep.38"
                - paragraph [ref=e131]: Emediong Udoh · 142 tips
                - generic [ref=e132]:
                  - button "Watch in Explore" [ref=e133] [cursor=pointer]
                  - button "Tip" [ref=e134] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e135]:
              - generic [ref=e137]: 03:00 AM
              - generic [ref=e138]:
                - paragraph [ref=e139]: PSG eliminates bayern
                - paragraph [ref=e140]: Caleb Parker · 22 tips
                - generic [ref=e141]:
                  - button "Watch in Explore" [ref=e142] [cursor=pointer]
                  - button "Tip" [ref=e143] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e144]:
              - generic [ref=e146]: 03:08 AM
              - generic [ref=e147]:
                - paragraph [ref=e148]: Cold play - A sky full of stars
                - paragraph [ref=e149]: Zoe Wallace · 0 tips
                - generic [ref=e150]:
                  - button "Watch in Explore" [ref=e151] [cursor=pointer]
                  - button "Tip" [ref=e152] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e153]:
              - generic [ref=e155]: 03:13 AM
              - generic [ref=e156]:
                - paragraph [ref=e157]: Lionel Messi Community Video
                - paragraph [ref=e158]: Emediong Udoh · 1 tips
                - generic [ref=e159]:
                  - button "Watch in Explore" [ref=e160] [cursor=pointer]
                  - button "Tip" [ref=e161] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e162]:
              - generic [ref=e164]: 03:31 AM
              - generic [ref=e165]:
                - paragraph [ref=e166]: Intro to Showcase
                - paragraph [ref=e167]: Taiwo Oladeji · 24 tips
                - generic [ref=e168]:
                  - button "Watch in Explore" [ref=e169] [cursor=pointer]
                  - button "Tip" [ref=e170] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e171]:
              - generic [ref=e173]: 03:32 AM
              - generic [ref=e174]:
                - paragraph [ref=e175]: Live Stream
                - paragraph [ref=e176]: Caleb Parker · 22 tips
                - generic [ref=e177]:
                  - button "Watch in Explore" [ref=e178] [cursor=pointer]
                  - button "Tip" [ref=e179] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e180]:
              - generic [ref=e182]: 03:36 AM
              - generic [ref=e183]:
                - paragraph [ref=e184]: Kobbie mannoo
                - paragraph [ref=e185]: Caleb Parker · 22 tips
                - generic [ref=e186]:
                  - button "Watch in Explore" [ref=e187] [cursor=pointer]
                  - button "Tip" [ref=e188] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e189]: Content unavailable
            - generic [ref=e190]:
              - generic [ref=e192]: 04:31 AM
              - generic [ref=e193]:
                - paragraph [ref=e194]: The best burger recipe
                - paragraph [ref=e195]: Emediong Udoh · 83 tips
                - generic [ref=e196]:
                  - button "Watch in Explore" [ref=e197] [cursor=pointer]
                  - button "Tip" [ref=e198] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e199]:
              - generic [ref=e201]: 04:36 AM
              - generic [ref=e202]:
                - paragraph [ref=e203]: Live Stream
                - paragraph [ref=e204]: Charlotte Quinn · 9 tips
                - generic [ref=e205]:
                  - button "Watch in Explore" [ref=e206] [cursor=pointer]
                  - button "Tip" [ref=e207] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e208]:
              - generic [ref=e210]: 04:37 AM
              - generic [ref=e211]:
                - paragraph [ref=e212]: Pete & Jen Hegseth on Family Values, Job Transition, & Military Readiness | KMP Ep. 17
                - paragraph [ref=e213]: Emediong Udoh · 142 tips
                - generic [ref=e214]:
                  - button "Watch in Explore" [ref=e215] [cursor=pointer]
                  - button "Tip" [ref=e216] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e217]:
              - generic [ref=e219]: 05:17 AM
              - generic [ref=e220]:
                - paragraph [ref=e221]: Norway vs Senegal
                - paragraph [ref=e222]: Emediong Udoh · 0 tips
                - generic [ref=e223]:
                  - button "Watch in Explore" [ref=e224] [cursor=pointer]
                  - button "Tip" [ref=e225] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e226]:
              - generic [ref=e228]: 05:22 AM
              - generic [ref=e229]:
                - paragraph [ref=e230]: Live Stream
                - paragraph [ref=e231]: Emediong Udoh · 42 tips
                - generic [ref=e232]:
                  - button "Watch in Explore" [ref=e233] [cursor=pointer]
                  - button "Tip" [ref=e234] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e235]:
              - generic [ref=e237]: 05:42 AM
              - generic [ref=e238]:
                - paragraph [ref=e239]: Official Tipmanna Livestream Video
                - paragraph [ref=e240]: Emediong Udoh · 29 tips
                - generic [ref=e241]:
                  - button "Watch in Explore" [ref=e242] [cursor=pointer]
                  - button "Tip" [ref=e243] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e244]:
              - generic [ref=e246]: 05:43 AM
              - generic [ref=e247]:
                - paragraph [ref=e248]: Live Stream
                - paragraph [ref=e249]: Zoe Wallace · 0 tips
                - generic [ref=e250]:
                  - button "Watch in Explore" [ref=e251] [cursor=pointer]
                  - button "Tip" [ref=e252] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e253]:
              - generic [ref=e255]: 05:48 AM
              - generic [ref=e256]:
                - paragraph [ref=e257]: Final Games 3
                - paragraph [ref=e258]: Emediong Udoh · 42 tips
                - generic [ref=e259]:
                  - button "Watch in Explore" [ref=e260] [cursor=pointer]
                  - button "Tip" [ref=e261] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e262]:
              - generic [ref=e264]: 06:05 AM
              - generic [ref=e265]:
                - paragraph [ref=e266]: Worst year for Artists
                - paragraph [ref=e267]: Sophia Carter · 5 tips
                - generic [ref=e268]:
                  - button "Watch in Explore" [ref=e269] [cursor=pointer]
                  - button "Tip" [ref=e270] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e271]:
              - generic [ref=e273]: 06:34 AM
              - generic [ref=e274]:
                - paragraph [ref=e275]: Live Stream
                - paragraph [ref=e276]: Emediong Udoh · 0 tips
                - generic [ref=e277]:
                  - button "Watch in Explore" [ref=e278] [cursor=pointer]
                  - button "Tip" [ref=e279] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e280]:
              - generic [ref=e282]: 06:39 AM
              - generic [ref=e283]:
                - paragraph [ref=e284]: USA vs Belgium
                - paragraph [ref=e285]: Emediong Udoh · 0 tips
                - generic [ref=e286]:
                  - button "Watch in Explore" [ref=e287] [cursor=pointer]
                  - button "Tip" [ref=e288] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e289]:
              - generic [ref=e291]: 06:56 AM
              - generic [ref=e292]:
                - paragraph [ref=e293]: Festival - Khalid Siddiq
                - paragraph [ref=e294]: Zoe Wallace · 0 tips
                - generic [ref=e295]:
                  - button "Watch in Explore" [ref=e296] [cursor=pointer]
                  - button "Tip" [ref=e297] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e298]:
              - generic [ref=e300]: 07:00 AM
              - generic [ref=e301]:
                - paragraph [ref=e302]: Crazy nine goal thriller
                - paragraph [ref=e303]: Caleb Parker · 22 tips
                - generic [ref=e304]:
                  - button "Watch in Explore" [ref=e305] [cursor=pointer]
                  - button "Tip" [ref=e306] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e307]:
              - generic [ref=e309]: 07:02 AM
              - generic [ref=e310]:
                - paragraph [ref=e311]: France vs Brazil
                - paragraph [ref=e312]: Emediong Udoh · 0 tips
                - generic [ref=e313]:
                  - button "Watch in Explore" [ref=e314] [cursor=pointer]
                  - button "Tip" [ref=e315] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e316]:
              - generic [ref=e318]: 07:42 AM
              - generic [ref=e319]:
                - paragraph [ref=e320]: Chamath & Nathalie on Leaving California, Tech Investments & Their Marriage | KMP Ep.24+ moments
                - paragraph [ref=e321]: Emediong Udoh · 142 tips
                - generic [ref=e322]:
                  - button "Watch in Explore" [ref=e323] [cursor=pointer]
                  - button "Tip" [ref=e324] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e325]:
              - generic [ref=e327]: 08:38 AM
              - generic [ref=e328]:
                - paragraph [ref=e329]: 2ttee talks his music journey
                - paragraph [ref=e330]: Aria Peterson · 3 tips
                - generic [ref=e331]:
                  - button "Watch in Explore" [ref=e332] [cursor=pointer]
                  - button "Tip" [ref=e333] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e334]:
              - generic [ref=e336]: 09:25 AM
              - generic [ref=e337]:
                - paragraph [ref=e338]: The DIOR spring summer
                - paragraph [ref=e339]: Charlotte Quinn · 9 tips
                - generic [ref=e340]:
                  - button "Watch in Explore" [ref=e341] [cursor=pointer]
                  - button "Tip" [ref=e342] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e343]: Content unavailable
            - generic [ref=e344]:
              - generic [ref=e346]: 10:02 AM
              - generic [ref=e347]:
                - paragraph [ref=e348]: Brazil vs Argentina Highlights
                - paragraph [ref=e349]: Emediong Udoh · 0 tips
                - generic [ref=e350]:
                  - button "Watch in Explore" [ref=e351] [cursor=pointer]
                  - button "Tip" [ref=e352] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e353]:
              - generic [ref=e355]: 10:07 AM
              - generic [ref=e356]:
                - paragraph [ref=e357]: Official Tipmanna Livestream Video
                - paragraph [ref=e358]: Emediong Udoh · 1 tips
                - generic [ref=e359]:
                  - button "Watch in Explore" [ref=e360] [cursor=pointer]
                  - button "Tip" [ref=e361] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e362]:
              - generic [ref=e364]: 10:08 AM
              - generic [ref=e365]:
                - paragraph [ref=e366]: Live Stream
                - paragraph [ref=e367]: Emediong Udoh · 0 tips
                - generic [ref=e368]:
                  - button "Watch in Explore" [ref=e369] [cursor=pointer]
                  - button "Tip" [ref=e370] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e371]:
              - generic [ref=e373]: 10:48 AM
              - generic [ref=e374]:
                - paragraph [ref=e375]: All goals scored in the champions league
                - paragraph [ref=e376]: Caleb Parker · 22 tips
                - generic [ref=e377]:
                  - button "Watch in Explore" [ref=e378] [cursor=pointer]
                  - button "Tip" [ref=e379] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e380]:
              - generic [ref=e382]: 10:56 AM
              - generic [ref=e383]:
                - paragraph [ref=e384]: FBI Director Kash Patel & Alexis Wilkins on Balancing Their Relationship with Work | KMP Ep.19
                - paragraph [ref=e385]: Emediong Udoh · 142 tips
                - generic [ref=e386]:
                  - button "Watch in Explore" [ref=e387] [cursor=pointer]
                  - button "Tip" [ref=e388] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e389]:
              - generic [ref=e391]: 11:48 AM
              - generic [ref=e392]:
                - paragraph [ref=e393]: GM Chess Lessons
                - paragraph [ref=e394]: Emediong Udoh · 1 tips
                - generic [ref=e395]:
                  - button "Watch in Explore" [ref=e396] [cursor=pointer]
                  - button "Tip" [ref=e397] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e398]:
              - generic [ref=e400]: 11:57 AM
              - generic [ref=e401]:
                - paragraph [ref=e402]: Columbia vs France
                - paragraph [ref=e403]: Emediong Udoh · 0 tips
                - generic [ref=e404]:
                  - button "Watch in Explore" [ref=e405] [cursor=pointer]
                  - button "Tip" [ref=e406] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e407]:
              - generic [ref=e409]: 12:02 PM
              - generic [ref=e410]:
                - paragraph [ref=e411]: Magnus Carlsen vs Hikaru Nakamura
                - paragraph [ref=e412]: Emediong Udoh · 42 tips
                - generic [ref=e413]:
                  - button "Watch in Explore" [ref=e414] [cursor=pointer]
                  - button "Tip" [ref=e415] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e416]:
              - generic [ref=e418]: 12:12 PM
              - generic [ref=e419]:
                - paragraph [ref=e420]: Daily Dose of Football
                - paragraph [ref=e421]: Emediong Udoh · 0 tips
                - generic [ref=e422]:
                  - button "Watch in Explore" [ref=e423] [cursor=pointer]
                  - button "Tip" [ref=e424] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e425]:
              - generic [ref=e427]: 12:29 PM
              - generic [ref=e428]:
                - paragraph [ref=e429]: Tipmanna & Bseen - Product Showcase
                - paragraph [ref=e430]: Taiwo Oladeji · 24 tips
                - generic [ref=e431]:
                  - button "Watch in Explore" [ref=e432] [cursor=pointer]
                  - button "Tip" [ref=e433] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e434]:
              - generic [ref=e436]: 12:49 PM
              - generic [ref=e437]:
                - paragraph [ref=e438]: ishowspeed reacts to world cup 2026 song
                - paragraph [ref=e439]: Daniel Romero · 0 tips
                - generic [ref=e440]:
                  - button "Watch in Explore" [ref=e441] [cursor=pointer]
                  - button "Tip" [ref=e442] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e443]:
              - generic [ref=e445]: 12:50 PM
              - generic [ref=e446]:
                - paragraph [ref=e447]: Columbia vs France
                - paragraph [ref=e448]: Emediong Udoh · 2 tips
                - generic [ref=e449]:
                  - button "Watch in Explore" [ref=e450] [cursor=pointer]
                  - button "Tip" [ref=e451] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e452]:
              - generic [ref=e454]: 12:55 PM
              - generic [ref=e455]:
                - paragraph [ref=e456]: Portugal vs Spain
                - paragraph [ref=e457]: Caleb Parker · 22 tips
                - generic [ref=e458]:
                  - button "Watch in Explore" [ref=e459] [cursor=pointer]
                  - button "Tip" [ref=e460] [cursor=pointer]:
                    - img
                    - text: Tip
        - generic [ref=e461]:
          - heading "Upcoming schedule (Batch A)" [level=3] [ref=e462]
          - generic [ref=e463]:
            - generic [ref=e464]:
              - generic [ref=e466]: 01:00 AM
              - generic [ref=e467]:
                - paragraph [ref=e468]: Portugal vs Spain
                - paragraph [ref=e469]: Caleb Parker · 22 tips
                - generic [ref=e470]:
                  - button "Watch in Explore" [ref=e471] [cursor=pointer]
                  - button "Tip" [ref=e472] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e473]: Content unavailable
            - generic [ref=e474]:
              - generic [ref=e476]: 01:57 AM
              - generic [ref=e477]:
                - paragraph [ref=e478]: Crazy nine goal thriller
                - paragraph [ref=e479]: Caleb Parker · 22 tips
                - generic [ref=e480]:
                  - button "Watch in Explore" [ref=e481] [cursor=pointer]
                  - button "Tip" [ref=e482] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e483]:
              - generic [ref=e485]: 01:59 AM
              - generic [ref=e486]:
                - paragraph [ref=e487]: THE GREATEST FINAL EVER?
                - paragraph [ref=e488]: Caleb Parker · 22 tips
                - generic [ref=e489]:
                  - button "Watch in Explore" [ref=e490] [cursor=pointer]
                  - button "Tip" [ref=e491] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e492]:
              - generic [ref=e494]: 02:03 AM
              - generic [ref=e495]:
                - paragraph [ref=e496]: FBI Director Kash Patel & Alexis Wilkins on Balancing Their Relationship with Work | KMP Ep.19
                - paragraph [ref=e497]: Emediong Udoh · 142 tips
                - generic [ref=e498]:
                  - button "Watch in Explore" [ref=e499] [cursor=pointer]
                  - button "Tip" [ref=e500] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e501]: Content unavailable
            - generic [ref=e502]:
              - generic [ref=e504]: 03:32 AM
              - generic [ref=e505]:
                - paragraph [ref=e506]: Dan Scavino & Erin Elmore on Life Inside The White House | KMP Ep. 23
                - paragraph [ref=e507]: Emediong Udoh · 142 tips
                - generic [ref=e508]:
                  - button "Watch in Explore" [ref=e509] [cursor=pointer]
                  - button "Tip" [ref=e510] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e511]:
              - generic [ref=e513]: 04:26 AM
              - generic [ref=e514]:
                - paragraph [ref=e515]: USA vs Belgium
                - paragraph [ref=e516]: Emediong Udoh · 0 tips
                - generic [ref=e517]:
                  - button "Watch in Explore" [ref=e518] [cursor=pointer]
                  - button "Tip" [ref=e519] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e520]:
              - generic [ref=e522]: 04:43 AM
              - generic [ref=e523]:
                - paragraph [ref=e524]: All goals scored in the champions league
                - paragraph [ref=e525]: Caleb Parker · 22 tips
                - generic [ref=e526]:
                  - button "Watch in Explore" [ref=e527] [cursor=pointer]
                  - button "Tip" [ref=e528] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e529]:
              - generic [ref=e531]: 04:51 AM
              - generic [ref=e532]:
                - paragraph [ref=e533]: NON-STOP MSN MAGIC ✨ | Messi, Suárez & Neymar’s Greatest Moments
                - paragraph [ref=e534]: Emediong Udoh · 0 tips
                - generic [ref=e535]:
                  - button "Watch in Explore" [ref=e536] [cursor=pointer]
                  - button "Tip" [ref=e537] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e538]:
              - generic [ref=e540]: 05:52 AM
              - generic [ref=e541]:
                - paragraph [ref=e542]: Columbia vs France
                - paragraph [ref=e543]: Emediong Udoh · 0 tips
                - generic [ref=e544]:
                  - button "Watch in Explore" [ref=e545] [cursor=pointer]
                  - button "Tip" [ref=e546] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e547]:
              - generic [ref=e549]: 05:57 AM
              - generic [ref=e550]:
                - paragraph [ref=e551]: Official Tipmanna Livestream Video
                - paragraph [ref=e552]: Emediong Udoh · 29 tips
                - generic [ref=e553]:
                  - button "Watch in Explore" [ref=e554] [cursor=pointer]
                  - button "Tip" [ref=e555] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e556]:
              - generic [ref=e558]: 05:58 AM
              - generic [ref=e559]:
                - paragraph [ref=e560]: France vs Brazil
                - paragraph [ref=e561]: Emediong Udoh · 0 tips
                - generic [ref=e562]:
                  - button "Watch in Explore" [ref=e563] [cursor=pointer]
                  - button "Tip" [ref=e564] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e565]:
              - generic [ref=e567]: 06:38 AM
              - generic [ref=e568]:
                - paragraph [ref=e569]: Chamath & Nathalie on Leaving California, Tech Investments & Their Marriage | KMP Ep.24+ moments
                - paragraph [ref=e570]: Emediong Udoh · 142 tips
                - generic [ref=e571]:
                  - button "Watch in Explore" [ref=e572] [cursor=pointer]
                  - button "Tip" [ref=e573] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e574]:
              - generic [ref=e576]: 07:34 AM
              - generic [ref=e577]:
                - paragraph [ref=e578]: Pete & Jen Hegseth on Family Values, Job Transition, & Military Readiness | KMP Ep. 17
                - paragraph [ref=e579]: Emediong Udoh · 142 tips
                - generic [ref=e580]:
                  - button "Watch in Explore" [ref=e581] [cursor=pointer]
                  - button "Tip" [ref=e582] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e583]:
              - generic [ref=e585]: 08:14 AM
              - generic [ref=e586]:
                - paragraph [ref=e587]: Live Stream
                - paragraph [ref=e588]: Zoe Wallace · 0 tips
                - generic [ref=e589]:
                  - button "Watch in Explore" [ref=e590] [cursor=pointer]
                  - button "Tip" [ref=e591] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e592]:
              - generic [ref=e594]: 08:19 AM
              - generic [ref=e595]:
                - paragraph [ref=e596]: Official Tipmanna Livestream Video
                - paragraph [ref=e597]: Emediong Udoh · 1 tips
                - generic [ref=e598]:
                  - button "Watch in Explore" [ref=e599] [cursor=pointer]
                  - button "Tip" [ref=e600] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e601]:
              - generic [ref=e603]: 08:20 AM
              - generic [ref=e604]:
                - paragraph [ref=e605]: Live Stream
                - paragraph [ref=e606]: Emediong Udoh · 42 tips
                - generic [ref=e607]:
                  - button "Watch in Explore" [ref=e608] [cursor=pointer]
                  - button "Tip" [ref=e609] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e610]:
              - generic [ref=e612]: 08:40 AM
              - generic [ref=e613]:
                - paragraph [ref=e614]: Live Stream
                - paragraph [ref=e615]: Emediong Udoh · 2 tips
                - generic [ref=e616]:
                  - button "Watch in Explore" [ref=e617] [cursor=pointer]
                  - button "Tip" [ref=e618] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e619]:
              - generic [ref=e621]: 08:45 AM
              - generic [ref=e622]:
                - paragraph [ref=e623]: Columbia vs France
                - paragraph [ref=e624]: Emediong Udoh · 2 tips
                - generic [ref=e625]:
                  - button "Watch in Explore" [ref=e626] [cursor=pointer]
                  - button "Tip" [ref=e627] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e628]:
              - generic [ref=e630]: 08:50 AM
              - generic [ref=e631]:
                - paragraph [ref=e632]: Festival - Khalid Siddiq
                - paragraph [ref=e633]: Zoe Wallace · 0 tips
                - generic [ref=e634]:
                  - button "Watch in Explore" [ref=e635] [cursor=pointer]
                  - button "Tip" [ref=e636] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e637]:
              - generic [ref=e639]: 08:54 AM
              - generic [ref=e640]:
                - paragraph [ref=e641]: 2ttee talks his music journey
                - paragraph [ref=e642]: Aria Peterson · 3 tips
                - generic [ref=e643]:
                  - button "Watch in Explore" [ref=e644] [cursor=pointer]
                  - button "Tip" [ref=e645] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e646]:
              - generic [ref=e648]: 09:41 AM
              - generic [ref=e649]:
                - paragraph [ref=e650]: PSG eliminates bayern
                - paragraph [ref=e651]: Caleb Parker · 22 tips
                - generic [ref=e652]:
                  - button "Watch in Explore" [ref=e653] [cursor=pointer]
                  - button "Tip" [ref=e654] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e655]:
              - generic [ref=e657]: 09:49 AM
              - generic [ref=e658]:
                - paragraph [ref=e659]: Messi magic sets up win
                - paragraph [ref=e660]: Caleb Parker · 22 tips
                - generic [ref=e661]:
                  - button "Watch in Explore" [ref=e662] [cursor=pointer]
                  - button "Tip" [ref=e663] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e664]:
              - generic [ref=e666]: 10:01 AM
              - generic [ref=e667]:
                - paragraph [ref=e668]: Cold play - A sky full of stars
                - paragraph [ref=e669]: Zoe Wallace · 0 tips
                - generic [ref=e670]:
                  - button "Watch in Explore" [ref=e671] [cursor=pointer]
                  - button "Tip" [ref=e672] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e673]:
              - generic [ref=e675]: 10:05 AM
              - generic [ref=e676]:
                - paragraph [ref=e677]: Live Stream
                - paragraph [ref=e678]: Charlotte Quinn · 9 tips
                - generic [ref=e679]:
                  - button "Watch in Explore" [ref=e680] [cursor=pointer]
                  - button "Tip" [ref=e681] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e682]:
              - generic [ref=e684]: 10:06 AM
              - generic [ref=e685]:
                - paragraph [ref=e686]: Live Stream
                - paragraph [ref=e687]: Emediong Udoh · 0 tips
                - generic [ref=e688]:
                  - button "Watch in Explore" [ref=e689] [cursor=pointer]
                  - button "Tip" [ref=e690] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e691]:
              - generic [ref=e693]: 10:11 AM
              - generic [ref=e694]:
                - paragraph [ref=e695]: Intro to Showcase
                - paragraph [ref=e696]: Taiwo Oladeji · 24 tips
                - generic [ref=e697]:
                  - button "Watch in Explore" [ref=e698] [cursor=pointer]
                  - button "Tip" [ref=e699] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e700]:
              - generic [ref=e702]: 10:12 AM
              - generic [ref=e703]:
                - paragraph [ref=e704]: Tipmanna & Bseen - Product Showcase
                - paragraph [ref=e705]: Taiwo Oladeji · 24 tips
                - generic [ref=e706]:
                  - button "Watch in Explore" [ref=e707] [cursor=pointer]
                  - button "Tip" [ref=e708] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e709]:
              - generic [ref=e711]: 10:32 AM
              - generic [ref=e712]:
                - paragraph [ref=e713]: Live Stream
                - paragraph [ref=e714]: Caleb Parker · 22 tips
                - generic [ref=e715]:
                  - button "Watch in Explore" [ref=e716] [cursor=pointer]
                  - button "Tip" [ref=e717] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e718]:
              - generic [ref=e720]: 10:36 AM
              - generic [ref=e721]:
                - paragraph [ref=e722]: Portugal vs Spain
                - paragraph [ref=e723]: Caleb Parker · 22 tips
                - generic [ref=e724]:
                  - button "Watch in Explore" [ref=e725] [cursor=pointer]
                  - button "Tip" [ref=e726] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e727]:
              - generic [ref=e729]: 10:45 AM
              - generic [ref=e730]:
                - paragraph [ref=e731]: The best burger recipe
                - paragraph [ref=e732]: Emediong Udoh · 83 tips
                - generic [ref=e733]:
                  - button "Watch in Explore" [ref=e734] [cursor=pointer]
                  - button "Tip" [ref=e735] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e736]:
              - generic [ref=e738]: 10:50 AM
              - generic [ref=e739]:
                - paragraph [ref=e740]: Spohisticated Fun
                - paragraph [ref=e741]: Charlotte Quinn · 9 tips
                - generic [ref=e742]:
                  - button "Watch in Explore" [ref=e743] [cursor=pointer]
                  - button "Tip" [ref=e744] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e745]:
              - generic [ref=e747]: 10:51 AM
              - generic [ref=e748]:
                - paragraph [ref=e749]: The history of drama
                - paragraph [ref=e750]: Zoe Wallace · 0 tips
                - generic [ref=e751]:
                  - button "Watch in Explore" [ref=e752] [cursor=pointer]
                  - button "Tip" [ref=e753] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e754]:
              - generic [ref=e756]: 10:55 AM
              - generic [ref=e757]:
                - paragraph [ref=e758]: Lionel Messi Community Video
                - paragraph [ref=e759]: Emediong Udoh · 1 tips
                - generic [ref=e760]:
                  - button "Watch in Explore" [ref=e761] [cursor=pointer]
                  - button "Tip" [ref=e762] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e763]:
              - generic [ref=e765]: 11:13 AM
              - generic [ref=e766]:
                - paragraph [ref=e767]: Kobbie mannoo
                - paragraph [ref=e768]: Caleb Parker · 22 tips
                - generic [ref=e769]:
                  - button "Watch in Explore" [ref=e770] [cursor=pointer]
                  - button "Tip" [ref=e771] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e772]:
              - generic [ref=e774]: 11:16 AM
              - generic [ref=e775]:
                - paragraph [ref=e776]: Nicki Minaj on Trump, New Music, and Family Life | KMP Ep. 25
                - paragraph [ref=e777]: Emediong Udoh · 142 tips
                - generic [ref=e778]:
                  - button "Watch in Explore" [ref=e779] [cursor=pointer]
                  - button "Tip" [ref=e780] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e781]:
              - generic [ref=e783]: 12:01 PM
              - generic [ref=e784]:
                - paragraph [ref=e785]: Brazil vs Argentina Highlights
                - paragraph [ref=e786]: Emediong Udoh · 0 tips
                - generic [ref=e787]:
                  - button "Watch in Explore" [ref=e788] [cursor=pointer]
                  - button "Tip" [ref=e789] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e790]:
              - generic [ref=e792]: 12:06 PM
              - generic [ref=e793]:
                - paragraph [ref=e794]: Daily Dose of Football
                - paragraph [ref=e795]: Emediong Udoh · 0 tips
                - generic [ref=e796]:
                  - button "Watch in Explore" [ref=e797] [cursor=pointer]
                  - button "Tip" [ref=e798] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e799]:
              - generic [ref=e801]: 12:23 PM
              - generic [ref=e802]:
                - paragraph [ref=e803]: How to cook a perfect steak every time
                - paragraph [ref=e804]: Emediong Udoh · 83 tips
                - generic [ref=e805]:
                  - button "Watch in Explore" [ref=e806] [cursor=pointer]
                  - button "Tip" [ref=e807] [cursor=pointer]:
                    - img
                    - text: Tip
            - generic [ref=e808]:
              - generic [ref=e810]: 12:28 PM
              - generic [ref=e811]:
                - paragraph [ref=e812]: Vice President JD Vance | The Katie Miller Podcast Ep. 1
                - paragraph [ref=e813]: Emediong Udoh · 142 tips
                - generic [ref=e814]:
                  - button "Watch in Explore" [ref=e815] [cursor=pointer]
                  - button "Tip" [ref=e816] [cursor=pointer]:
                    - img
                    - text: Tip
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | import { gotoExplore } from "./helpers/goto-explore";
  3   | import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";
  4   | 
  5   | async function waitFeedReady(page: Page) {
  6   |   const state = await waitExploreFeedReady(page, 60_000);
  7   |   if (state !== "scroll") {
  8   |     test.skip(true, "Feed scroll not available");
  9   |   }
  10  | }
  11  | 
  12  | async function expectFeedTab(page: Page, tab: string) {
  13  |   await expect
  14  |     .poll(() => new URL(page.url()).searchParams.get("feedTab"), {
  15  |       timeout: 12_000,
  16  |     })
> 17  |     .toBe(tab);
      |      ^ Error: expect(received).toBe(expected) // Object.is equality
  18  | }
  19  | 
  20  | async function expectMainTab(page: Page, tab: string) {
  21  |   await expect
  22  |     .poll(() => new URL(page.url()).searchParams.get("tab"), {
  23  |       timeout: 12_000,
  24  |     })
  25  |     .toBe(tab);
  26  | }
  27  | 
  28  | async function expectNoDiscoverTab(page: Page) {
  29  |   await expect
  30  |     .poll(() => new URL(page.url()).searchParams.get("tab"), { timeout: 8_000 })
  31  |     .not.toBe("discover");
  32  | }
  33  | 
  34  | test.describe("explore URL sync journeys", () => {
  35  |   test("feed sub-tab transitions sync URL immediately (10x)", async ({
  36  |     page,
  37  |   }) => {
  38  |     await gotoExplore(page);
  39  |     await waitFeedReady(page);
  40  | 
  41  |     for (let i = 0; i < 10; i++) {
  42  |       await page.getByTestId("explore-subtab-saves").click();
  43  |       await expectFeedTab(page, "saves");
  44  |       await expect(page.getByTestId("explore-subtab-saves")).toHaveClass(
  45  |         /bg-white/
  46  |       );
  47  | 
  48  |       await page.getByTestId("explore-subtab-tv").click();
  49  |       await expectFeedTab(page, "tv");
  50  | 
  51  |       await page.getByTestId("explore-subtab-trends").click();
  52  |       await expectFeedTab(page, "trends");
  53  |     }
  54  |   });
  55  | 
  56  |   test("rapid sub-tab clicks after hydration converge on final URL (10x)", async ({
  57  |     page,
  58  |   }) => {
  59  |     await gotoExplore(page);
  60  |     await waitFeedReady(page);
  61  | 
  62  |     for (let i = 0; i < 10; i++) {
  63  |       await page.getByTestId("explore-subtab-trends").click();
  64  |       await page.getByTestId("explore-subtab-saves").click();
  65  |       await page.getByTestId("explore-subtab-tv").click();
  66  |       await expectFeedTab(page, "tv");
  67  |       await page.getByTestId("explore-subtab-trends").click();
  68  |       await expectFeedTab(page, "trends");
  69  |     }
  70  |   });
  71  | 
  72  |   test("Trends → Start Community preserves feedTab (10x)", async ({ page }) => {
  73  |     await gotoExplore(page);
  74  |     await waitFeedReady(page);
  75  | 
  76  |     for (let i = 0; i < 10; i++) {
  77  |       await page.getByTestId("explore-subtab-saves").click();
  78  |       await expectFeedTab(page, "saves");
  79  |       await page.getByTestId("explore-chrome-start-community").click();
  80  |       await expectMainTab(page, "my-communities");
  81  |       await expectFeedTab(page, "saves");
  82  |       await page.getByTestId("explore-chrome-feed").click();
  83  |       await expectFeedTab(page, "saves");
  84  |       await expect
  85  |         .poll(() => new URL(page.url()).searchParams.get("tab"), {
  86  |           timeout: 8_000,
  87  |         })
  88  |         .toBeNull();
  89  |     }
  90  |   });
  91  | 
  92  |   test("Community sub-tab syncs URL when visible (10x)", async ({ page }) => {
  93  |     await gotoExplore(page);
  94  |     await waitFeedReady(page);
  95  |     const community = page.getByTestId("explore-subtab-community");
  96  |     if (!(await community.isVisible({ timeout: 3_000 }).catch(() => false))) {
  97  |       test.skip(
  98  |         true,
  99  |         "Community sub-tab not visible (viewport or feature flag)"
  100 |       );
  101 |       return;
  102 |     }
  103 | 
  104 |     for (let i = 0; i < 10; i++) {
  105 |       await community.click();
  106 |       await expectFeedTab(page, "community");
  107 |       await page.getByTestId("explore-subtab-trends").click();
  108 |       await expectFeedTab(page, "trends");
  109 |     }
  110 |   });
  111 | 
  112 |   test("Discover quick panel expand navigates client-side to tab=discover", async ({
  113 |     page,
  114 |   }) => {
  115 |     await gotoExplore(page);
  116 |     await waitFeedReady(page);
  117 | 
```