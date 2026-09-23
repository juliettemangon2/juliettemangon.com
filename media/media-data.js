/*
  MEDIA PAGE CONTENT
  ==================
  Everything shown on media.html lives here. Edit this file to add, remove,
  or reorder things; the layout code never needs to change.

  intro / introTouch
    The sentence at the top of the page that explains how to get around.
    `introTouch` is shown instead on phones/tablets (no mouse).

  sections
    One dot on the ring per section, in this order, clockwise from 12 o'clock.

    id        short, unique, lowercase-with-dashes. Used in the URL (media.html#films).
    title     shown along the line and at the top of the opened circle.
    type      "media" – entries with a "why I like it" note that expands on click
              "list"  – a plain list
              "text"  – just `body`, for writing thoughts
    variant   optional special styling:
              "numbered" – circled 01, 02, 03... badges (the old favorites grid)
              "columns"  – two side-by-side lists, each with its own heading
                           (use `columns` instead of `entries`)
    hidden    true = kept here but NOT shown on the page (and not in the text version).
              Note: anyone who opens this file in their browser can still read it.
    entries   a list of either plain strings, or objects:
              { text: "Title", note: "why I like it (HTML allowed)", image: "images/x.jpg", link: "https://..." }
    body      for "text" sections. Blank lines start a new paragraph. HTML allowed.
*/

