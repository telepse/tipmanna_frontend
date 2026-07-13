# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore.spec.ts >> explore >> slide actions live inside active slide footer
- Location: e2e\explore.spec.ts:56:7

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: page.goto: Test timeout of 90000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:3000/explore", waiting until "load"

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
                    - generic [ref=e14]: "2"
                    - generic [ref=e15]: "3"
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
                    - link "Lionel Messi 50+ moments" [ref=e68] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
                - listitem [ref=e69]:
                    - link "Tipmanna Bseen Showcase" [ref=e70] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
                - listitem [ref=e71]:
                    - link "2ttee remix videoo" [ref=e72] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
                - listitem [ref=e73]:
                    - link "3 potatoes and 2 eggs" [ref=e74] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=a6e84710-2eee-4063-bfea-39b99505cd68
                - listitem [ref=e75]:
                    - link "Live Stream" [ref=e76] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=85ec40a3-0a8c-47ea-829a-7a50f403a0f1
                - listitem [ref=e77]:
                    - link "Food Tour" [ref=e78] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=f7e7e96a-0705-4723-b892-1aeda8f1221f
                - listitem [ref=e79]:
                    - link "Food Ready in 5 minutes" [ref=e80] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=906153c3-c272-44cf-b205-d62a14ab0b5f
                - listitem [ref=e81]:
                    - link "The best burger recipe" [ref=e82] [cursor=pointer]:
                        - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=11c306fc-00cb-4a9b-ba66-53dfd68c41bc
                - listitem [ref=e83]:
                    - link "How to cook a perfect steak every time" [ref=e84] [cursor=pointer]:
                        - /url: http://localhost:3000/content/688aa82e-1267-4e6c-b514-3cf874548fa4?v=4053b423-1ff8-4c58-aa4c-171351013cfb
                - listitem [ref=e85]:
                    - link "Final Games 3" [ref=e86] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=3c00d3e3-2c89-4903-ba3e-0d8e5de853b6
                - listitem [ref=e87]:
                    - link "Live Stream" [ref=e88] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
                - listitem [ref=e89]:
                    - link "Magnus Carlsen vs Hikaru Nakamura" [ref=e90] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=7a2f0a7a-a693-4c0d-bc22-22c03f750820
        - region "Recommended for you" [ref=e91]:
            - heading "Recommended for you" [level=2] [ref=e92]
            - paragraph [ref=e93]: Popular saves and recency
            - list [ref=e94]:
                - listitem [ref=e95]:
                    - link "Lionel Messi 50+ moments" [ref=e96] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
                - listitem [ref=e97]:
                    - link "3 potatoes and 2 eggs" [ref=e98] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=a6e84710-2eee-4063-bfea-39b99505cd68
                - listitem [ref=e99]:
                    - link "2ttee remix videoo" [ref=e100] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
                - listitem [ref=e101]:
                    - link "Live Stream" [ref=e102] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=85ec40a3-0a8c-47ea-829a-7a50f403a0f1
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
                    - link "Final Games 3" [ref=e114] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=3c00d3e3-2c89-4903-ba3e-0d8e5de853b6
                - listitem [ref=e115]:
                    - link "Live Stream" [ref=e116] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=22d58b67-0c8f-4dd0-bb05-d9d39bc4d5ae
                - listitem [ref=e117]:
                    - link "Magnus Carlsen vs Hikaru Nakamura" [ref=e118] [cursor=pointer]:
                        - /url: http://localhost:3000/content/b5b6d719-bfa4-4b8b-b781-414f342a84b0?v=7a2f0a7a-a693-4c0d-bc22-22c03f750820
        - region "Most tipped" [ref=e119]:
            - heading "Most tipped" [level=2] [ref=e120]
            - paragraph [ref=e121]: Highest tip counts
            - list [ref=e122]:
                - listitem [ref=e123]:
                    - link "3 potatoes and 2 eggs" [ref=e124] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=a6e84710-2eee-4063-bfea-39b99505cd68
                - listitem [ref=e125]:
                    - link "Live Stream" [ref=e126] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=85ec40a3-0a8c-47ea-829a-7a50f403a0f1
                - listitem [ref=e127]:
                    - link "Food Ready in 5 minutes" [ref=e128] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=906153c3-c272-44cf-b205-d62a14ab0b5f
                - listitem [ref=e129]:
                    - link "2ttee remix videoo" [ref=e130] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=4adcecc8-6e0c-4722-8540-5ea5b09886c1
                - listitem [ref=e131]:
                    - link "Tipmanna Bseen Showcase" [ref=e132] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=efeebee0-c831-4ad0-afb6-abd73dc55220
                - listitem [ref=e133]:
                    - link "Lionel Messi 50+ moments" [ref=e134] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=651e8030-d6f9-432c-8047-27dabbe359a9
                - listitem [ref=e135]:
                    - link "Food Tour" [ref=e136] [cursor=pointer]:
                        - /url: http://localhost:3000/content/95970621-c9b6-456c-8c9b-5bf19867b788?v=f7e7e96a-0705-4723-b892-1aeda8f1221f
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
                    - link "Messi magic sets up win" [ref=e151] [cursor=pointer]:
                        - /url: /channel/302b6dda-02ab-49ff-9bed-1e8f9378557c
                - listitem [ref=e152]:
                    - link "Cold play - A sky full of stars" [ref=e153] [cursor=pointer]:
                        - /url: /channel/f8f5c071-e10d-4b5e-811b-662038b69693
                - listitem [ref=e154]:
                    - link "Tipmanna & Bseen - Product Showcase" [ref=e155] [cursor=pointer]:
                        - /url: /channel/3d01ef9d-3993-408b-88bf-e0ea6ce0944b
                - listitem [ref=e156]:
                    - link "Live Stream" [ref=e157] [cursor=pointer]:
                        - /url: /channel/f8f5c071-e10d-4b5e-811b-662038b69693
                - listitem [ref=e158]:
                    - link "Tipmanna Bseen Showcase" [ref=e159] [cursor=pointer]:
                        - /url: /channel/95970621-c9b6-456c-8c9b-5bf19867b788
        - region "Top communities" [ref=e160]:
            - heading "Top communities" [level=2] [ref=e161]
            - list [ref=e162]:
                - listitem [ref=e163]:
                    - link "Tipmanna Public" [ref=e164] [cursor=pointer]:
                        - /url: /explore?tab=join&joinCommunity=bcc0090d-826c-444d-9689-300c354d0460
                - listitem [ref=e165]:
                    - link "Emediong Community" [ref=e166] [cursor=pointer]:
                        - /url: /explore?tab=join&joinCommunity=588a3682-c0c8-4284-b466-bd3e4a43b801
                - listitem [ref=e167]:
                    - link "Caleb Community" [ref=e168] [cursor=pointer]:
                        - /url: /explore?tab=join&joinCommunity=63898415-b24f-448d-aa55-ca073a8ba950
    - generic [ref=e169]:
        - banner [ref=e170]:
            - heading "Tipmanna TV — Explore and discover community media" [level=1] [ref=e171]
            - link "tipmanna" [ref=e173] [cursor=pointer]:
                - /url: /explore
            - generic [ref=e175]:
                - button "Open discover search" [ref=e176]:
                    - textbox "Search videos..." [ref=e177]
                    - img [ref=e178]
                - generic [ref=e183]: 0 watching live
        - generic [ref=e185]:
            - generic [ref=e186]:
                - button [ref=e187]:
                    - img [ref=e188]
                - generic [ref=e189]: Create
            - button "Feed" [ref=e190]
            - button "Start Community" [ref=e191]
            - button "Not signed in" [ref=e192]:
                - img [ref=e194]
                - generic [ref=e197]: Not signed in
        - generic [ref=e198]:
            - generic [ref=e200]:
                - generic [ref=e201]:
                    - generic [ref=e202]:
                        - button "Trends" [ref=e203]
                        - button "Saves" [ref=e204]
                        - button "TV" [ref=e205]
                        - button "Community" [ref=e206]
                    - button "My Communities" [ref=e208] [cursor=pointer]:
                        - generic [ref=e209]: My Communities
                - button "Open filters" [ref=e210]:
                    - img [ref=e211]
            - generic [ref=e215]:
                - generic [ref=e216]:
                    - iframe [ref=e223]:
                        - generic [active] [ref=f1e1]:
                            - generic "YouTube Video Player" [ref=f1e3]
                            - button "Show player controls" [ref=f1e7] [cursor=pointer]
                    - generic [ref=e224]:
                        - generic [ref=e225]:
                            - button "Unmute" [ref=e226] [cursor=pointer]:
                                - img [ref=e227]
                            - generic [ref=e231]: Live Stream
                        - paragraph [ref=e232]:
                            - text: 0 saves · 0 shares ·
                            - generic [ref=e233]:
                                - img [ref=e234]
                                - text: "1"
                            - text: · 0 comments
                    - generic [ref=e238]:
                        - button "Save video" [ref=e239] [cursor=pointer]:
                            - img [ref=e240]
                        - button "Share" [ref=e243] [cursor=pointer]:
                            - img [ref=e244]
                        - button [ref=e250] [cursor=pointer]:
                            - img [ref=e251]
                    - generic [ref=e253]:
                        - button "0 tips" [ref=e254] [cursor=pointer]
                        - generic [ref=e255]:
                            - img "Black Diamond"
                    - generic [ref=e258]:
                        - button "Create video" [ref=e259] [cursor=pointer]:
                            - img
                        - generic [ref=e260]:
                            - button "Watch TV" [ref=e261] [cursor=pointer]
                            - button "Engage" [ref=e262] [cursor=pointer]
                        - button "Comments" [ref=e263] [cursor=pointer]:
                            - img
                - generic [ref=e267]:
                    - 'generic "Community: Caleb Community" [ref=e268]':
                        - button "C" [ref=e269]
                        - link "This video (Public) is by Caleb Community":
                            - /url: /explore?tab=join&joinCommunity=63898415-b24f-448d-aa55-ca073a8ba950
                    - iframe [ref=e273]:
                        - generic [active] [ref=f2e1]:
                            - generic "YouTube Video Player" [ref=f2e3]
                            - generic [ref=f2e5]:
                                - generic:
                                    - generic:
                                        - button "Play video" [ref=f2e10] [cursor=pointer]
                                        - button "Hide player controls" [ref=f2e12] [cursor=pointer]
                                        - generic [ref=f2e14]:
                                            - generic [ref=f2e19]:
                                                - generic [ref=f2e20]:
                                                    - link "Crazy nine-goal thriller in Paris! | PSG - FC Bayern | Champions League Highlights 🏆" [ref=f2e21] [cursor=pointer]:
                                                        - /url: https://www.youtube.com/watch?v=oz3onQGlVvU
                                                    - link "FC Bayern München" [ref=f2e22] [cursor=pointer]:
                                                        - /url: /channel/UCZkcxFIsqW5htimoUQKA0iA
                                                        - generic [ref=f2e23]: FC Bayern München
                                                - generic [ref=f2e24]:
                                                    - button [ref=f2e25] [cursor=pointer]
                                                    - generic [ref=f2e27]:
                                                        - generic: FC Bayern München
                                                        - generic: 5.54M subscribers
                                            - generic [ref=f2e28]:
                                                - button "Copy link" [ref=f2e31] [cursor=pointer]:
                                                    - generic [ref=f2e35]:
                                                        - img
                                                - link "Watch on YouTube" [ref=f2e42] [cursor=pointer]:
                                                    - /url: https://www.youtube.com/watch?v=oz3onQGlVvU
                                                    - generic [ref=f2e45]:
                                                        - text: Watch on
                                                        - img [ref=f2e47]:
                                                            - generic [ref=f2e49]:
                                                                - img
                - generic [ref=e276]: Live Stream
                - generic [ref=e279]:
                    - text: Saka sends arse..
                    - button "Open comments" [ref=e280]:
                        - img [ref=e281]
                - generic [ref=e285]:
                    - text: Official Tipman..
                    - button "Open comments" [ref=e286]:
                        - img [ref=e287]
                - generic [ref=e291]: Live Stream
                - generic [ref=e294]:
                    - text: Columbia vs Fra..
                    - button "Open comments" [ref=e295]:
                        - img [ref=e296]
                - generic [ref=e300]:
                    - text: Tipmanna Bseen ..
                    - button "Open comments" [ref=e301]:
                        - img [ref=e302]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  |
  3  | test.describe("explore", () => {
  4  |   test("loads feed first on default explore URL", async ({ page }) => {
  5  |     await page.goto("/explore");
  6  |     await expect(page.locator("body")).toBeVisible();
  7  |
  8  |     const scroll = page.getByTestId("explore-feed-scroll");
  9  |     const emptyCopy = page.getByText(/no clips available|sign in to browse/i);
  10 |     const discoverHeading = page.getByRole("heading", {
  11 |       name: "Discover contents",
  12 |     });
  13 |
  14 |     await expect(scroll.or(emptyCopy).first()).toBeVisible({ timeout: 30_000 });
  15 |     await expect(discoverHeading).not.toBeVisible();
  16 |   });
  17 |
  18 |   test("first paint includes SSR default feed boot or visible slide", async ({
  19 |     page,
  20 |   }) => {
  21 |     const response = await page.goto("/explore");
  22 |     expect(response?.ok()).toBeTruthy();
  23 |     const html = await page.content();
  24 |     const hadInlineBoot =
  25 |       html.includes("__EXPLORE_SSR_BOOT__") ||
  26 |       html.includes("data-explore-slide");
  27 |     expect(hadInlineBoot).toBeTruthy();
  28 |   });
  29 |
  30 |   test("feed scrolls and shows video shell or empty state", async ({
  31 |     page,
  32 |   }) => {
  33 |     await page.goto("/explore");
  34 |     await expect(page.locator("body")).toBeVisible();
  35 |
  36 |     const scroll = page.getByTestId("explore-feed-scroll");
  37 |     const emptyCopy = page.getByText(/no clips available|sign in to browse/i);
  38 |
  39 |     await expect(scroll.or(emptyCopy).first()).toBeVisible({ timeout: 30_000 });
  40 |
  41 |     if (await scroll.isVisible()) {
  42 |       await scroll.evaluate(el => {
  43 |         el.scrollTop = el.scrollHeight;
  44 |       });
  45 |       await expect(
  46 |         page
  47 |           .getByTestId("explore-video-shell")
  48 |           .or(page.locator("[data-explore-slide]"))
  49 |           .first()
  50 |       ).toBeVisible();
  51 |     } else {
  52 |       await expect(emptyCopy.first()).toBeVisible();
  53 |     }
  54 |   });
  55 |
  56 |   test("slide actions live inside active slide footer", async ({ page }) => {
> 57 |     await page.goto("/explore");
     |                ^ Error: page.goto: Test timeout of 90000ms exceeded.
  58 |     const scroll = page.getByTestId("explore-feed-scroll");
  59 |     if (!(await scroll.isVisible({ timeout: 15_000 }).catch(() => false))) {
  60 |       test.skip();
  61 |       return;
  62 |     }
  63 |     const actions = page.getByTestId("explore-slide-actions");
  64 |     await expect(actions).toBeVisible({ timeout: 15_000 });
  65 |     const slide = page.locator('[data-explore-slide][data-index="0"]');
  66 |     await expect(
  67 |       slide.locator('[data-testid="explore-slide-actions"]')
  68 |     ).toBeVisible();
  69 |     await expect(actions).toHaveClass(/bg-gradient-to-t/);
  70 |     await expect(actions).not.toHaveClass(/bg-black\/80/);
  71 |   });
  72 |
  73 |   test("profile shows Guest or Not signed in for anonymous visitors", async ({
  74 |     page,
  75 |   }) => {
  76 |     await page.goto("/explore");
  77 |     await expect(page.getByText(/Signed in|Guest|Not signed in/i)).toBeVisible({
  78 |       timeout: 15_000,
  79 |     });
  80 |   });
  81 |
  82 |   test("discover tab shows distinct category headings", async ({ page }) => {
  83 |     await page.goto("/explore?tab=discover");
  84 |     await expect(page.getByRole("heading", { name: "Spotlight" })).toBeVisible({
  85 |       timeout: 30_000,
  86 |     });
  87 |     await expect(
  88 |       page.getByRole("heading", { name: "Recommended for you" })
  89 |     ).toBeVisible();
  90 |     await expect(page.getByRole("heading", { name: "Programs" })).toBeVisible();
  91 |   });
  92 | });
  93 |
```
