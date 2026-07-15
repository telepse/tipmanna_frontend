# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore.spec.ts >> explore >> discover tab shows distinct category headings
- Location: e2e\explore.spec.ts:83:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Spotlight' })
Expected: visible
Error: strict mode violation: getByRole('heading', { name: 'Spotlight' }) resolved to 2 elements:
    1) <h2>Spotlight</h2> aka getByLabel('Spotlight', { exact: true }).getByRole('heading', { name: 'Spotlight' })
    2) <h5 class="font-semibold">Spotlight</h5> aka locator('h5').filter({ hasText: 'Spotlight' })

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByRole('heading', { name: 'Spotlight' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - region "Notification messages"
    - generic [ref=e6] [cursor=pointer]:
        - button "Open Next.js Dev Tools" [ref=e7]:
            - img [ref=e8]
        - generic [ref=e11]:
            - button "Open issues overlay" [ref=e12]:
                - generic [ref=e13]:
                    - generic [ref=e14]: "1"
                    - generic [ref=e15]: "2"
                - generic [ref=e16]:
                    - text: Issue
                    - generic [ref=e17]: s
            - button "Collapse issues badge" [ref=e18]:
                - img [ref=e19]
    - alert [ref=e21]
    - generic [ref=e22]:
        - region "Top contents" [ref=e23]:
            - heading "Top contents" [level=2] [ref=e24]
            - paragraph [ref=e25]: Editorially featured
            - list [ref=e26]:
                - listitem [ref=e27]:
                    - link "hello" [ref=e28] [cursor=pointer]:
                        - /url: http://localhost:3000/content/8a10de58-70c6-4623-a4e4-0af4322cda97?v=4cc03c89-9e78-487b-ac10-4f1c359667d5
                - listitem [ref=e29]:
                    - link "Live Stream" [ref=e30] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
                - listitem [ref=e31]:
                    - link "Tipmanna & Bseen - Product Showcase" [ref=e32] [cursor=pointer]:
                        - /url: http://localhost:3000/content/3d01ef9d-3993-408b-88bf-e0ea6ce0944b?v=5959dba8-9c51-4d70-9c5d-067d0bcf04c3
                - listitem [ref=e33]:
                    - link "Intro to Showcase" [ref=e34] [cursor=pointer]:
                        - /url: http://localhost:3000/content/3d01ef9d-3993-408b-88bf-e0ea6ce0944b?v=bb10fbef-55b3-44e0-b993-5716603a8c44
        - region "Latest contents" [ref=e35]:
            - heading "Latest contents" [level=2] [ref=e36]
            - paragraph [ref=e37]: Newest uploads, by date added
            - list [ref=e38]:
                - listitem [ref=e39]:
                    - link "Messi Saves Arg" [ref=e40] [cursor=pointer]:
                        - /url: http://localhost:3000/content/9bccd66b-387a-46bf-8789-8d8c17c7a389?v=8f04ecdc-5779-493f-b914-ba7734f7c119
                - listitem [ref=e41]:
                    - link "Daily Dose of Football" [ref=e42] [cursor=pointer]:
                        - /url: http://localhost:3000/content/e4c40d62-de30-456c-9543-3a06be6f70ee?v=fc25fcac-2181-44db-98ec-2d6be58fda07
                - listitem [ref=e43]:
                    - link "Norway vs Senegal" [ref=e44] [cursor=pointer]:
                        - /url: http://localhost:3000/content/0e92c442-648c-4423-9227-278531885a44?v=63f8d340-19d8-4fcc-a6e2-300ad938c079
                - listitem [ref=e45]:
                    - link "GM Chess Lessons" [ref=e46] [cursor=pointer]:
                        - /url: http://localhost:3000/content/0569fd21-08cd-4edc-bd50-2c2cb8986698?v=64c0d060-f64a-4eca-904f-ef66de0235bc
                - listitem [ref=e47]:
                    - link "2ttee remix videoo" [ref=e48] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
                - listitem [ref=e49]:
                    - link "Tipmanna Bseen Showcase" [ref=e50] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
                - listitem [ref=e51]:
                    - link "2ttee talks his music journey" [ref=e52] [cursor=pointer]:
                        - /url: http://localhost:3000/content/f39609be-4a93-4eca-9b0c-3454b3fc2663?v=9144020c-c666-47b9-801b-38ab9a571def
                - listitem [ref=e53]:
                    - link "Kobbie mannoo" [ref=e54] [cursor=pointer]:
                        - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=9ff5bba1-50f4-4bc4-b92c-eb1f2e2b6e75
                - listitem [ref=e55]:
                    - link "Crazy nine goal thriller" [ref=e56] [cursor=pointer]:
                        - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=5c22d5ec-34a5-443a-8c22-b27c230cd667
                - listitem [ref=e57]:
                    - link "All goals scored in the champions league" [ref=e58] [cursor=pointer]:
                        - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=57558a0d-3546-42fc-b505-6bca3f41767f
                - listitem [ref=e59]:
                    - link "Saka sends arsenal to the champions league final" [ref=e60] [cursor=pointer]:
                        - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=875961c7-0a46-46e8-9af5-55d124cb6a2b
                - listitem [ref=e61]:
                    - link "PSG eliminates bayern" [ref=e62] [cursor=pointer]:
                        - /url: http://localhost:3000/content/302b6dda-02ab-49ff-9bed-1e8f9378557c?v=7b9f8358-2eea-4be0-8c48-7ad4b73bed1d
        - region "Spotlight" [ref=e63]:
            - heading "Spotlight" [level=2] [ref=e64]
            - paragraph [ref=e65]: Trending by views, tips, and saves (updates every ~5 min)
            - list [ref=e66]:
                - listitem [ref=e67]:
                    - link "2ttee remix videoo" [ref=e68] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
                - listitem [ref=e69]:
                    - link "Live Stream" [ref=e70] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=85ec40a3-0a8c-47ea-829a-7a50f403a0f1
                - listitem [ref=e71]:
                    - link "Lionel Messi 50+ moments" [ref=e72] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
                - listitem [ref=e73]:
                    - link "Tipmanna Bseen Showcase" [ref=e74] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
                - listitem [ref=e75]:
                    - link "Food Ready in 5 minutes" [ref=e76] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=906153c3-c272-44cf-b205-d62a14ab0b5f
                - listitem [ref=e77]:
                    - link "Food Tour" [ref=e78] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=f7e7e96a-0705-4723-b892-1aeda8f1221f
                - listitem [ref=e79]:
                    - link "3 potatoes and 2 eggs" [ref=e80] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=a6e84710-2eee-4063-bfea-39b99505cd68
                - listitem [ref=e81]:
                    - link "The best burger recipe" [ref=e82] [cursor=pointer]:
                        - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=11c306fc-00cb-4a9b-ba66-53dfd68c41bc
                - listitem [ref=e83]:
                    - link "How to cook a perfect steak every time" [ref=e84] [cursor=pointer]:
                        - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=4053b423-1ff8-4c58-aa4c-171351013cfb
                - listitem [ref=e85]:
                    - link "Live Stream" [ref=e86] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
                - listitem [ref=e87]:
                    - link "Magnus Carlsen vs Hikaru Nakamura" [ref=e88] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=7a2f0a7a-a693-4c0d-bc22-22c03f750820
                - listitem [ref=e89]:
                    - link "Final Games 3" [ref=e90] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=3c00d3e3-2c89-4903-ba3e-0d8e5de853b6
        - region "Recommended for you" [ref=e91]:
            - heading "Recommended for you" [level=2] [ref=e92]
            - paragraph [ref=e93]: Popular saves and recency
            - list [ref=e94]:
                - listitem [ref=e95]:
                    - link "2ttee remix videoo" [ref=e96] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
                - listitem [ref=e97]:
                    - link "Live Stream" [ref=e98] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=85ec40a3-0a8c-47ea-829a-7a50f403a0f1
                - listitem [ref=e99]:
                    - link "Lionel Messi 50+ moments" [ref=e100] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
                - listitem [ref=e101]:
                    - link "3 potatoes and 2 eggs" [ref=e102] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=a6e84710-2eee-4063-bfea-39b99505cd68
                - listitem [ref=e103]:
                    - link "Tipmanna Bseen Showcase" [ref=e104] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
                - listitem [ref=e105]:
                    - link "Food Tour" [ref=e106] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=f7e7e96a-0705-4723-b892-1aeda8f1221f
                - listitem [ref=e107]:
                    - link "Food Ready in 5 minutes" [ref=e108] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=906153c3-c272-44cf-b205-d62a14ab0b5f
                - listitem [ref=e109]:
                    - link "The best burger recipe" [ref=e110] [cursor=pointer]:
                        - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=11c306fc-00cb-4a9b-ba66-53dfd68c41bc
                - listitem [ref=e111]:
                    - link "How to cook a perfect steak every time" [ref=e112] [cursor=pointer]:
                        - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=4053b423-1ff8-4c58-aa4c-171351013cfb
                - listitem [ref=e113]:
                    - link "Live Stream" [ref=e114] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
                - listitem [ref=e115]:
                    - link "Magnus Carlsen vs Hikaru Nakamura" [ref=e116] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=7a2f0a7a-a693-4c0d-bc22-22c03f750820
                - listitem [ref=e117]:
                    - link "Final Games 3" [ref=e118] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=3c00d3e3-2c89-4903-ba3e-0d8e5de853b6
        - region "Most tipped" [ref=e119]:
            - heading "Most tipped" [level=2] [ref=e120]
            - paragraph [ref=e121]: Highest tip counts
            - list [ref=e122]:
                - listitem [ref=e123]:
                    - link "Live Stream" [ref=e124] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=85ec40a3-0a8c-47ea-829a-7a50f403a0f1
                - listitem [ref=e125]:
                    - link "2ttee remix videoo" [ref=e126] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
                - listitem [ref=e127]:
                    - link "Tipmanna Bseen Showcase" [ref=e128] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
                - listitem [ref=e129]:
                    - link "Food Tour" [ref=e130] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=f7e7e96a-0705-4723-b892-1aeda8f1221f
                - listitem [ref=e131]:
                    - link "Food Ready in 5 minutes" [ref=e132] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=906153c3-c272-44cf-b205-d62a14ab0b5f
                - listitem [ref=e133]:
                    - link "Lionel Messi 50+ moments" [ref=e134] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
                - listitem [ref=e135]:
                    - link "3 potatoes and 2 eggs" [ref=e136] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=a6e84710-2eee-4063-bfea-39b99505cd68
                - listitem [ref=e137]:
                    - link "The best burger recipe" [ref=e138] [cursor=pointer]:
                        - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=11c306fc-00cb-4a9b-ba66-53dfd68c41bc
                - listitem [ref=e139]:
                    - link "How to cook a perfect steak every time" [ref=e140] [cursor=pointer]:
                        - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=4053b423-1ff8-4c58-aa4c-171351013cfb
                - listitem [ref=e141]:
                    - link "Final Games 3" [ref=e142] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=3c00d3e3-2c89-4903-ba3e-0d8e5de853b6
        - region "Programs" [ref=e143]:
            - heading "Programs" [level=2] [ref=e144]
            - paragraph [ref=e145]: Scheduled TV programs
            - list
        - region "Live streams" [ref=e146]:
            - heading "Live streams" [level=2] [ref=e147]
            - paragraph [ref=e148]: Opens in the creator's event room
            - list [ref=e149]:
                - listitem [ref=e150]:
                    - link "Cold play - A sky full of stars" [ref=e151] [cursor=pointer]:
                        - /url: /channel/f8f5c071-e10d-4b5e-811b-662038b69693
                - listitem [ref=e152]:
                    - link "Tipmanna & Bseen - Product Showcase" [ref=e153] [cursor=pointer]:
                        - /url: /channel/3d01ef9d-3993-408b-88bf-e0ea6ce0944b
                - listitem [ref=e154]:
                    - link "Messi magic sets up win" [ref=e155] [cursor=pointer]:
                        - /url: /channel/302b6dda-02ab-49ff-9bed-1e8f9378557c
                - listitem [ref=e156]:
                    - link "Tipmanna Bseen Showcase" [ref=e157] [cursor=pointer]:
                        - /url: /channel/95970621-c9b6-456c-8c9b-5bf19867b788
                - listitem [ref=e158]:
                    - link "Live Stream" [ref=e159] [cursor=pointer]:
                        - /url: /channel/f8f5c071-e10d-4b5e-811b-662038b69693
        - region "Top tippers" [ref=e160]:
            - heading "Top tippers" [level=2] [ref=e161]
            - list [ref=e162]:
                - listitem [ref=e163]: annetterobinson226
                - listitem [ref=e164]: emediong5135
                - listitem [ref=e165]: taiwo2ttee
                - listitem [ref=e166]: Telepsecompany
                - listitem [ref=e167]: ava
                - listitem [ref=e168]: aishapatel1912
                - listitem [ref=e169]: caleb.parker374
                - listitem [ref=e170]: xavier.scott523
                - listitem [ref=e171]: lasker1896
                - listitem [ref=e172]: charlottequinn0897
        - region "Top communities" [ref=e173]:
            - heading "Top communities" [level=2] [ref=e174]
            - list [ref=e175]:
                - listitem [ref=e176]:
                    - link "Tipmanna Public" [ref=e177] [cursor=pointer]:
                        - /url: /explore?tab=join&joinCommunity=bcc0090d-826c-444d-9689-300c354d0460
                - listitem [ref=e178]:
                    - link "Emediong Community" [ref=e179] [cursor=pointer]:
                        - /url: /explore?tab=join&joinCommunity=588a3682-c0c8-4284-b466-bd3e4a43b801
                - listitem [ref=e180]:
                    - link "Caleb Community" [ref=e181] [cursor=pointer]:
                        - /url: /explore?tab=join&joinCommunity=63898415-b24f-448d-aa55-ca073a8ba950
    - generic [ref=e182]:
        - banner [ref=e183]:
            - heading "Tipmanna TV — Explore and discover community media" [level=1] [ref=e184]
            - link "tipmanna" [ref=e186] [cursor=pointer]:
                - /url: /explore
            - generic [ref=e188]:
                - button "Open discover search" [ref=e189]:
                    - textbox "Search videos..." [ref=e190]
                    - img [ref=e191]
                - generic [ref=e196]: 0 watching live
        - generic [ref=e198]:
            - generic [ref=e199]:
                - button [ref=e200]:
                    - img [ref=e201]
                - generic [ref=e202]: Create
            - button "Feed" [ref=e203]
            - button "Start Community" [ref=e204]
            - button "Not signed in" [ref=e205]:
                - img [ref=e207]
                - generic [ref=e210]: Not signed in
        - generic [ref=e211]:
            - generic [ref=e212]:
                - paragraph [ref=e213]: Discover is also available as a quick panel while you watch the feed.
                - button "Open discover panel" [ref=e214] [cursor=pointer]
            - generic [ref=e215]:
                - heading "Discover contents" [level=2] [ref=e216]
                - generic [ref=e218]:
                    - generic [ref=e219]:
                        - textbox "Search discovery catalogue" [ref=e220]:
                            - /placeholder: Search...
                        - button "Open bookmarks" [ref=e221]:
                            - img [ref=e222]
                    - paragraph [ref=e224]:
                        - text: Looking for an event?
                        - link "Find Event here" [ref=e225] [cursor=pointer]:
                            - /url: /join
                    - generic [ref=e227]:
                        - generic [ref=e228]: Trending
                        - button "Live" [ref=e229]
                        - button "Comedy" [ref=e230]
                        - button "Music" [ref=e231]
                        - button "Sports" [ref=e232]
                        - button "Community" [ref=e233]
                        - button "TV program" [ref=e234]
                - generic [ref=e236]:
                    - button "Concert" [ref=e237]
                    - button "Drama" [ref=e238]
                    - button "Festival" [ref=e239]
                    - button "Food" [ref=e240]
                    - button "Hangout" [ref=e241]
                    - button "Islamic" [ref=e242]
                    - button "Christian" [ref=e243]
                    - button "Corporate" [ref=e244]
                    - button "Comedy" [ref=e245]
                    - button "Fashion" [ref=e246]
                    - button "Game & sport" [ref=e247]
                    - button "Children" [ref=e248]
                    - button "Education" [ref=e249]
                    - button "Other" [ref=e250]
                - generic [ref=e251]:
                    - generic [ref=e252]:
                        - generic [ref=e253]:
                            - heading "Top contents" [level=5] [ref=e255]
                            - paragraph [ref=e256]: Editorially featured
                        - button [ref=e275]:
                            - img [ref=e276]
                    - generic [ref=e278]:
                        - generic [ref=e279]:
                            - heading "Latest contents" [level=5] [ref=e281]
                            - paragraph [ref=e282]: Newest uploads, by date added
                        - button [ref=e303]:
                            - img [ref=e304]
                    - generic [ref=e306]:
                        - generic [ref=e307]:
                            - heading "Spotlight" [level=5] [ref=e309]
                            - paragraph [ref=e310]: Trending by views, tips, and saves (updates every ~5 min)
                        - button [ref=e331]:
                            - img [ref=e332]
                    - generic [ref=e334]:
                        - generic [ref=e335]:
                            - heading "Recommended for you" [level=5] [ref=e337]
                            - paragraph [ref=e338]: Popular saves and recency
                        - button [ref=e359]:
                            - img [ref=e360]
                    - generic [ref=e363]:
                        - heading "Programs" [level=5] [ref=e365]
                        - paragraph [ref=e366]: Scheduled TV programs
                    - generic [ref=e388]:
                        - heading "Live streams" [level=5] [ref=e390]
                        - paragraph [ref=e391]: Opens in the creator's event room
                    - generic [ref=e412]:
                        - generic [ref=e413]:
                            - heading "Most tipped contents" [level=5] [ref=e415]
                            - paragraph [ref=e416]: Highest tip counts
                        - button [ref=e435]:
                            - img [ref=e436]
                    - heading "Top tippers" [level=5] [ref=e439]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { gotoExplore } from "./helpers/goto-explore";
  3  |
  4  | test.describe("explore", () => {
  5  |   test("loads feed first on default explore URL", async ({ page }) => {
  6  |     await gotoExplore(page);
  7  |     await expect(page.locator("body")).toBeVisible();
  8  |
  9  |     const scroll = page.getByTestId("explore-feed-scroll");
  10 |     const emptyCopy = page.getByText(/no clips available|sign in to browse/i);
  11 |     const discoverHeading = page.getByRole("heading", {
  12 |       name: "Discover contents",
  13 |     });
  14 |
  15 |     await expect(scroll.or(emptyCopy).first()).toBeVisible({ timeout: 30_000 });
  16 |     await expect(discoverHeading).not.toBeVisible();
  17 |   });
  18 |
  19 |   test("first paint includes SSR default feed boot or visible slide", async ({
  20 |     page,
  21 |   }) => {
  22 |     const response = await gotoExplore(page);
  23 |     expect(response?.ok()).toBeTruthy();
  24 |     const html = await page.content();
  25 |     const hadInlineBoot =
  26 |       html.includes("__EXPLORE_SSR_BOOT__") ||
  27 |       html.includes("data-explore-slide");
  28 |     expect(hadInlineBoot).toBeTruthy();
  29 |   });
  30 |
  31 |   test("feed scrolls and shows video shell or empty state", async ({
  32 |     page,
  33 |   }) => {
  34 |     await gotoExplore(page);
  35 |     await expect(page.locator("body")).toBeVisible();
  36 |
  37 |     const scroll = page.getByTestId("explore-feed-scroll");
  38 |     const emptyCopy = page.getByText(/no clips available|sign in to browse/i);
  39 |
  40 |     await expect(scroll.or(emptyCopy).first()).toBeVisible({ timeout: 30_000 });
  41 |
  42 |     if (await scroll.isVisible()) {
  43 |       await scroll.evaluate(el => {
  44 |         el.scrollTop = el.scrollHeight;
  45 |       });
  46 |       await expect(
  47 |         page
  48 |           .getByTestId("explore-video-shell")
  49 |           .or(page.locator("[data-explore-slide]"))
  50 |           .first()
  51 |       ).toBeVisible();
  52 |     } else {
  53 |       await expect(emptyCopy.first()).toBeVisible();
  54 |     }
  55 |   });
  56 |
  57 |   test("slide actions live inside active slide footer", async ({ page }) => {
  58 |     await gotoExplore(page);
  59 |     const scroll = page.getByTestId("explore-feed-scroll");
  60 |     if (!(await scroll.isVisible({ timeout: 15_000 }).catch(() => false))) {
  61 |       test.skip();
  62 |       return;
  63 |     }
  64 |     const actions = page.getByTestId("explore-slide-actions");
  65 |     await expect(actions).toBeVisible({ timeout: 15_000 });
  66 |     const slide = page.locator('[data-explore-slide][data-index="0"]');
  67 |     await expect(
  68 |       slide.locator('[data-testid="explore-slide-actions"]')
  69 |     ).toBeVisible();
  70 |     await expect(actions).toHaveClass(/bg-gradient-to-t/);
  71 |     await expect(actions).not.toHaveClass(/bg-black\/80/);
  72 |   });
  73 |
  74 |   test("profile shows Guest or Not signed in for anonymous visitors", async ({
  75 |     page,
  76 |   }) => {
  77 |     await gotoExplore(page);
  78 |     await expect(page.getByText(/Signed in|Guest|Not signed in/i)).toBeVisible({
  79 |       timeout: 15_000,
  80 |     });
  81 |   });
  82 |
  83 |   test("discover tab shows distinct category headings", async ({ page }) => {
  84 |     await gotoExplore(page, "/explore?tab=discover");
> 85 |     await expect(page.getByRole("heading", { name: "Spotlight" })).toBeVisible({
     |                                                                    ^ Error: expect(locator).toBeVisible() failed
  86 |       timeout: 30_000,
  87 |     });
  88 |     await expect(
  89 |       page.getByRole("heading", { name: "Recommended for you" })
  90 |     ).toBeVisible();
  91 |     await expect(page.getByRole("heading", { name: "Programs" })).toBeVisible();
  92 |   });
  93 | });
  94 |
```