window.MEDIA_PAGE = {
  intro: "Here is my universe of lists, thoughts, and miscellaneous things. My (me)dia, or (ju)niverse if you will.",
  introTouch: "Tap a dot to see what it is, tap again to open it. Drag to move around, pinch to zoom.",

  sections: [
    {
      id: "albums",
      title: "Albums",
      type: "media",
      variant: "numbered",
      entries: [
        {
          text: "Better Oblivion Community Center",
          note: `Phoebe Bridgers and Conor Oberst's love child. What more could I ask for. This album is me, I am this album.`,
        },
        {
          text: "Joe Dassin Éternel...",
          note: `My dad used to sing me songs off this album. Being in France made me nostalgic to this music, so my grandma spent an afternoon listening to it. Been listening to it since, so good.`,
        },
        {
          text: "The Freewheelin' Bob Dylan",
          note: `Just so classic. So good.`,
        },
        {
          text: "The 1975",
          note: `I've been listening to a lot of The 1975. I love to sing and dance to it. I feel like Charli XCX playing Chocolate.`,
        },
      ],
    },

    {
      id: "artists",
      title: "Artists",
      type: "media",
      variant: "numbered",
      entries: [
        
        {
          text: "Ivan Pokidyshev",
          note: `Ivan Pokidyshev is one of the first contemporary painters who really stuck with me. He uses thermography to photograph people and then translates those images into glowing painted figures. His work explores themes of science, life, love, and religion. Checkout his instagram <a href="https://www.instagram.com/pokidyshev_art/"><strong>here</strong></a>.`,
        },
        {
          text: "Laura Footes",
          note: `Laura Foote is a really inspiring painter for me. She paints entirely without reference, using only memory and imagination to create her work. Her paintings often feature human figures that are semi-transparent and abstract, blending into the surrounding space in a distinctive way. Just saw her exhibit at Shrine NYC! Checkout her instagram <a href="https://www.instagram.com/laurafootes/"><strong>here</strong></a>.`,
        },
        {
          text: "Amy Renee Webb",
          note: `Her glass looking religious iconography is unreal. Also, she shares my love for neon green. Checkout her instagram <a href="https://www.instagram.com/aunt.ag0ny/"><strong>here</strong></a>.`,
        },
        {
          text: "Lorenzo Amos",
          note: `His current work makes an effort to "capture the life of his surroundings". Generally, I really like his style and how his focus allows us to see similar backgrounds across paintings. Checkout his instagram <a href="https://www.instagram.com/lorenzoamosf/"><strong>here</strong></a>.`,
        },
      ],
    },

    {
      id: "tv-shows",
      title: "TV Shows",
      type: "media",
      variant: "numbered",
      entries: [
        {
          text: "High Fidelity",
          note: `I wish this show had lasted more than one season. Rob feels like Carrie Bradshaw’s cooler, more esoteric cousin. She is self-centered, hyper-introspective, and defined by an obsession with records. I cannot help but love her (I may be biased because I love Zoë Kravitz), and I want to live in her apartment.`,
        },
        {
          text: "Schitt's Creek",
          note: `Schitt's creek is probably the funniest show I've ever watched, and it is comedic in such an intelligent way. I actually laugh out loud so often. I was surprised by how visually pleasing it is too.`,
        },
        {
          text: "Hacks",
          note: `Back on my list because of the new season. The lesbian episode was my favorite.`,
        },
        {
          text: "Big Mistakes",
          note: `Just watched this in a day and a half. I love Dan Levy and I love how he carried over the sibling dynamic from Schitt's Creek.`,
        },
      ],
    },

    {
      id: "films",
      title: "Films",
      type: "media",
      variant: "numbered",
      entries: [
        {
          text: "Love Lies Bleeding",
          note: `My favorite shot is the egg yolks and cigarettes going into the trash. Kristen Stewart and Katy O'Brian play off of each other fabulously. At times, the timeline can be a little confusing, but you realize by the end that they are not very concerned with delivering a realistic storyline.`,
        },
        {
          text: "Days of Heaven",
          note: `Insane. This is what I would want my movie to look like.`,
        },
        {
          text: "Naissance des Pieuvres",
          note: `A synchronized swimming movie about a french brunette who likes girls. Come on. Just watched this, I really really enjoyed it. I was the captain of my synchronized swimming team in highschool by the way.`,
        },
        {
          text: "Anatomy of a fall",
          note: `Wow I can't believe I hadn't seen this. SO good.`,
        },
      ],
    },

    {
      id: "favorite-things",
      title: "favorite things",
      type: "list",
      entries: [
        "Iced flat white with whole milk and vanilla or similar syrup",
        "Todd Snyder relaxed selvedge denim",
        "Abstract algebra",
        "Minimal websites",
        "Glass antiques",
        "Carrot, orange, ginger juice variations",
        "Diptyque candles",
        "Blistex lip medex",
        "Striped socks",
      ],
    },

    {
      id: "goals",
      title: "goals",
      type: "list",
      entries: ["Finish my art projects", "Maintain a positive mindset", "Wake up early"],
    },
   
    {
      id: "ins-and-outs",
      title: "ins and outs",
      type: "list",
      variant: "columns",
      columns: [
        {
          heading: "In",
          entries: [
            "Crop tops",
            "Writing your phone number on a napkin",
            "Contribution without repayment",
            "Montages",
            "Alone time"
          ],
        },
        {
          heading: "Out",
          entries: [
            "Imported slideshow themes",
            "Healthy candy",
            "Selective accountability",
            "Non-dairy milk"
          ],
        },
      ],
    },

    {
      id: "favorite-foods",
      title: "favorite foods",
      type: "list",
      entries: [
        "Ikura",
        "Nasu Dengaku",
        "tomato + olive oil + vinegar + burrata + basil + arugula",
        "Olives (brown or black)",
        "Enoki mushrooms",
      ],
    },

    {
      id: "cafes",
      title: "cafes",
      type: "list",
      variant: "columns",
      columns: [
        {
          heading: "Cafes I'm a regular at",
          entries: [
            "3 jewels",
            "La Colombe",
            "Thayer",
            "9th Street Espresso",
            "Smør",
            "Librae",
          ],
        },
        {
          heading: "My order",
          entries: [
            "Iced cappuccino w/ strawberry",
            "Iced flat white w/ vanilla",
            "Iced cortado w/ snickerdoodle ",
            "Iced quad shot w/ honey",
            "Iced cappuccino w/ lavender",
            "Iced flat white w/ vanilla",
          ],
        },
      ],
    },

    // ---- hidden (not shown on the page) ----

    {
      id: "favorite-media",
      title: "favorite media",
      type: "list",
      hidden: true,
      entries: [
        "Triangle of Sadness (Film)",
        "Parasite (Film)",
        "Gone Girl (Film)",
        "Call Me by Your Name (Film)",
        "Hacks (TV)",
        "Money Heist (TV)",
      ],
    },

    {
      id: "instagram",
      title: "instagram",
      type: "list",
      hidden: true,
      entries: ["jujus.ootds"],
    },
  ],
};
